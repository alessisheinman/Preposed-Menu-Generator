import {
  DndContext, DragOverlay, MeasuringStrategy, useDroppable, type DragEndEvent, type DragOverEvent, type DragStartEvent, type Over,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  DEFAULT_TITLES, createDay, createMeal, duplicateDay, duplicateMeal, insertAfter, mapDay, mapMeal, touch, validateEvent,
} from '../model/event';
import { printItems } from '../model/format';
import { findLine, findMeal, moveDay, moveLine, moveMeal } from '../model/reorder';
import type { Catalog, Day, Meal, MealType, MenuEvent } from '../model/types';
import { sampleFromDataUrl } from '../storage/covers';
import { extractPalette } from '../theme/palette';
import { ConfirmButton, TITLE_SUGGESTIONS, saveBlob } from './common';
import { CoverDrop, importCover } from './CoverDrop';
import { dragId, rawId, typedCollision, useDragSensors, useSortableBox, type DragBox, type DragType } from './dnd';
import { MealEditor } from './MealEditor';
import { Preview } from './Preview';

interface Props {
  event: MenuEvent;
  catalog: Catalog;
  coverUrl: string | null;
  onCoverStored: (id: string, dataUrl: string) => void;
  onChange: (e: MenuEvent) => void;
  onBack: () => void;
}

const ADDABLE: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Custom'];

export function EventEditor({ event, catalog, coverUrl, onCoverStored, onChange, onBack }: Props) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [coverError, setCoverError] = useState('');
  const update = (e: MenuEvent) => onChange(touch(e));
  const eventRef = useRef(event);
  eventRef.current = event;
  const dragStart = useRef<MenuEvent | null>(null);
  const [dragging, setDragging] = useState<{ type: DragType; id: string } | null>(null);
  const sensors = useDragSensors();
  const [candidates, setCandidates] = useState<string[]>([]);

  const dishByName = useMemo(() => new Map(catalog.dishes.map((d) => [d.name.toLowerCase(), d])), [catalog.dishes]);
  const warnings = validateEvent(event);
  const mealWarnings = (mealId: string) => warnings.filter((w) => w.mealId === mealId).map((w) => w.message);

  // Colors found in the cover, offered as one-click swatches.
  useEffect(() => {
    if (!coverUrl) { setCandidates([]); return; }
    let cancelled = false;
    sampleFromDataUrl(coverUrl).then((px) => { if (!cancelled) setCandidates(extractPalette(px).candidates); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [coverUrl]);

  // ---------- cover & colors ----------
  const onCoverFile = async (file: File) => {
    setCoverError('');
    setBusy('Reading cover…');
    try {
      const cover = await importCover(file);
      onCoverStored(cover.id, cover.dataUrl);
      const ev = eventRef.current;
      update({ ...ev, coverId: cover.id, palette: ev.palette.auto ? { primary: cover.primary, secondary: cover.secondary, auto: true } : ev.palette });
    } catch (e) {
      setCoverError(`Couldn't read that image: ${(e as Error).message}`);
    } finally {
      setBusy('');
    }
  };
  const resetColors = async () => {
    if (!coverUrl) return;
    const auto = extractPalette(await sampleFromDataUrl(coverUrl));
    update({ ...eventRef.current, palette: { primary: auto.primary, secondary: auto.secondary, auto: true } });
  };
  const setColor = (which: 'primary' | 'secondary', hex: string) => update({ ...event, palette: { ...event.palette, [which]: hex, auto: false } });

  // ---------- days & meals ----------
  const addMeal = (dayId: string, type: MealType) => {
    const template = catalog.templates.find((t) => t.mealType === type);
    update(mapDay(event, dayId, (d) => ({ ...d, meals: [...d.meals, createMeal(type, template, catalog, DEFAULT_TITLES[type])] })));
  };

  // ---------- drag & drop (same rules as the kitchen menu site) ----------
  const targetOf = (over: Over | null) => {
    const d = over?.data.current;
    if (!over || !d) return null;
    if (d.type === 'line' || d.type === 'lines') return { container: d.mealId as string, overId: d.type === 'line' ? rawId(over.id) : undefined };
    if (d.type === 'meal' || d.type === 'meals') return { container: d.dayId as string, overId: d.type === 'meal' ? rawId(over.id) : undefined };
    if (d.type === 'day') return { container: 'days', overId: rawId(over.id) };
    return null;
  };
  const applyMove = (type: DragType, id: string, t: { container: string; overId?: string }) => {
    const ev = eventRef.current;
    const next = type === 'line' ? moveLine(ev, id, t.container, t.overId)
      : type === 'meal' ? moveMeal(ev, id, t.container, t.overId)
        : t.overId ? moveDay(ev, id, t.overId) : ev;
    if (next !== ev) { eventRef.current = next; update(next); }
  };
  const containerOf = (type: DragType, id: string) =>
    type === 'line' ? findLine(eventRef.current, id)?.meal.id : type === 'meal' ? findMeal(eventRef.current, id)?.day.id : 'days';
  const activeOf = (e: DragStartEvent | DragOverEvent | DragEndEvent) => ({ type: e.active.data.current?.type as DragType, id: rawId(e.active.id) });
  const onDragStart = (e: DragStartEvent) => { dragStart.current = eventRef.current; setDragging(activeOf(e)); };
  const onDragOver = (e: DragOverEvent) => {
    const a = activeOf(e);
    if (a.type === 'day') return;
    const t = targetOf(e.over);
    if (t && t.overId !== a.id && t.container !== containerOf(a.type, a.id)) applyMove(a.type, a.id, t);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const a = activeOf(e);
    const t = targetOf(e.over);
    if (t && t.overId && t.overId !== a.id && t.container === containerOf(a.type, a.id)) applyMove(a.type, a.id, t);
    setDragging(null);
    dragStart.current = null;
  };
  const onDragCancel = () => {
    if (dragStart.current) update(dragStart.current);
    setDragging(null);
    dragStart.current = null;
  };
  const overlay = (): ReactNode => {
    if (!dragging) return null;
    if (dragging.type === 'line') {
      const hit = findLine(event, dragging.id);
      const label = hit ? printItems({ lines: [hit.line] })[0]?.name : '';
      return <div className="drag-chip">{label || 'Empty line'}</div>;
    }
    if (dragging.type === 'meal') {
      const hit = findMeal(event, dragging.id);
      return hit && <div className="drag-card">{hit.meal.title}{hit.day.dateLabel ? ` · ${hit.day.dateLabel}` : ''}</div>;
    }
    const day = event.days.find((d) => d.id === dragging.id);
    return day && <div className="drag-card">{day.dateLabel || 'Day'} · {day.meals.length} page{day.meals.length === 1 ? '' : 's'}</div>;
  };

  // ---------- export ----------
  const download = async () => {
    setError('');
    setBusy('Preparing…');
    try {
      const { exportPdf } = await import('../pdf/exportPdf'); // loaded on demand
      const blob = await exportPdf(event, coverUrl, (done, total) => setBusy(`Building page ${done} of ${total}…`));
      const name = event.fileName.trim() || 'Proposed Menu.pdf';
      saveBlob(blob, name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`);
    } catch (e) {
      setError(`Couldn't build the PDF: ${(e as Error).message}`);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="editor">
      <datalist id="dl-titles">{TITLE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}</datalist>
      <datalist id="dl-venues">{catalog.venues.map((v) => <option key={v.id} value={v.name} />)}</datalist>

      <div className="editor-main">
        <div className="event-bar">
          <button type="button" className="ghost" onClick={onBack}>← All events</button>
          <label className="field grow">
            <span>Tour / artist</span>
            <input className="event-name" value={event.name} onChange={(e) => update({ ...event, name: e.target.value })} />
          </label>
          <label className="field">
            <span>Venue (not printed)</span>
            <input value={event.venue} list="dl-venues" onChange={(e) => update({ ...event, venue: e.target.value })} />
          </label>
        </div>

        <section className="card cover-card">
          <CoverDrop imageUrl={coverUrl} focusY={event.coverFocusY} busy={busy === 'Reading cover…'} onFile={onCoverFile} />
          <div className="cover-controls">
            <h3 className="cover-heading">Cover &amp; colors</h3>
            {!coverUrl && <p className="hint">Add the tour's cover art on the left — the page colors come from it.</p>}
            {coverError && <p className="error">{coverError}</p>}
            {coverUrl && (
              <label className="field">
                <span>Crop position (drag to show a different part of the cover)</span>
                <input type="range" min={0} max={100} value={event.coverFocusY} onChange={(e) => update({ ...event, coverFocusY: Number(e.target.value) })} />
              </label>
            )}
            <div className="swatches">
              {(['primary', 'secondary'] as const).map((which) => (
                <label key={which} className="swatch">
                  <input type="color" value={event.palette[which]} onChange={(e) => setColor(which, e.target.value)} />
                  <span>{which === 'primary' ? 'Primary' : 'Secondary'}<small>{event.palette[which]}</small></span>
                </label>
              ))}
              <span className={`auto-badge ${event.palette.auto ? 'on' : ''}`}>{event.palette.auto ? 'From cover' : 'Custom'}</span>
              {!event.palette.auto && coverUrl && <button type="button" className="ghost" onClick={resetColors}>Reset to cover colors</button>}
            </div>
            {candidates.length > 0 && (
              <div className="candidates">
                <span>Colors in the cover:</span>
                {candidates.map((c) => (
                  <span key={c} className="cand-group">
                    <button type="button" className="cand" style={{ background: c }} title={`Use ${c} as primary`} onClick={() => setColor('primary', c)} />
                    <button type="button" className="cand small" style={{ background: c }} title={`Use ${c} as secondary`} onClick={() => setColor('secondary', c)}>2</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <DndContext
          sensors={sensors}
          collisionDetection={typedCollision}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <SortableContext items={event.days.map((d) => dragId('day', d.id))} strategy={verticalListSortingStrategy}>
            {event.days.map((day) => (
              <SortableDay key={day.id} day={day}>
                {(drag) => (
                  <>
                    <header className="day-head" {...drag.boxProps}>
                      <span className="grip" {...drag.gripProps}>⋮⋮</span>
                      <input
                        className="day-label"
                        value={day.dateLabel}
                        placeholder="Date line (optional), e.g. Tuesday, November 10"
                        aria-label="Date line"
                        onChange={(e) => update(mapDay(event, day.id, (d) => ({ ...d, dateLabel: e.target.value })))}
                      />
                      <div className="day-actions">
                        <button type="button" onClick={() => update({ ...event, days: insertAfter(event.days, day.id, duplicateDay(day)) })}>Duplicate day</button>
                        <ConfirmButton label="Delete day" confirmLabel="Delete whole day?" onConfirm={() => update({ ...event, days: event.days.filter((d) => d.id !== day.id) })} />
                      </div>
                    </header>
                    <SortableContext items={day.meals.map((m) => dragId('meal', m.id))} strategy={verticalListSortingStrategy}>
                      <MealsArea day={day}>
                        {day.meals.map((meal) => (
                          <SortableMeal key={meal.id} meal={meal} dayId={day.id}>
                            {(mealDrag) => (
                              <MealEditor
                                meal={meal}
                                catalog={catalog}
                                dishByName={dishByName}
                                warnings={mealWarnings(meal.id)}
                                drag={mealDrag}
                                onChange={(m) => update(mapMeal(event, day.id, meal.id, () => m))}
                                onDuplicate={() => update(mapDay(event, day.id, (d) => ({ ...d, meals: insertAfter(d.meals, meal.id, duplicateMeal(meal)) })))}
                                onDelete={() => update(mapDay(event, day.id, (d) => ({ ...d, meals: d.meals.filter((m) => m.id !== meal.id) })))}
                              />
                            )}
                          </SortableMeal>
                        ))}
                      </MealsArea>
                    </SortableContext>
                    <div className="add-meal">
                      <span>Add page:</span>
                      {ADDABLE.map((t) => <button key={t} type="button" onClick={() => addMeal(day.id, t)}>+ {t === 'Custom' ? 'Other' : t}</button>)}
                    </div>
                  </>
                )}
              </SortableDay>
            ))}
          </SortableContext>
          <DragOverlay dropAnimation={null}>{overlay()}</DragOverlay>
        </DndContext>

        <button type="button" className="add-day" onClick={() => update({ ...event, days: [...event.days, createDay()] })}>+ Add day</button>
      </div>

      <aside className="editor-side">
        <div className="download-box">
          <label className="field">
            <span>File name</span>
            <input value={event.fileName} onChange={(e) => update({ ...event, fileName: e.target.value })} />
          </label>
          <button type="button" className="primary" disabled={!!busy} onClick={download}>{busy || 'Download PDF'}</button>
          {error && <p className="error">{error}</p>}
          {warnings.length > 0 && (
            <details className="warn-summary">
              <summary>{warnings.length} thing{warnings.length > 1 ? 's' : ''} to check (download still works)</summary>
              <ul>{warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul>
            </details>
          )}
        </div>
        <h2 className="preview-title">Preview</h2>
        <Preview
          event={event}
          coverUrl={coverUrl}
          onMoveMeal={(mealId, overMealId) => {
            const over = findMeal(event, overMealId);
            if (over) update(moveMeal(event, mealId, over.day.id, overMealId));
          }}
        />
      </aside>
    </div>
  );
}

function SortableDay({ day, children }: { day: Day; children: (drag: DragBox) => ReactNode }) {
  const { setNodeRef, style, isDragging, boxProps, gripProps } = useSortableBox(dragId('day', day.id), { type: 'day' });
  return (
    <section ref={setNodeRef} style={style} className={`day ${isDragging ? 'dragging' : ''}`}>
      {children({ boxProps, gripProps })}
    </section>
  );
}

function MealsArea({ day, children }: { day: Day; children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `meals-area:${day.id}`, data: { type: 'meals', dayId: day.id, empty: day.meals.length === 0 } });
  return (
    <div ref={setNodeRef} className={`meals ${day.meals.length === 0 ? 'empty-drop' : ''}`}>
      {children}
      {day.meals.length === 0 && <p className="drop-hint">No pages yet — add one below, or drag one here.</p>}
    </div>
  );
}

function SortableMeal({ meal, dayId, children }: { meal: Meal; dayId: string; children: (drag: DragBox) => ReactNode }) {
  const { setNodeRef, style, isDragging, boxProps, gripProps } = useSortableBox(dragId('meal', meal.id), { type: 'meal', dayId });
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'dragging' : ''}>
      {children({ boxProps, gripProps })}
    </div>
  );
}
