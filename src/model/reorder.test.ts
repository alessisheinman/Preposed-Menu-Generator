import { describe, expect, it } from 'vitest';
import { moveDay, moveLine, moveMeal, relocate } from './reorder';
import type { Day, Line, Meal, MenuEvent } from './types';

const ids = (cs: { id: string; items: { id: string }[] }[]) => cs.map((c) => `${c.id}:${c.items.map((i) => i.id).join('')}`);
const cs = () => [
  { id: 'A', items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
  { id: 'B', items: [{ id: 'd' }, { id: 'e' }] },
  { id: 'C', items: [] as { id: string }[] },
];

describe('relocate', () => {
  it('moves down within a container like arrayMove', () => {
    expect(ids(relocate(cs(), 'a', 'A', 'c'))).toEqual(['A:bca', 'B:de', 'C:']);
  });
  it('moves up within a container like arrayMove', () => {
    expect(ids(relocate(cs(), 'c', 'A', 'a'))).toEqual(['A:cab', 'B:de', 'C:']);
  });
  it('moving down into the next container lands before the hovered item', () => {
    expect(ids(relocate(cs(), 'c', 'B', 'd'))).toEqual(['A:ab', 'B:cde', 'C:']);
  });
  it('moving up into the previous container lands after the hovered item', () => {
    expect(ids(relocate(cs(), 'd', 'A', 'c'))).toEqual(['A:abcd', 'B:e', 'C:']);
  });
  it('drops into an empty container', () => {
    expect(ids(relocate(cs(), 'b', 'C'))).toEqual(['A:ac', 'B:de', 'C:b']);
  });
  it('ignores hovering itself and unknown ids', () => {
    expect(ids(relocate(cs(), 'a', 'A', 'a'))).toEqual(['A:abc', 'B:de', 'C:']);
    expect(ids(relocate(cs(), 'zz', 'A', 'a'))).toEqual(['A:abc', 'B:de', 'C:']);
    expect(ids(relocate(cs(), 'a', 'nope'))).toEqual(['A:abc', 'B:de', 'C:']);
  });
});

const line = (id: string): Line => ({ kind: 'text', id, text: id });
const meal = (id: string, lineIds: string[]): Meal => ({ id, type: 'Custom', title: id, lines: lineIds.map(line) });
const day = (id: string, meals: Meal[]): Day => ({ id, dateLabel: id, meals });
const event = (): MenuEvent => ({
  id: 'e', name: 'E', venue: '', fileName: '', updatedAt: '', coverId: null, coverFocusY: 0,
  palette: { primary: '#000000', secondary: '#ffffff', auto: true },
  days: [day('tue', [meal('bf', ['x', 'y']), meal('lunch', ['z'])]), day('wed', [meal('dinner', [])])],
});
const shape = (ev: MenuEvent) => ev.days.map((d) => `${d.id}[${d.meals.map((m) => `${m.id}(${m.lines.map((l) => l.id).join('')})`).join(' ')}]`).join(' ');

describe('event moves', () => {
  it('moves a dish into another meal, including an empty one on another day', () => {
    expect(shape(moveLine(event(), 'x', 'lunch', 'z'))).toBe('tue[bf(y) lunch(xz)] wed[dinner()]');
    expect(shape(moveLine(event(), 'z', 'dinner'))).toBe('tue[bf(xy) lunch()] wed[dinner(z)]');
  });
  it('puts dinner before breakfast (page reorder)', () => {
    let ev = moveMeal(event(), 'dinner', 'tue', 'lunch'); // up from wed → after lunch on tue
    expect(shape(ev)).toBe('tue[bf(xy) lunch(z) dinner()] wed[]');
    ev = moveMeal(ev, 'dinner', 'tue', 'bf');
    expect(shape(ev)).toBe('tue[dinner() bf(xy) lunch(z)] wed[]');
  });
  it('reorders days', () => {
    expect(shape(moveDay(event(), 'wed', 'tue'))).toBe('wed[dinner()] tue[bf(xy) lunch(z)]');
  });
});
