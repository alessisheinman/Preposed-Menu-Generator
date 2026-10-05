import { describe, expect, it } from 'vitest';
import { createDay, createEvent } from '../model/event';
import type { Catalog, MenuEvent } from '../model/types';
import { deleteDish, emptyOverrides, mergeCatalog, upsertDish } from './catalog';
import { buildExport, findConflicts, mergeImport, parseImport, shouldRemindExport } from './exportImport';
import { emptyState, loadState, saveState, type KeyValueStore } from './persist';

const seed: Catalog = {
  dishes: [
    { id: 'a', name: 'A', category: 'Soup', tags: [], description: 'a soup' },
    { id: 'b', name: 'B', category: 'Soup', tags: [], description: 'b soup' },
  ],
  templates: [],
  venues: [],
};

describe('mergeCatalog', () => {
  it('applies edits (including descriptions), additions and deletions', () => {
    let o = upsertDish(emptyOverrides(), { ...seed.dishes[0], description: 'better words' });
    o = upsertDish(o, { id: 'c', name: 'C', category: 'Fish', tags: [], description: '' });
    o = deleteDish(o, 'b');
    expect(mergeCatalog(seed, o).dishes.map((d) => `${d.name}:${d.description}`)).toEqual(['A:better words', 'C:']);
  });
});

const ev = (name: string): MenuEvent => ({ ...createEvent(name, 'UBS Arena', `${name}.pdf`), coverId: 'cov1', days: [createDay('Tue')] });

describe('export / import', () => {
  it('round-trips events, covers and overrides', () => {
    const file = buildExport([ev('One')], { cov1: 'data:image/jpeg;base64,AAA' }, emptyOverrides());
    const res = parseImport(JSON.stringify(file));
    expect(res.ok && res.file).toEqual(file);
  });
  it('rejects kitchen-menu backups and garbage', () => {
    expect(parseImport('nope').ok).toBe(false);
    expect(parseImport(JSON.stringify({ events: [] })).ok).toBe(false); // kitchen v0 shape
    expect(parseImport(JSON.stringify({ schemaVersion: 1, events: [{ id: '1', name: 'x', days: [] }] })).ok).toBe(false); // no palette
  });
  it('resolves id conflicts', () => {
    const one = ev('One');
    const inc = { ...one, name: 'One v2' };
    expect(findConflicts([one], [inc])).toEqual([inc]);
    expect(mergeImport([one], [inc], 'replace').map((e) => e.name)).toEqual(['One v2']);
    expect(mergeImport([one], [inc], 'keepBoth').map((e) => e.name)).toEqual(['One', 'One v2 (imported)']);
  });
  it('reminds to back up after 14 days', () => {
    const now = new Date('2026-10-20T00:00:00Z');
    expect(shouldRemindExport(now, true, '2026-10-01T00:00:00Z', null)).toBe(true);
    expect(shouldRemindExport(now, false, null, '2026-09-01T00:00:00Z')).toBe(false);
  });
});

class MemStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

describe('persist', () => {
  it('saves and loads', () => {
    const s = new MemStore();
    const state = { ...emptyState(), events: [ev('One')] };
    expect(saveState(s, state)).toBe(true);
    expect(loadState(s)).toEqual(state);
  });
  it('handles unavailable or corrupt storage', () => {
    expect(loadState(null)).toEqual(emptyState());
    const s = new MemStore();
    s.setItem('proposed-menu-generator:v1', '{bad');
    expect(loadState(s)).toEqual(emptyState());
    expect([...s.data.keys()].some((k) => k.includes(':corrupt:'))).toBe(true);
  });
});
