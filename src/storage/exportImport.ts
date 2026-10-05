import { newId } from '../model/ids';
import type { CatalogOverrides, ExportFile, MenuEvent } from '../model/types';

export const SCHEMA_VERSION = 1;

export function buildExport(events: MenuEvent[], covers: Record<string, string>, catalogOverrides: CatalogOverrides): ExportFile {
  return { schemaVersion: SCHEMA_VERSION, events, covers, catalogOverrides };
}

export type ParseResult = { ok: true; file: ExportFile } | { ok: false; error: string };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const looksLikeEvent = (x: unknown): x is MenuEvent =>
  isObj(x) && typeof x.id === 'string' && typeof x.name === 'string' && Array.isArray(x.days) && isObj(x.palette);

export function migrate(raw: unknown): ExportFile {
  if (!isObj(raw)) throw new Error('File is not a proposal backup.');
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  if (version > SCHEMA_VERSION) throw new Error('This file was made by a newer version of the app.');
  if (version < 1) throw new Error('This file is not a proposal backup.');
  const events = raw.events;
  if (!Array.isArray(events) || !events.every(looksLikeEvent)) throw new Error('File has no valid events.');
  const covers = isObj(raw.covers) ? (raw.covers as Record<string, string>) : {};
  return { schemaVersion: version, events, covers, catalogOverrides: raw.catalogOverrides as CatalogOverrides | undefined };
}

export function parseImport(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  try {
    return { ok: true, file: migrate(raw) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function findConflicts(existing: MenuEvent[], incoming: MenuEvent[]): MenuEvent[] {
  const ids = new Set(existing.map((e) => e.id));
  return incoming.filter((e) => ids.has(e.id));
}

export type ConflictChoice = 'replace' | 'keepBoth';

export function mergeImport(existing: MenuEvent[], incoming: MenuEvent[], choice: ConflictChoice): MenuEvent[] {
  const incomingById = new Map(incoming.map((e) => [e.id, e]));
  const existingIds = new Set(existing.map((e) => e.id));
  if (choice === 'replace') {
    return [...existing.map((e) => incomingById.get(e.id) ?? e), ...incoming.filter((e) => !existingIds.has(e.id))];
  }
  return [...existing, ...incoming.map((e) => (existingIds.has(e.id) ? { ...e, id: newId(), name: `${e.name} (imported)` } : e))];
}

const DAY_MS = 24 * 60 * 60 * 1000;
export function shouldRemindExport(now: Date, hasEvents: boolean, lastExportAt: string | null, firstUseAt: string | null): boolean {
  if (!hasEvents) return false;
  const since = lastExportAt ?? firstUseAt;
  return !!since && now.getTime() - new Date(since).getTime() >= 14 * DAY_MS;
}
