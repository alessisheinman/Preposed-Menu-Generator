import { useRef, useState } from 'react';
import { createEvent } from '../model/event';
import { defaultFileName } from '../model/format';
import { newId } from '../model/ids';
import type { Catalog, CatalogOverrides, ExportFile, MenuEvent } from '../model/types';
import { loadCover, saveCover } from '../storage/covers';
import { buildExport, findConflicts, mergeImport, parseImport, type ConflictChoice } from '../storage/exportImport';
import { ConfirmButton, saveBlob } from './common';

interface Props {
  events: MenuEvent[];
  covers: Record<string, string>;
  overrides: CatalogOverrides;
  catalog: Catalog;
  onOpen: (id: string) => void;
  setEvents: (fn: (e: MenuEvent[]) => MenuEvent[]) => void;
  setOverrides: (o: CatalogOverrides) => void;
  putCover: (id: string, dataUrl: string) => void;
  onExported: () => void;
}

export function EventList({ events, covers, overrides, catalog, onOpen, setEvents, setOverrides, putCover, onExported }: Props) {
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState<{ file: ExportFile; conflicts: MenuEvent[]; withCatalog: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const create = () => {
    const n = name.trim() || 'Untitled tour';
    const ev = createEvent(n, venue.trim(), defaultFileName(n));
    setEvents((all) => [ev, ...all]);
    onOpen(ev.id);
  };

  const exportAll = async () => {
    const coverData: Record<string, string> = {};
    for (const id of new Set(events.map((e) => e.coverId).filter((x): x is string => !!x))) {
      const url = covers[id] ?? (await loadCover(id));
      if (url) coverData[id] = url;
    }
    const json = JSON.stringify(buildExport(events, coverData, overrides));
    saveBlob(new Blob([json], { type: 'application/json' }), `proposed-menus-backup-${new Date().toISOString().slice(0, 10)}.json`);
    onExported();
  };

  const finishImport = async (file: ExportFile, choice: ConflictChoice, withCatalog: boolean) => {
    for (const [id, url] of Object.entries(file.covers ?? {})) {
      await saveCover(url, id);
      putCover(id, url);
    }
    setEvents((all) => mergeImport(all, file.events, choice));
    if (withCatalog && file.catalogOverrides) setOverrides(file.catalogOverrides);
    setMsg(`Imported ${file.events.length} event${file.events.length === 1 ? '' : 's'}.`);
    setPending(null);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const res = parseImport(await f.text());
    if (fileRef.current) fileRef.current.value = '';
    if (!res.ok) return setMsg(`Import failed: ${res.error} Nothing was changed.`);
    const conflicts = findConflicts(events, res.file.events);
    if (conflicts.length || res.file.catalogOverrides) setPending({ file: res.file, conflicts, withCatalog: !!res.file.catalogOverrides });
    else await finishImport(res.file, 'keepBoth', false);
  };

  const sorted = [...events].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="list-page">
      <section className="card new-event">
        <h2>New proposal</h2>
        <form onSubmit={(e) => { e.preventDefault(); create(); }}>
          <label className="field grow">
            <span>Tour / artist</span>
            <input value={name} placeholder="e.g. ENHYPEN World Tour" onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>Venue</span>
            <input value={venue} list="dl-venue-names" placeholder="UBS Arena" onChange={(e) => setVenue(e.target.value)} />
            <datalist id="dl-venue-names">{catalog.venues.map((v) => <option key={v.id} value={v.name} />)}</datalist>
          </label>
          <button type="submit" className="primary">Create</button>
        </form>
      </section>

      <section className="card">
        <div className="list-head">
          <h2>Proposals</h2>
          <div className="row">
            <button type="button" onClick={exportAll} disabled={events.length === 0}>Export backup</button>
            <button type="button" onClick={() => fileRef.current?.click()}>Import…</button>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
        </div>
        {msg && <p className="notice">{msg}</p>}
        {pending && (
          <div className="notice">
            {pending.conflicts.length > 0 && <p>{pending.conflicts.length} proposal{pending.conflicts.length > 1 ? 's' : ''} in this file already exist here.</p>}
            {pending.file.catalogOverrides && (
              <label className="check">
                <input type="checkbox" checked={pending.withCatalog} onChange={(e) => setPending({ ...pending, withCatalog: e.target.checked })} />
                Also replace my catalog edits with the ones in this file
              </label>
            )}
            <div className="row">
              {pending.conflicts.length > 0 ? (
                <>
                  <button type="button" onClick={() => finishImport(pending.file, 'replace', pending.withCatalog)}>Replace existing</button>
                  <button type="button" onClick={() => finishImport(pending.file, 'keepBoth', pending.withCatalog)}>Keep both</button>
                </>
              ) : <button type="button" onClick={() => finishImport(pending.file, 'keepBoth', pending.withCatalog)}>Import</button>}
              <button type="button" className="ghost" onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        )}
        {sorted.length === 0 ? <p className="empty">No proposals yet. Create one above.</p> : (
          <ul className="event-list">
            {sorted.map((ev) => {
              const pages = ev.days.reduce((n, d) => n + d.meals.length, 0);
              const cover = ev.coverId ? covers[ev.coverId] : undefined;
              return (
                <li key={ev.id}>
                  <button type="button" className="event-open" onClick={() => onOpen(ev.id)}>
                    <span className="mini-cover" style={cover ? { backgroundImage: `url("${cover}")` } : { background: `linear-gradient(135deg, ${ev.palette.primary}, ${ev.palette.secondary})` }} />
                    <span className="event-meta">
                      <strong>{ev.name}</strong>
                      <span>{ev.venue || 'No venue'} · {pages} page{pages === 1 ? '' : 's'}</span>
                      <time>Edited {new Date(ev.updatedAt).toLocaleString()}</time>
                    </span>
                  </button>
                  <div className="row">
                    <button type="button" onClick={() => setEvents((all) => [{ ...structuredClone(ev), id: newId(), name: `${ev.name} (copy)`, updatedAt: new Date().toISOString() }, ...all])}>Duplicate</button>
                    <ConfirmButton label="Delete" confirmLabel="Delete proposal?" onConfirm={() => setEvents((all) => all.filter((x) => x.id !== ev.id))} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
