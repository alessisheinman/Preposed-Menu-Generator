import { describe, expect, it } from 'vitest';
import {
  applyTemplate, createDay, createEvent, createMeal, duplicateDay, duplicateMeal, setLineDish, templateSuggestions, validateEvent,
} from './event';
import { defaultFileName, formatTags, printItems } from './format';
import type { Catalog, DishLine, MealTemplate } from './types';

const catalog: Catalog = {
  dishes: [
    { id: 'eggs', name: 'Organic Scrambled Eggs', category: 'Breakfast', tags: ['GF'], description: 'Soft, fluffy farm-fresh eggs' },
    { id: 'tofu', name: 'Tofu Scramble', category: 'Breakfast', tags: ['Vegan', 'GF'], description: 'Turmeric tofu' },
    { id: 'just', name: '“Just” Eggs Scrambled', category: 'Breakfast', tags: ['Vegan', 'GF'], description: 'Plant-based eggs' },
    { id: 'juice', name: 'Assorted Juices', category: 'Beverage/Service', tags: [], description: 'Chilled juices' },
  ],
  templates: [],
  venues: [],
};
const bf: MealTemplate = {
  id: 'bf', name: 'Breakfast', mealType: 'Breakfast',
  lines: [{ dishId: 'eggs' }, { dishId: 'tofu', alternatives: ['just'] }, { dishId: 'juice', enabled: false }, { dishId: 'gone' }],
};

describe('meals and templates', () => {
  it('builds a meal with the default title, snapshotting descriptions', () => {
    const m = createMeal('Breakfast', bf, catalog);
    expect(m.title).toBe('BREAKFAST');
    expect(m.lines.map((l) => (l as DishLine).description)).toEqual(['Soft, fluffy farm-fresh eggs', 'Turmeric tofu']);
    catalog.dishes[0].description = 'changed';
    expect((m.lines[0] as DishLine).description).toBe('Soft, fluffy farm-fresh eggs');
    catalog.dishes[0].description = 'Soft, fluffy farm-fresh eggs';
  });
  it('offers disabled template dishes as suggestions', () => {
    expect(templateSuggestions(createMeal('Breakfast', bf, catalog), bf, catalog).map((d) => d.id)).toEqual(['juice']);
  });
  it('applyTemplate replaces the lines', () => {
    expect(applyTemplate({ ...createMeal('Custom', undefined, catalog) }, bf, catalog).lines).toHaveLength(2);
  });
  it('custom meals get a typed title', () => {
    expect(createMeal('Custom', undefined, catalog, 'OVERNIGHT MEAL').title).toBe('OVERNIGHT MEAL');
  });
});

describe('setLineDish', () => {
  const line = createMeal('Breakfast', bf, catalog).lines[1] as DishLine;
  it('swapping to another catalog dish brings its description and tags', () => {
    expect(setLineDish(line, catalog.dishes[2], '')).toMatchObject({ dishName: '“Just” Eggs Scrambled', description: 'Plant-based eggs' });
  });
  it('typing a one-off name clears the old catalog description', () => {
    expect(setLineDish(line, undefined, 'Mystery Dish')).toMatchObject({ dishName: 'Mystery Dish', description: '', sourceDishId: undefined });
  });
  it('keeps a description the user wrote for a one-off while they keep typing', () => {
    const oneOff = { ...setLineDish(line, undefined, 'Myst'), description: 'House special' };
    expect(setLineDish(oneOff, undefined, 'Mystery').description).toBe('House special');
  });
});

describe('duplicate', () => {
  it('deep-copies meals and days with new ids', () => {
    const meal = createMeal('Breakfast', bf, catalog);
    const day = { ...createDay('Tuesday, Nov 10'), meals: [meal] };
    const copy = duplicateDay(day);
    expect(copy.dateLabel).toBe('Tuesday, Nov 10');
    expect(copy.meals[0].id).not.toBe(meal.id);
    expect(duplicateMeal(meal).lines[0].id).not.toBe(meal.lines[0].id);
  });
});

describe('format', () => {
  it('prints names with tags plus the description, skipping empty slots', () => {
    const meal = createMeal('Breakfast', bf, catalog);
    meal.lines.push({ kind: 'dish', id: 's', dishName: '', tags: [], description: '', slot: 'Dessert' }, { kind: 'text', id: 't', text: 'Sandwich Station' });
    expect(printItems(meal)).toEqual([
      { name: 'Organic Scrambled Eggs GF', description: 'Soft, fluffy farm-fresh eggs' },
      { name: 'Tofu Scramble (Vegan, GF)', description: 'Turmeric tofu' },
      { name: 'Sandwich Station', description: '' },
    ]);
  });
  it('formats tags like the kitchen menus', () => {
    expect([formatTags([]), formatTags(['GF']), formatTags(['GF', 'Vegan']), formatTags(['Vegetarian'])]).toEqual(['', 'GF', '(Vegan, GF)', '(Vegetarian)']);
  });
  it('names the file after the tour', () => {
    expect(defaultFileName('ENHYPEN / UBS')).toBe('ENHYPEN UBS Proposed Menu.pdf');
  });
});

describe('validateEvent', () => {
  it('flags missing cover, meals and descriptions', () => {
    const ev = createEvent('E', '', 'E.pdf');
    expect(validateEvent(ev).map((w) => w.message)).toEqual(['No cover art uploaded yet.', 'Add at least one meal.']);
    const meal = createMeal('Custom', undefined, catalog, 'LUNCH');
    meal.lines = [{ kind: 'dish', id: 'x', dishName: 'Mystery', tags: [], description: '' }];
    const withMeal = { ...ev, coverId: 'c', days: [{ ...createDay(), meals: [meal] }] };
    expect(validateEvent(withMeal).map((w) => w.message)).toEqual(['LUNCH: 1 dish has no description.']);
  });
});
