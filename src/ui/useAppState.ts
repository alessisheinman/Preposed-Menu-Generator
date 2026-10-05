import { useEffect, useMemo, useRef, useState } from 'react';
import type { Catalog, CatalogOverrides, MenuEvent } from '../model/types';
import { SEED_CATALOG, mergeCatalog } from '../storage/catalog';
import { loadCover } from '../storage/covers';
import { getBrowserStore, loadState, saveState, type PersistedState } from '../storage/persist';

export interface AppState {
  state: PersistedState;
  catalog: Catalog;
  covers: Record<string, string>;
  storageAvailable: boolean;
  saveFailed: boolean;
  setEvents: (fn: (events: MenuEvent[]) => MenuEvent[]) => void;
  setOverrides: (fn: (o: CatalogOverrides) => CatalogOverrides) => void;
  putCover: (id: string, dataUrl: string) => void;
  markExported: () => void;
}

export function useAppState(): AppState {
  const store = useRef(getBrowserStore());
  const [state, setState] = useState<PersistedState>(() => {
    const loaded = loadState(store.current);
    return loaded.firstUseAt ? loaded : { ...loaded, firstUseAt: new Date().toISOString() };
  });
  const [saveFailed, setSaveFailed] = useState(false);
  const [covers, setCovers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (store.current) setSaveFailed(!saveState(store.current, state));
  }, [state]);

  // Load any cover images we haven't got in memory yet.
  useEffect(() => {
    const missing = state.events.map((e) => e.coverId).filter((id): id is string => !!id && !(id in covers));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(async (id) => [id, await loadCover(id)] as const)).then((pairs) => {
      if (cancelled) return;
      setCovers((c) => {
        const next = { ...c };
        for (const [id, url] of pairs) if (url) next[id] = url;
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [state.events, covers]);

  const catalog = useMemo(() => mergeCatalog(SEED_CATALOG, state.overrides), [state.overrides]);

  return {
    state,
    catalog,
    covers,
    storageAvailable: store.current !== null,
    saveFailed,
    setEvents: (fn) => setState((s) => ({ ...s, events: fn(s.events) })),
    setOverrides: (fn) => setState((s) => ({ ...s, overrides: fn(s.overrides) })),
    putCover: (id, dataUrl) => setCovers((c) => ({ ...c, [id]: dataUrl })),
    markExported: () => setState((s) => ({ ...s, lastExportAt: new Date().toISOString() })),
  };
}
