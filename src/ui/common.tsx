import { useEffect, useState, type ReactNode } from 'react';
import { TAGS, type Tag } from '../model/types';

/** Two-click confirm instead of a blocking browser dialog. */
export function ConfirmButton(props: { label: ReactNode; confirmLabel?: string; onConfirm: () => void; className?: string; title?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      title={props.title}
      className={`${props.className ?? ''} ${armed ? 'danger armed' : ''}`}
      onClick={() => (armed ? (setArmed(false), props.onConfirm()) : setArmed(true))}
    >
      {armed ? props.confirmLabel ?? 'Click again to confirm' : props.label}
    </button>
  );
}

const TAG_SHORT: Record<Tag, string> = { Vegan: 'V', Vegetarian: 'VT', GF: 'GF' };

export function TagToggles({ tags, onChange }: { tags: Tag[]; onChange: (t: Tag[]) => void }) {
  return (
    <span className="tags">
      {TAGS.map((t) => {
        const on = tags.includes(t);
        return (
          <button
            key={t}
            type="button"
            className={`tag ${on ? 'on' : ''}`}
            title={t}
            aria-pressed={on}
            onClick={() => onChange(on ? tags.filter((x) => x !== t) : [...tags, t])}
          >
            {TAG_SHORT[t]}
          </button>
        );
      })}
    </span>
  );
}

/** Text input that commits on blur/Enter, so typing doesn't thrash shared state. */
export function CommitInput(props: { value: string; onCommit: (v: string) => void; placeholder?: string; className?: string; list?: string; ariaLabel?: string }) {
  const [draft, setDraft] = useState(props.value);
  useEffect(() => setDraft(props.value), [props.value]);
  return (
    <input
      className={props.className}
      value={draft}
      list={props.list}
      placeholder={props.placeholder}
      aria-label={props.ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== props.value && props.onCommit(draft)}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

export const TITLE_SUGGESTIONS = ['BREAKFAST', 'LUNCH', 'DINNER', 'BRUNCH', 'OVERNIGHT MEAL', 'LATE NIGHT', 'SNACKS'];

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
