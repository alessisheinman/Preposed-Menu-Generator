import { describe, expect, it } from 'vitest';
import type { Dish } from '../model/types';
import { matchDishes } from './DishPicker';

const dishes: Dish[] = [
  { id: '1', name: 'Seared Salmon with Spinach', category: 'Fish', tags: [], description: '' },
  { id: '2', name: 'Rigatoni with Sausage and Peas', category: 'Pasta', tags: [], description: '' },
  { id: '3', name: 'Sauteed Spinach', category: 'Vegetable', tags: [], description: '' },
  { id: '4', name: 'Spinach & Parmesan', category: 'Sandwich', tags: [], description: '' },
];

describe('matchDishes', () => {
  it('matches all words in any order, case-insensitive', () => {
    expect(matchDishes('SPIN salm', dishes).map((d) => d.id)).toEqual(['1']);
  });
  it('lists preferred categories first, then name-prefix matches', () => {
    expect(matchDishes('spinach', dishes, ['Vegetable']).map((d) => d.id)).toEqual(['3', '4', '1']);
  });
  it('returns everything for an empty query', () => {
    expect(matchDishes('  ', dishes)).toHaveLength(4);
  });
});
