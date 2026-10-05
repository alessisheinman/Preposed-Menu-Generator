import { createStore, del, get, keys, set } from 'idb-keyval';
import { newId } from '../model/ids';

/**
 * Cover images live in IndexedDB (localStorage is too small for photos), as JPEG data URLs.
 * Falls back to an in-memory map when IndexedDB is unavailable (e.g. some private windows).
 */
const memory = new Map<string, string>();
let store: ReturnType<typeof createStore> | null = null;
function idb() {
  if (store) return store;
  try {
    if (typeof indexedDB === 'undefined') return null;
    store = createStore('proposed-menu-generator', 'covers');
    return store;
  } catch {
    return null;
  }
}

export async function saveCover(dataUrl: string, id = newId()): Promise<string> {
  memory.set(id, dataUrl);
  const s = idb();
  if (s) { try { await set(id, dataUrl, s); } catch { /* memory copy still works this session */ } }
  return id;
}

export async function loadCover(id: string): Promise<string | null> {
  if (memory.has(id)) return memory.get(id)!;
  const s = idb();
  if (!s) return null;
  try {
    const v = (await get<string>(id, s)) ?? null;
    if (v) memory.set(id, v);
    return v;
  } catch {
    return null;
  }
}

export async function deleteCover(id: string): Promise<void> {
  memory.delete(id);
  const s = idb();
  if (s) { try { await del(id, s); } catch { /* ignore */ } }
}

/** Remove covers no event uses any more. */
export async function pruneCovers(inUse: Set<string>): Promise<void> {
  const s = idb();
  if (!s) return;
  try {
    for (const k of await keys(s)) if (!inUse.has(String(k))) await del(k, s);
  } catch { /* ignore */ }
}

/**
 * Read an uploaded image file, downscale it (max 2000px wide), and return a JPEG data URL plus
 * a small RGBA sample for palette extraction.
 */
export async function prepareCover(file: File): Promise<{ dataUrl: string; sample: Uint8ClampedArray }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

  const sw = 96;
  const sh = Math.max(1, Math.round((96 * bitmap.height) / bitmap.width));
  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext('2d')!;
  sctx.drawImage(bitmap, 0, 0, sw, sh);
  bitmap.close();
  return { dataUrl, sample: sctx.getImageData(0, 0, sw, sh).data };
}

/** Palette sample from an already-stored data URL (used when re-extracting colors). */
export async function sampleFromDataUrl(dataUrl: string): Promise<Uint8ClampedArray> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const sw = 96;
  const sh = Math.max(1, Math.round((96 * img.naturalHeight) / img.naturalWidth));
  const c = document.createElement('canvas');
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, sw, sh);
  return ctx.getImageData(0, 0, sw, sh).data;
}
