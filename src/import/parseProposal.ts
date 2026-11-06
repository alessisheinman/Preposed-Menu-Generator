import { addDate, dayForDate, formatDateLabel } from '../model/dates';
import { DEFAULT_TITLES, createDay, createEvent } from '../model/event';
import { defaultFileName } from '../model/format';
import { newId } from '../model/ids';
import type { Catalog, Day, Dish, DishLine, Meal, MealType, MenuEvent, Tag } from '../model/types';

/**
 * Turns what OCR read off a proposal PDF into a proposal. Proposal PDFs are pictures of pages, so this works
 * from text lines and their positions. Nothing here touches the browser, so it can be tested on plain data.
 */
export interface OcrLine { text: string; x0: number; y0: number; x1: number; y1: number; confidence: number }
export interface OcrText { text: string; confidence: number }
export interface ReadPage { heading: OcrText; date: OcrText; lines: OcrLine[] }
export interface ReadPdf { title: string; pageWidth: number; pages: ReadPage[] }
export interface ParsedItem { name: string; tags: Tag[]; description: string; confidence: number; unknown: string }
export interface UnsureLine { dayId: string; mealId: string; lineId: string; where: string; reason: string }
export interface ImportResult { event: MenuEvent; unsure: UnsureLine[]; problems: string[] }

/** Lines OCR scored below this are listed for checking. */
const SURE = 85;

const TAG_WORDS: Record<string, Tag> = {
  vegan: 'Vegan', veg: 'Vegetarian', vegetarian: 'Vegetarian', gf: 'GF', df: 'DF', pesc: 'Pesc', pescatarian: 'Pesc',
};

/** Pull trailing dietary tags off a dish name; a parenthesis that isn't tags stays and is reported as `unknown`. */
export function splitTags(text: string): { name: string; tags: Tag[]; unknown: string } {
  const clean = text.trim();
  const m = clean.match(/^(.*?)\s*(\()?\s*([A-Za-z]+(?:\s*,\s*[A-Za-z]+)*)\s*(\))?\s*$/);
  if (m && (m[2] || m[4])) {
    const words = m[3].split(',').map((w) => w.trim().toLowerCase());
    if (words.every((w) => w in TAG_WORDS)) return { name: m[1].trim(), tags: [...new Set(words.map((w) => TAG_WORDS[w]))], unknown: '' };
  }
  const other = clean.match(/\(([^()]*)\)?\s*$/);
  return { name: clean, tags: [], unknown: other ? other[1].trim() : '' };
}

const ACCENTS: [RegExp, string][] = [
  [/\bcr[eèé]me fra[iî]che\b/gi, 'crème fraîche'],
  [/\bsauteed\b/g, 'sautéed'],
  [/\bSauteed\b/g, 'Sautéed'],
];
const tidy = (text: string) => ACCENTS.reduce(
  (t, [from, to]) => t.replace(from, to),
  text.replace(/[‘’`]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim(),
);

const height = (l: OcrLine) => l.y1 - l.y0;

const letterWidth = (l: OcrLine) => (l.x1 - l.x0) / Math.max(1, l.text.length);

/**
 * The letter width dividing names from descriptions on a page: the biggest jump between line widths.
 * Letter width is steadier than line height, because OCR sometimes draws a description's box as tall as a name's.
 */
function nameWidthCutoff(lines: OcrLine[]): number {
  const widths = lines.map(letterWidth).sort((a, b) => a - b);
  let cutoff = 0, biggest = 0;
  for (let i = 1; i < widths.length; i++) {
    const jump = widths[i] - widths[i - 1];
    if (jump > biggest) { biggest = jump; cutoff = widths[i]; }
  }
  return biggest >= widths[widths.length - 1] * 0.2 ? cutoff : 0; // no real jump: the page has one size of text
}

/** The dishes on one page, left column before right. */
export function parsePageItems(all: OcrLine[], pageWidth: number): ParsedItem[] {
  const lines = all.filter((l) => l.x0 < pageWidth * 0.85 && /[A-Za-z]{2}|\(/.test(l.text) && height(l) >= 12); // no logo, no specks
  if (lines.length === 0) return [];
  const cutoff = nameWidthCutoff(lines);
  const isName = (l: OcrLine) => letterWidth(l) >= cutoff;
  const tallest = Math.max(...lines.filter(isName).map(height));
  const center = (l: OcrLine) => (l.x0 + l.x1) / 2;
  const oneColumn = lines.every((l) => Math.abs(center(l) - pageWidth / 2) < pageWidth * 0.12);
  const columns = oneColumn ? [lines] : [lines.filter((l) => center(l) < pageWidth / 2), lines.filter((l) => center(l) >= pageWidth / 2)];

  return columns.flatMap((column) => {
    const items: { names: string[]; descriptions: string[]; lastY: number; confidence: number }[] = [];
    for (const l of [...column].sort((a, b) => a.y0 - b.y0)) {
      const cur = items[items.length - 1];
      if (!isName(l)) {
        if (cur) { cur.descriptions.push(l.text); cur.confidence = Math.min(cur.confidence, l.confidence); }
        continue;
      }
      const wrapped = cur && cur.descriptions.length === 0 && !cur.names[cur.names.length - 1].trim().endsWith(')') && l.y0 - cur.lastY < tallest * 1.35;
      if (wrapped) {
        cur.names.push(l.text);
        cur.lastY = l.y0;
        cur.confidence = Math.min(cur.confidence, l.confidence);
      } else {
        items.push({ names: [l.text], descriptions: [], lastY: l.y0, confidence: l.confidence });
      }
    }
    return items.map((it): ParsedItem => {
      const { name, tags, unknown } = splitTags(tidy(it.names.join(' ')));
      return { name, tags, unknown, description: tidy(it.descriptions.join(' ')), confidence: it.confidence };
    });
  });
}

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

/** "WEDNESDAY, NOVEMBER 11" → an ISO date. Menus print no year: it's the year nearest today whose weekday matches. */
export function parseMenuDate(text: string, now: Date): string | null {
  const up = text.toUpperCase();
  const m = up.match(new RegExp(`(${MONTHS.join('|')})\\W*(\\d{1,2})\\b`));
  if (!m) return null;
  const month = MONTHS.indexOf(m[1]);
  const day = Number(m[2]);
  const weekday = WEEKDAYS.findIndex((w) => up.includes(w));
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
    .map((y) => new Date(y, month, day))
    .filter((d) => d.getMonth() === month && d.getDate() === day)
    .sort((a, b) => Math.abs(a.getTime() - now.getTime()) - Math.abs(b.getTime() - now.getTime()));
  // A weekday only settles the year when it matches one of the nearby years within reach; a misread one must not push the date a year away.
  const nearest = years[0];
  if (!nearest) return null;
  const best = years.slice(0, 2).find((d) => d.getDay() === weekday) ?? nearest;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${best.getFullYear()}-${p(best.getMonth() + 1)}-${p(best.getDate())}`;
}

/** Tour and venue from a name like "Artist Proposed Menu Venue 2026": the PDF's own title if it fits, else the file name. */
export function namesFromPdf(fileName: string, pdfTitle: string): { name: string; venue: string } {
  const split = /\bproposed\s*menus?\b/i;
  const clean = (s: string) => s.replace(/\.pdf$/i, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  const source = [pdfTitle, fileName].map(clean).find((s) => split.test(s));
  if (!source) return { name: clean(fileName), venue: '' };
  const [name, venue] = source.split(split);
  return { name: name.trim(), venue: venue.replace(/\b(19|20)\d{2}\b/g, '').replace(/\s+/g, ' ').trim() };
}

const normal = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

function editDistance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

/** The catalog dish this name means: an exact match, or one a letter or two away on a long enough name. */
function matchDish(name: string, dishes: Dish[]): { dish: Dish; exact: boolean } | undefined {
  const n = normal(name);
  let best: Dish | undefined;
  let bestDistance = Math.min(2, Math.floor(n.length * 0.15)) + 1;
  for (const d of dishes) {
    const distance = editDistance(n, normal(d.name));
    if (distance === 0) return { dish: d, exact: true };
    if (distance < bestDistance) { best = d; bestDistance = distance; }
  }
  return best && { dish: best, exact: false };
}

const STANDARD_MEALS: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

function mealFromHeading(heading: string): { type: MealType; title: string } {
  const text = heading.replace(/\s+/g, ' ').trim().toUpperCase();
  const standard = STANDARD_MEALS.find((t) => editDistance(text, t.toUpperCase()) <= 1);
  if (standard) return { type: standard, title: DEFAULT_TITLES[standard] };
  return { type: 'Custom', title: text || DEFAULT_TITLES.Custom };
}

export function buildImport(read: ReadPdf, fileName: string, catalog: Catalog, now = new Date()): ImportResult {
  const { name, venue } = namesFromPdf(fileName, read.title);
  let event: MenuEvent = { ...createEvent(name, venue, defaultFileName(name)), coverIncludesScript: true };
  const unsure: UnsureLine[] = [];
  const problems: string[] = [];
  let lastDayId: string | undefined;

  read.pages.forEach((page, i) => {
    const iso = parseMenuDate(page.date.text, now);
    const { type, title } = mealFromHeading(page.heading.text);
    if (!page.heading.text.trim()) problems.push(`Page ${i + 1}: couldn't read the meal name.`);

    let day: Day | undefined;
    if (iso) {
      event = addDate(event, iso);
      day = dayForDate(event, iso);
    } else {
      if (lastDayId) {
        problems.push(`Page ${i + 1}: couldn't read the date, so it was put with the day before.`);
      } else {
        problems.push(`Page ${i + 1}: couldn't read the date.`);
        const undated = createDay();
        event = { ...event, days: [...event.days, undated] };
        lastDayId = undated.id;
      }
      day = event.days.find((d) => d.id === lastDayId);
    }
    if (!day) return;
    const dayId = day.id;
    lastDayId = dayId;

    const items = parsePageItems(page.lines, read.pageWidth);
    if (items.length === 0) problems.push(`Page ${i + 1}: no dishes could be read.`);
    const meal: Meal = {
      id: newId(), type, title,
      lines: items.map((item): DishLine => {
        const match = matchDish(item.name, catalog.dishes);
        // An exact match keeps the printed spelling (accents included); a near one was a misread, so use the catalog's.
        const dishName = match && !match.exact ? match.dish.name : item.name;
        return { kind: 'dish', id: newId(), dishName, tags: item.tags, description: item.description, sourceDishId: match?.dish.id };
      }),
    };
    const where = [title, day.date ? formatDateLabel(day.date) : ''].filter(Boolean).join(', ');
    items.forEach((item, n) => {
      const reason = item.unknown ? `"(${item.unknown})" isn't a dietary tag` : item.confidence < SURE ? 'Hard to read' : '';
      if (reason) unsure.push({ dayId, mealId: meal.id, lineId: meal.lines[n].id, where, reason });
    });
    event = { ...event, days: event.days.map((d) => (d.id === dayId ? { ...d, meals: [...d.meals, meal] } : d)) };
  });
  return { event, unsure, problems };
}

export interface GrayImage { width: number; height: number; data: Uint8ClampedArray }

/**
 * Close up the wide letter-spacing of the page headings and date lines, which OCR can't read as printed.
 * Trims to the ink, shrinks each gap between letters, and keeps the bigger gaps between words a little wider.
 */
export function closeLetterGaps(img: GrayImage): GrayImage | null {
  const { width, height: h, data } = img;
  const sorted = Uint8ClampedArray.from(data).sort();
  const paper = sorted[sorted.length >> 1];
  const isInk = (x: number, y: number) => Math.abs(data[y * width + x] - paper) > 60;

  const rows: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < width; x++) if (isInk(x, y)) { rows.push(y); break; }
  if (rows.length === 0) return null;
  const top = rows[0], bottom = rows[rows.length - 1];
  const inkHeight = bottom - top + 1;

  const hasInk: boolean[] = [];
  for (let x = 0; x < width; x++) {
    let found = false;
    for (let y = top; y <= bottom && !found; y++) found = isInk(x, y);
    hasInk.push(found);
  }
  const first = hasInk.indexOf(true), last = hasInk.lastIndexOf(true);

  const runs: { ink: boolean; from: number; to: number }[] = [];
  for (let x = first; x <= last; x++) {
    const run = runs[runs.length - 1];
    if (run && run.ink === hasInk[x]) run.to = x + 1;
    else runs.push({ ink: hasInk[x], from: x, to: x + 1 });
  }
  const gaps = runs.filter((r) => !r.ink).map((r) => r.to - r.from).sort((a, b) => a - b);
  const median = gaps[gaps.length >> 1] ?? 0;
  const letterGap = Math.max(4, Math.round(inkHeight * 0.1));
  const wordGap = Math.max(letterGap + 2, Math.round(inkHeight * 0.45));

  const keep: number[] = [];
  for (const r of runs) {
    const size = r.to - r.from;
    const count = r.ink ? size : Math.min(size, size <= median * 2 ? letterGap : wordGap);
    for (let i = 0; i < count; i++) keep.push(r.from + i);
  }

  const margin = 30, pad = 4;
  const y0 = Math.max(0, top - pad), y1 = Math.min(h - 1, bottom + pad);
  const outW = keep.length + margin * 2, outH = y1 - y0 + 1 + margin * 2;
  const out = new Uint8ClampedArray(outW * outH).fill(paper);
  for (let y = y0; y <= y1; y++) {
    keep.forEach((x, i) => { out[(y - y0 + margin) * outW + i + margin] = data[y * width + x]; });
  }
  return { width: outW, height: outH, data: out };
}

export interface Box { left: number; top: number; right: number; bottom: number }

/**
 * Where the cover banner sits on a page. Each edge is the sharpest change in brightness near where the standard
 * layout puts it, so a banner a little off the standard position is still cropped cleanly, without page background.
 */
export function findBanner(page: GrayImage, standard: Box): Box {
  const { width: w, height: h, data } = page;
  const reach = Math.round(h * 0.05);
  /** The strongest step between neighboring rows or columns in a range; the fallback if nothing stands out. */
  const edge = (from: number, to: number, fallback: number, step: (i: number) => number) => {
    let best = fallback, strongest = 25;
    for (let i = Math.max(1, from); i <= to; i++) {
      const s = step(i);
      if (s > strongest) { strongest = s; best = i; }
    }
    return best;
  };
  const rowStep = (y: number) => {
    let sum = 0;
    for (let x = 0; x < w; x += 4) sum += Math.abs(data[y * w + x] - data[(y - 1) * w + x]);
    return sum / (w / 4);
  };
  const colStep = (x: number) => {
    let sum = 0;
    for (let y = standard.top; y < standard.bottom; y += 4) sum += Math.abs(data[y * w + x] - data[y * w + x - 1]);
    return sum / ((standard.bottom - standard.top) / 4);
  };
  return {
    left: edge(0, standard.left + reach, standard.left, colStep),
    right: edge(standard.right - reach, w - 1, standard.right, colStep),
    top: edge(0, standard.top + reach, standard.top, rowStep),
    bottom: edge(standard.bottom - reach, Math.min(h - 1, standard.bottom + reach), standard.bottom, rowStep),
  };
}
