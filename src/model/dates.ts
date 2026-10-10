import { newId } from './ids';
import type { Day, MenuEvent } from './types';

/** Calendar dates are stored as local 'YYYY-MM-DD' strings (no time zone surprises). */
export function toIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The line printed under the meal heading, e.g. "Wednesday, September 23". */
export function formatDateLabel(iso: string): string {
  return fromIsoDate(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Dated days in date order; any undated (older) days keep their order at the end. */
export function sortDays(days: Day[]): Day[] {
  const dated = days.filter((d) => d.date).sort((a, b) => a.date!.localeCompare(b.date!));
  return [...dated, ...days.filter((d) => !d.date)];
}

export function dayForDate(event: MenuEvent, iso: string): Day | undefined {
  return event.days.find((d) => d.date === iso);
}

/** Add an empty day for this date (no-op if it already exists). */
export function addDate(event: MenuEvent, iso: string): MenuEvent {
  if (dayForDate(event, iso)) return event;
  const day: Day = { id: newId(), date: iso, dateLabel: formatDateLabel(iso), meals: [] };
  return { ...event, days: sortDays([...event.days, day]) };
}

export function removeDate(event: MenuEvent, iso: string): MenuEvent {
  return { ...event, days: event.days.filter((d) => d.date !== iso) };
}

/** Give an existing (e.g. older, undated) day a calendar date. Refuses dates already used by another day. */
export function setDayDate(event: MenuEvent, dayId: string, iso: string): MenuEvent {
  if (event.days.some((d) => d.date === iso && d.id !== dayId)) return event;
  return { ...event, days: sortDays(event.days.map((d) => (d.id === dayId ? { ...d, date: iso, dateLabel: formatDateLabel(iso) } : d))) };
}

/** Every date from a to b inclusive (either order). */
export function datesBetween(a: string, b: string): string[] {
  const [start, end] = a <= b ? [a, b] : [b, a];
  const out: string[] = [];
  for (const d = fromIsoDate(start); toIsoDate(d) <= end; d.setDate(d.getDate() + 1)) out.push(toIsoDate(d));
  return out;
}

/** Weeks of a month for a calendar grid, Sunday first; days outside the month are null. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toIsoDate(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
