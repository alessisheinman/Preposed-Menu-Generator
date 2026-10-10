import { useRef, useState } from 'react';
import { fromIsoDate, monthGrid, toIsoDate } from '../model/dates';

interface Props {
  /** Dates (YYYY-MM-DD) currently in the menu. */
  selected: string[];
  /** Click toggles one day; shift-click selects every day since the last click. */
  onPick: (iso: string, rangeFrom?: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** A month calendar for choosing the days the menu covers. */
export function DayCalendar({ selected, onPick }: Props) {
  const initial = selected.length ? fromIsoDate([...selected].sort()[0]) : new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const lastPicked = useRef<string | null>(null);
  const chosen = new Set(selected);
  const today = toIsoDate(new Date());
  const step = (delta: number) => setView(({ year, month }) => {
    const d = new Date(year, month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const title = new Date(view.year, view.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="calendar">
      <div className="cal-head">
        <button type="button" className="icon" aria-label="Previous month" onClick={() => step(-1)}>‹</button>
        <strong>{title}</strong>
        <button type="button" className="icon" aria-label="Next month" onClick={() => step(1)}>›</button>
      </div>
      <div className="cal-grid" role="grid" aria-label={title}>
        {WEEKDAYS.map((w) => <span key={w} className="cal-dow">{w}</span>)}
        {monthGrid(view.year, view.month).flat().map((iso, i) => iso ? (
          <button
            key={iso}
            type="button"
            className={`cal-day ${chosen.has(iso) ? 'on' : ''} ${iso === today ? 'today' : ''}`}
            aria-pressed={chosen.has(iso)}
            aria-label={fromIsoDate(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            onClick={(e) => {
              onPick(iso, e.shiftKey && lastPicked.current ? lastPicked.current : undefined);
              lastPicked.current = iso;
            }}
          >
            {Number(iso.slice(8))}
          </button>
        ) : <span key={`blank-${i}`} />)}
      </div>
    </div>
  );
}
