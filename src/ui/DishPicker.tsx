import { useId, useMemo, useState } from 'react';
import type { Category, Dish } from '../model/types';

interface Props {
  value: string;
  dishes: Dish[];
  /** Categories shown first (e.g. a dinner slot's categories); other matches follow. */
  preferred?: Category[];
  placeholder?: string;
  className?: string;
  title?: string;
  onType: (text: string) => void;
  onPick: (dish: Dish) => void;
}

const MAX = 12;

/** Every typed word must appear somewhere in the name ("salm spin" → "Seared Salmon with Spinach"). */
export function matchDishes(query: string, dishes: Dish[], preferred: Category[] = []): Dish[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = dishes.filter((d) => words.every((w) => d.name.toLowerCase().includes(w)));
  const rank = (d: Dish) => (preferred.length && !preferred.includes(d.category) ? 1 : 0);
  const starts = (d: Dish) => (words[0] && d.name.toLowerCase().startsWith(words[0]) ? 0 : 1);
  return hits.sort((a, b) => rank(a) - rank(b) || starts(a) - starts(b) || a.name.localeCompare(b.name));
}

export function DishPicker({ value, dishes, preferred, placeholder, className, title, onType, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const all = useMemo(() => matchDishes(value, dishes, preferred), [value, dishes, preferred]);
  const options = all.slice(0, MAX);

  const pick = (d: Dish) => {
    onPick(d);
    setOpen(false);
  };

  return (
    <div className="picker">
      <input
        className={className}
        value={value}
        placeholder={placeholder}
        title={title}
        role="combobox"
        aria-label="Dish"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => { onType(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter' && open && options[active]) { e.preventDefault(); pick(options[active]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && options.length > 0 && (
        <ul className="picker-list" role="listbox" id={listId}>
          {options.map((d, i) => (
            <li
              key={d.id}
              role="option"
              aria-selected={i === active}
              className={`${i === active ? 'active' : ''} ${preferred?.length && !preferred.includes(d.category) ? 'other' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(d); }}
              onMouseEnter={() => setActive(i)}
            >
              <span>{d.name}</span>
              <small>{d.category}</small>
            </li>
          ))}
          {all.length > MAX && <li className="more" aria-disabled="true">{all.length - MAX} more — keep typing</li>}
        </ul>
      )}
    </div>
  );
}
