import { describe, expect, it } from 'vitest';
import { addDate, datesBetween, formatDateLabel, monthGrid, removeDate, setDayDate, sortDays, toIsoDate } from './dates';
import { createEvent } from './event';
import type { Day } from './types';

const day = (id: string, date?: string): Day => ({ id, date, dateLabel: date ? formatDateLabel(date) : 'typed', meals: [] });

describe('dates', () => {
  it('formats the printed date line', () => {
    expect(formatDateLabel('2026-09-23')).toBe('Wednesday, September 23');
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('adds picked dates as days in date order, without duplicates', () => {
    let ev = createEvent('E', '', 'E.pdf');
    ev = addDate(ev, '2026-11-12');
    ev = addDate(ev, '2026-11-10');
    ev = addDate(ev, '2026-11-12');
    expect(ev.days.map((d) => d.date)).toEqual(['2026-11-10', '2026-11-12']);
    expect(ev.days[0].dateLabel).toBe('Tuesday, November 10');
    expect(removeDate(ev, '2026-11-10').days.map((d) => d.date)).toEqual(['2026-11-12']);
  });

  it('keeps older undated days at the end and lets them be given a date', () => {
    const ev = { ...createEvent('E', '', 'E.pdf'), days: [day('old'), day('b', '2026-11-11')] };
    expect(sortDays(ev.days).map((d) => d.id)).toEqual(['b', 'old']);
    const dated = setDayDate(ev, 'old', '2026-11-09');
    expect(dated.days.map((d) => d.id)).toEqual(['old', 'b']);
    expect(dated.days[0].dateLabel).toBe('Monday, November 9');
    expect(setDayDate(ev, 'old', '2026-11-11')).toBe(ev); // already taken
  });

  it('lists a date range for shift-click, either direction', () => {
    expect(datesBetween('2026-11-30', '2026-12-02')).toEqual(['2026-11-30', '2026-12-01', '2026-12-02']);
    expect(datesBetween('2026-12-02', '2026-11-30')).toHaveLength(3);
  });

  it('builds a Sunday-first month grid', () => {
    const weeks = monthGrid(2026, 8); // September 2026 starts on a Tuesday
    expect(weeks[0]).toEqual([null, null, '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
});
