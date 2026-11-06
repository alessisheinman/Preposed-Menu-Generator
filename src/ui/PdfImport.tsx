import { useEffect, useState } from 'react';
import { mapMeal, updateLine } from '../model/event';
import { defaultFileName } from '../model/format';
import type { Catalog, DishLine, MenuEvent } from '../model/types';
import { buildImport, type ImportResult } from '../import/parseProposal';

export interface ImportedCover { dataUrl: string; sample: Uint8ClampedArray }

interface Props {
  file: File;
  catalog: Catalog;
  onCancel: () => void;
  onCreate: (event: MenuEvent, cover: ImportedCover) => void;
}

/** Reads a proposal PDF, then shows what was read so it can be checked before the proposal is created. */
export function PdfImport({ file, catalog, onCancel, onCreate }: Props) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [cover, setCover] = useState<ImportedCover | null>(null);

  useEffect(() => {
    let cancelled = false;
    const stop = new AbortController();
    (async () => {
      try {
        const { readProposalPdf } = await import('../import/readPdf'); // heavy, so loaded only when importing
        const read = await readProposalPdf(file, (done, total) => { if (!cancelled) setProgress({ done, total }); }, stop.signal);
        if (cancelled) return;
        const built = buildImport(read, file.name, catalog);
        if (built.event.days.every((d) => d.meals.every((m) => m.lines.length === 0))) {
          setError("No dishes could be read from that PDF. It may not be laid out like a proposal page.");
          return;
        }
        setCover({ dataUrl: read.coverDataUrl, sample: read.coverSample });
        setResult(built);
      } catch (e) {
        if (!cancelled) setError(`Couldn't read that PDF: ${(e as Error).message}`);
      }
    })();
    return () => { cancelled = true; stop.abort(); };
    // Read each chosen file once; later catalog edits shouldn't restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  if (error) {
    return (
      <div className="notice">
        <p className="error">{error}</p>
        <button type="button" className="ghost" onClick={onCancel}>Close</button>
      </div>
    );
  }

  if (!result || !cover) {
    return (
      <div className="notice pdf-reading" role="status">
        <strong>Reading {file.name}</strong>
        <p>
          {progress && progress.done < progress.total ? `Page ${progress.done + 1} of ${progress.total}…` : 'Getting ready…'}
          {' '}This takes a few seconds per page, and the PDF stays on this computer.
        </p>
        {progress && <progress value={progress.done} max={progress.total} />}
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    );
  }

  const { event, unsure, problems } = result;
  const setEvent = (next: MenuEvent) => setResult({ ...result, event: next });
  const meals = event.days.flatMap((d) => d.meals);
  const dishCount = meals.reduce((n, m) => n + m.lines.length, 0);
  const lineOf = (mealId: string, lineId: string) => meals.find((m) => m.id === mealId)?.lines.find((l) => l.id === lineId) as DishLine | undefined;

  return (
    <div className="notice pdf-review">
      <strong>Read {meals.length} page{meals.length === 1 ? '' : 's'}: {event.days.length} day{event.days.length === 1 ? '' : 's'}, {dishCount} dish{dishCount === 1 ? '' : 'es'}</strong>
      <div className="pdf-review-names">
        <label className="field grow">
          <span>Tour / artist</span>
          <input value={event.name} onChange={(e) => setEvent({ ...event, name: e.target.value, fileName: defaultFileName(e.target.value) })} />
        </label>
        <label className="field grow">
          <span>Venue</span>
          <input value={event.venue} onChange={(e) => setEvent({ ...event, venue: e.target.value })} />
        </label>
      </div>

      {problems.length > 0 && <ul className="warnings">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}

      {unsure.length > 0 && (
        <div className="pdf-unsure">
          <p>Check {unsure.length === 1 ? 'this line' : `these ${unsure.length} lines`} against the PDF:</p>
          <ul>
            {unsure.map((u) => {
              const line = lineOf(u.mealId, u.lineId);
              if (!line) return null;
              const edit = (patch: Partial<DishLine>) => setEvent(mapMeal(event, u.dayId, u.mealId, (m) => updateLine(m, u.lineId, () => ({ ...line, ...patch }))));
              return (
                <li key={u.lineId}>
                  <small>{u.where}: {u.reason}</small>
                  <input value={line.dishName} aria-label="Dish name" onChange={(e) => edit({ dishName: e.target.value })} />
                  <input value={line.description} aria-label="Description" placeholder="Description" onChange={(e) => edit({ description: e.target.value })} />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="pdf-review-tip">Every dish can still be edited once the proposal is open. Compare it with the PDF before sending it on, dietary tags especially.</p>
      <div className="row">
        <button type="button" className="primary" onClick={() => onCreate(event, cover)}>Create proposal</button>
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
