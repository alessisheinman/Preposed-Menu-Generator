import type { CatalogOverrides, MenuEvent } from '../model/types';
import { emptyOverrides } from './catalog';
import { migrate } from './exportImport';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEY = 'proposed-menu-generator:v1';

export interface PersistedState {
  events: MenuEvent[];
  overrides: CatalogOverrides;
  lastExportAt: string | null;
  firstUseAt: string | null;
}

export const emptyState = (): PersistedState => ({ events: [], overrides: emptyOverrides(), lastExportAt: null, firstUseAt: null });

export function getBrowserStore(): KeyValueStore | null {
  try {
    const s = window.localStorage;
    s.setItem('__probe__', '1');
    s.removeItem('__probe__');
    return s;
  } catch {
    return null;
  }
}

export function loadState(store: KeyValueStore | null): PersistedState {
  if (!store) return emptyState();
  let raw: string | null;
  try { raw = store.getItem(KEY); } catch { return emptyState(); }
  if (!raw) return emptyState();
  try {
    const parsed = JSON.parse(raw);
    const file = migrate({ schemaVersion: parsed.schemaVersion, events: parsed.events ?? [], catalogOverrides: parsed.overrides });
    return {
      events: file.events,
      overrides: file.catalogOverrides ?? emptyOverrides(),
      lastExportAt: parsed.lastExportAt ?? null,
      firstUseAt: parsed.firstUseAt ?? null,
    };
  } catch {
    try { store.setItem(`${KEY}:corrupt:${Date.now()}`, raw); } catch { /* ignore */ }
    return emptyState();
  }
}

export function saveState(store: KeyValueStore | null, state: PersistedState): boolean {
  if (!store) return false;
  try {
    store.setItem(KEY, JSON.stringify({ schemaVersion: 1, ...state }));
    return true;
  } catch {
    return false;
  }
}
