import { newId } from './ids';
import type { Catalog, Day, Dish, DishLine, Line, Meal, MealTemplate, MealType, MenuEvent, Palette, Slot, TextLine } from './types';

export const DEFAULT_PALETTE: Palette = { primary: '#c9a46a', secondary: '#7fb7b2', auto: true };

export function createEvent(name: string, venue: string, fileName: string): MenuEvent {
  return {
    id: newId(), name, venue, fileName, coverId: null, coverFocusY: 35, palette: { ...DEFAULT_PALETTE },
    days: [], updatedAt: new Date().toISOString(),
  };
}

export function createDay(dateLabel = ''): Day {
  return { id: newId(), dateLabel, meals: [] };
}

export const DEFAULT_TITLES: Record<MealType, string> = { Breakfast: 'BREAKFAST', Lunch: 'LUNCH', Dinner: 'DINNER', Custom: 'MENU' };

export function dishLineFrom(dish: Dish, extra: Partial<DishLine> = {}): DishLine {
  return {
    kind: 'dish', id: newId(), dishName: dish.name, tags: [...dish.tags], description: dish.description,
    sourceDishId: dish.id, ...extra,
  };
}

export function emptySlotLine(slot: Slot): DishLine {
  return { kind: 'dish', id: newId(), dishName: '', tags: [], description: '', slot };
}

export function blankDishLine(): DishLine {
  return { kind: 'dish', id: newId(), dishName: '', tags: [], description: '' };
}

export function textLine(text = ''): TextLine {
  return { kind: 'text', id: newId(), text };
}

export function linesFromTemplate(template: MealTemplate, catalog: Catalog): Line[] {
  const byId = new Map(catalog.dishes.map((d) => [d.id, d]));
  const lines: Line[] = [];
  for (const tl of template.lines) {
    if (tl.enabled === false) continue;
    if (tl.dishId === null) {
      if (tl.slot) lines.push(emptySlotLine(tl.slot));
      continue;
    }
    const dish = byId.get(tl.dishId);
    if (dish) lines.push(dishLineFrom(dish, { slot: tl.slot, alternatives: tl.alternatives }));
  }
  return lines;
}

export function createMeal(type: MealType, template: MealTemplate | undefined, catalog: Catalog, title = DEFAULT_TITLES[type]): Meal {
  return { id: newId(), type, title, templateId: template?.id, lines: template ? linesFromTemplate(template, catalog) : [] };
}

export function applyTemplate(meal: Meal, template: MealTemplate, catalog: Catalog): Meal {
  return { ...meal, templateId: template.id, lines: linesFromTemplate(template, catalog) };
}

/** Template dishes not currently in the meal — shown as one-click "quick add" chips. */
export function templateSuggestions(meal: Meal, template: MealTemplate | undefined, catalog: Catalog): Dish[] {
  if (!template) return [];
  const present = new Set(meal.lines.flatMap((l) => (l.kind === 'dish' && l.sourceDishId ? [l.sourceDishId] : [])));
  const byId = new Map(catalog.dishes.map((d) => [d.id, d]));
  const out: Dish[] = [];
  for (const tl of template.lines) {
    if (!tl.dishId || present.has(tl.dishId)) continue;
    const dish = byId.get(tl.dishId);
    if (dish && !out.includes(dish)) out.push(dish);
  }
  return out;
}

/**
 * Point a line at a catalog dish (name, tags and description come along), or keep a typed one-off name.
 * A one-off keeps its description only if the user already wrote one for it.
 */
export function setLineDish(line: DishLine, dish: Dish | undefined, typedName: string): DishLine {
  if (dish) return { ...line, dishName: dish.name, tags: [...dish.tags], description: dish.description, sourceDishId: dish.id };
  const wasCatalog = !!line.sourceDishId;
  return { ...line, dishName: typedName, sourceDishId: undefined, description: wasCatalog ? '' : line.description };
}

const cloneLine = (l: Line): Line => ({ ...structuredClone(l), id: newId() });

export function duplicateMeal(meal: Meal): Meal {
  return { ...structuredClone(meal), id: newId(), lines: meal.lines.map(cloneLine) };
}

export function duplicateDay(day: Day): Day {
  return { id: newId(), dateLabel: day.dateLabel, meals: day.meals.map(duplicateMeal) };
}

export function touch(event: MenuEvent): MenuEvent {
  return { ...event, updatedAt: new Date().toISOString() };
}

export function mapDay(event: MenuEvent, dayId: string, fn: (d: Day) => Day): MenuEvent {
  return { ...event, days: event.days.map((d) => (d.id === dayId ? fn(d) : d)) };
}

export function mapMeal(event: MenuEvent, dayId: string, mealId: string, fn: (m: Meal) => Meal): MenuEvent {
  return mapDay(event, dayId, (d) => ({ ...d, meals: d.meals.map((m) => (m.id === mealId ? fn(m) : m)) }));
}

export function insertAfter<T extends { id: string }>(list: T[], afterId: string, item: T): T[] {
  const i = list.findIndex((x) => x.id === afterId);
  if (i < 0) return [...list, item];
  return [...list.slice(0, i + 1), item, ...list.slice(i + 1)];
}

export function updateLine(meal: Meal, lineId: string, fn: (l: Line) => Line): Meal {
  return { ...meal, lines: meal.lines.map((l) => (l.id === lineId ? fn(l) : l)) };
}

export function removeLine(meal: Meal, lineId: string): Meal {
  return { ...meal, lines: meal.lines.filter((l) => l.id !== lineId) };
}

export interface Warning { mealId?: string; message: string; }

export function validateEvent(event: MenuEvent): Warning[] {
  const out: Warning[] = [];
  if (!event.coverId) out.push({ message: 'No cover art uploaded yet.' });
  if (event.days.every((d) => d.meals.length === 0)) out.push({ message: 'Add at least one meal.' });
  event.days.forEach((day) => day.meals.forEach((meal) => {
    const where = meal.title.trim() || meal.type;
    const empties = meal.lines.filter((l) => l.kind === 'dish' && l.slot && !l.dishName.trim()).length;
    if (empties) out.push({ mealId: meal.id, message: `${where}: ${empties} empty slot${empties > 1 ? 's' : ''} (won't print).` });
    const noDesc = meal.lines.filter((l) => l.kind === 'dish' && l.dishName.trim() && !l.description.trim()).length;
    if (noDesc) out.push({ mealId: meal.id, message: `${where}: ${noDesc} dish${noDesc > 1 ? 'es have' : ' has'} no description.` });
  }));
  return out;
}
