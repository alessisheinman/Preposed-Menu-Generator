import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../model/types';
import { DESCRIPTIONS } from './descriptions';
import { SEED_DISHES, parseSeedEntry } from './dishes';
import { SEED_TEMPLATES, SEED_VENUES } from './templates';

describe('seed catalog', () => {
  it('has unique dish ids', () => {
    const ids = SEED_DISHES.map((d) => d.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('uses only known categories', () => {
    expect(SEED_DISHES.every((d) => CATEGORIES.includes(d.category))).toBe(true);
  });

  it('gives every dish a description of at most 6 words', () => {
    expect(SEED_DISHES.filter((d) => !d.description).map((d) => d.name)).toEqual([]);
    expect(SEED_DISHES.filter((d) => d.description.split(/\s+/).length > 6).map((d) => `${d.name}: ${d.description}`)).toEqual([]);
  });

  it('has no descriptions for dishes that are not in the catalog (typo guard)', () => {
    const names = new Set(SEED_DISHES.map((d) => d.name));
    expect(Object.keys(DESCRIPTIONS).filter((n) => !names.has(n))).toEqual([]);
  });

  it('references only existing dishes from templates', () => {
    const ids = new Set(SEED_DISHES.map((d) => d.id));
    const missing = SEED_TEMPLATES.flatMap((t) =>
      t.lines.flatMap((l) => [l.dishId, ...(l.alternatives ?? [])]).filter((id): id is string => id !== null && !ids.has(id)),
    );
    expect(missing).toEqual([]);
  });

  it('has unique template and venue ids', () => {
    expect(new Set(SEED_TEMPLATES.map((t) => t.id)).size).toBe(SEED_TEMPLATES.length);
    expect(new Set(SEED_VENUES.map((v) => v.id)).size).toBe(SEED_VENUES.length);
  });

  it('parses tag codes and rejects unknown ones', () => {
    expect(parseSeedEntry('Falafel|V,G', 'Vegetarian Main')).toMatchObject({ id: 'falafel', tags: ['Vegan', 'GF'] });
    expect(() => parseSeedEntry('X|Q', 'Soup')).toThrow();
  });
});
