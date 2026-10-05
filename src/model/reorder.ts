import type { Day, Line, Meal, MenuEvent } from './types';

interface Container<T> { id: string; items: T[]; }

/**
 * Move `activeId` next to `overId` (or to the end of `targetId` when the target is empty).
 * Within one container this matches arrayMove. Across containers the item lands on the near
 * side of the boundary: moving down puts it before `over`, moving up puts it after `over`.
 */
export function relocate<T extends { id: string }>(
  containers: Container<T>[], activeId: string, targetId: string, overId?: string,
): Container<T>[] {
  if (overId === activeId) return containers;
  const flat = containers.flatMap((c) => c.items.map((it) => ({ c: c.id, id: it.id })));
  const activeFlat = flat.findIndex((x) => x.id === activeId);
  if (activeFlat < 0) return containers;
  const from = flat[activeFlat].c;
  if (!containers.some((c) => c.id === targetId)) return containers;
  const item = containers.find((c) => c.id === from)!.items.find((it) => it.id === activeId)!;

  const removed = containers.map((c) => (c.id === from ? { ...c, items: c.items.filter((it) => it.id !== activeId) } : c));
  return removed.map((c) => {
    if (c.id !== targetId) return c;
    let at = c.items.length;
    const overIdx = overId ? c.items.findIndex((it) => it.id === overId) : -1;
    if (overIdx >= 0) {
      const down = activeFlat < flat.findIndex((x) => x.id === overId);
      at = from === targetId ? (down ? overIdx + 1 : overIdx) : (down ? overIdx : overIdx + 1);
    }
    return { ...c, items: [...c.items.slice(0, at), item, ...c.items.slice(at)] };
  });
}

export function findLine(event: MenuEvent, lineId: string): { day: Day; meal: Meal; line: Line } | undefined {
  for (const day of event.days) for (const meal of day.meals) {
    const line = meal.lines.find((l) => l.id === lineId);
    if (line) return { day, meal, line };
  }
  return undefined;
}

export function findMeal(event: MenuEvent, mealId: string): { day: Day; meal: Meal } | undefined {
  for (const day of event.days) {
    const meal = day.meals.find((m) => m.id === mealId);
    if (meal) return { day, meal };
  }
  return undefined;
}

/** Move a dish/note/salad line to another position, in the same meal or a different one. */
export function moveLine(event: MenuEvent, lineId: string, targetMealId: string, overLineId?: string): MenuEvent {
  const meals = event.days.flatMap((d) => d.meals);
  const moved = relocate(meals.map((m) => ({ id: m.id, items: m.lines })), lineId, targetMealId, overLineId);
  const linesById = new Map(moved.map((c) => [c.id, c.items]));
  return {
    ...event,
    days: event.days.map((d) => ({ ...d, meals: d.meals.map((m) => ({ ...m, lines: linesById.get(m.id) ?? m.lines })) })),
  };
}

/** Move a meal (= a page) to another position, in the same day or a different one. */
export function moveMeal(event: MenuEvent, mealId: string, targetDayId: string, overMealId?: string): MenuEvent {
  const moved = relocate(event.days.map((d) => ({ id: d.id, items: d.meals })), mealId, targetDayId, overMealId);
  const mealsById = new Map(moved.map((c) => [c.id, c.items]));
  return { ...event, days: event.days.map((d) => ({ ...d, meals: mealsById.get(d.id) ?? d.meals })) };
}

export function moveDay(event: MenuEvent, dayId: string, overDayId: string): MenuEvent {
  const [moved] = relocate([{ id: 'days', items: event.days }], dayId, 'days', overDayId);
  return { ...event, days: moved.items };
}
