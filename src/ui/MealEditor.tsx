import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState, type ReactNode } from 'react';
import {
  applyTemplate, blankDishLine, dishLineFrom, emptySlotLine, removeLine, setLineDish, templateSuggestions, textLine, updateLine,
} from '../model/event';
import { SLOTS, SLOT_CATEGORIES, type Catalog, type Dish, type DishLine, type Line, type Meal, type TextLine } from '../model/types';
import { ConfirmButton, TagToggles } from './common';
import { DishPicker } from './DishPicker';
import { dragId, useSortableBox, type DragBox } from './dnd';

interface Props {
  meal: Meal;
  catalog: Catalog;
  dishByName: Map<string, Dish>;
  warnings: string[];
  onChange: (m: Meal) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  drag?: DragBox;
}

export function MealEditor({ meal, catalog, dishByName, warnings, onChange, onDuplicate, onDelete, drag }: Props) {
  const templates = catalog.templates.filter((t) => t.mealType === meal.type);
  const [pickedTemplate, setPickedTemplate] = useState(meal.templateId ?? templates[0]?.id ?? '');
  const template = catalog.templates.find((t) => t.id === meal.templateId);
  const suggestions = templateSuggestions(meal, template, catalog);
  const { setNodeRef: setLinesRef } = useDroppable({ id: `lines-area:${meal.id}`, data: { type: 'lines', mealId: meal.id, empty: meal.lines.length === 0 } });

  const setLine = (l: Line) => onChange(updateLine(meal, l.id, () => l));
  const addLine = (l: Line) => onChange({ ...meal, lines: [...meal.lines, l] });
  const doApply = () => {
    const t = catalog.templates.find((x) => x.id === pickedTemplate);
    if (t) onChange(applyTemplate(meal, t, catalog));
  };

  return (
    <section className={`meal meal-${meal.type.toLowerCase()}`} aria-label={meal.title}>
      <header className="meal-head" {...drag?.boxProps}>
        <span className="grip" {...drag?.gripProps}>⋮⋮</span>
        <label className="field grow">
          <span>Page heading</span>
          <input className="meal-title" value={meal.title} list="dl-titles" onChange={(e) => onChange({ ...meal, title: e.target.value.toUpperCase() })} />
        </label>
        {templates.length > 0 && (
          <label className="field">
            <span>{meal.type === 'Lunch' ? 'Cuisine' : 'Template'}</span>
            <span className="row">
              <select value={pickedTemplate} onChange={(e) => setPickedTemplate(e.target.value)}>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {meal.lines.length === 0
                ? <button type="button" onClick={doApply}>Load</button>
                : <ConfirmButton label="Load" confirmLabel="Replace all dishes?" onConfirm={doApply} />}
            </span>
          </label>
        )}
        <div className="meal-actions">
          <button type="button" onClick={onDuplicate}>Duplicate</button>
          <ConfirmButton label="Delete" confirmLabel="Delete page?" onConfirm={onDelete} />
        </div>
      </header>

      {warnings.length > 0 && <ul className="warnings">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}

      <SortableContext items={meal.lines.map((l) => dragId('line', l.id))} strategy={verticalListSortingStrategy}>
        <ol className={`lines ${meal.lines.length === 0 ? 'empty-drop' : ''}`} ref={setLinesRef}>
          {meal.lines.map((line) => (
            <SortableLine key={line.id} line={line} mealId={meal.id} onRemove={() => onChange(removeLine(meal, line.id))}>
              {line.kind === 'dish'
                ? <DishRow line={line} catalog={catalog} dishByName={dishByName} onChange={setLine} />
                : <TextRow line={line} onChange={setLine} />}
            </SortableLine>
          ))}
          {meal.lines.length === 0 && <li className="drop-hint">No dishes yet — load a template, add one below, or drag one here.</li>}
        </ol>
      </SortableContext>

      <footer className="meal-foot">
        <button type="button" onClick={() => addLine(blankDishLine())}>+ Dish</button>
        <button type="button" onClick={() => addLine(textLine())}>+ Plain line</button>
        {meal.type === 'Dinner' && SLOTS.map((s) => (
          <button key={s} type="button" className="ghost" onClick={() => addLine(emptySlotLine(s))}>+ {s}</button>
        ))}
      </footer>
      {suggestions.length > 0 && (
        <div className="suggestions">
          <span>Quick add:</span>
          {suggestions.map((d) => (
            <button key={d.id} type="button" className="chip" onClick={() => {
              const tl = template?.lines.find((l) => l.dishId === d.id);
              addLine(dishLineFrom(d, { slot: tl?.slot, alternatives: tl?.alternatives }));
            }}>+ {d.name}</button>
          ))}
        </div>
      )}
    </section>
  );
}

function SortableLine({ line, mealId, onRemove, children }: { line: Line; mealId: string; onRemove: () => void; children: ReactNode }) {
  const { setNodeRef, style, isDragging, boxProps, gripProps } = useSortableBox(dragId('line', line.id), { type: 'line', mealId });
  return (
    <li ref={setNodeRef} style={style} className={`line line-${line.kind} ${isDragging ? 'dragging' : ''}`} {...boxProps}>
      <span className="grip" {...gripProps}>⋮⋮</span>
      {children}
      <button type="button" className="icon remove" title="Remove" onClick={onRemove}>✕</button>
    </li>
  );
}

function DishRow({ line, catalog, dishByName, onChange }: { line: DishLine; catalog: Catalog; dishByName: Map<string, Dish>; onChange: (l: Line) => void }) {
  const alternatives = (line.alternatives ?? []).map((id) => catalog.dishes.find((d) => d.id === id)).filter((d): d is Dish => !!d);
  const current = line.sourceDishId ? catalog.dishes.find((d) => d.id === line.sourceDishId) : undefined;
  const swapOptions = current && !alternatives.includes(current) ? [current, ...alternatives] : alternatives;
  const unmatched = line.dishName.trim() !== '' && !line.sourceDishId;
  return (
    <div className="dish-row">
      <div className="dish-top">
        {line.slot && <span className={`slot slot-${line.slot}`}>{line.slot}</span>}
        <DishPicker
          className={`dish ${unmatched ? 'one-off' : ''}`}
          value={line.dishName}
          dishes={catalog.dishes}
          preferred={line.slot ? SLOT_CATEGORIES[line.slot] : undefined}
          placeholder={line.slot ? `Choose ${line.slot.toLowerCase()}…` : 'Type to search dishes…'}
          title={unmatched ? 'Not in the catalog — prints exactly as typed' : undefined}
          onType={(text) => onChange(setLineDish(line, dishByName.get(text.trim().toLowerCase()), text))}
          onPick={(dish) => onChange(setLineDish(line, dish, dish.name))}
        />
        {swapOptions.length > 1 && (
          <span className="swap-wrap" title="Swap for an alternative">
            <select
              className="swap"
              aria-label="Swap dish"
              value={line.sourceDishId ?? ''}
              onChange={(e) => {
                const picked = catalog.dishes.find((d) => d.id === e.target.value);
                if (!picked) return;
                const pool = swapOptions.map((d) => d.id).filter((id) => id !== picked.id);
                onChange({ ...setLineDish(line, picked, picked.name), alternatives: pool });
              }}
            >
              {!current && <option value="">—</option>}
              {swapOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </span>
        )}
        <TagToggles tags={line.tags} onChange={(tags) => onChange({ ...line, tags })} />
      </div>
      <input
        className={`desc ${line.dishName.trim() && !line.description.trim() ? 'missing' : ''}`}
        value={line.description}
        placeholder="Short description (5–6 words)"
        aria-label="Description"
        onChange={(e) => onChange({ ...line, description: e.target.value })}
      />
    </div>
  );
}

function TextRow({ line, onChange }: { line: TextLine; onChange: (l: Line) => void }) {
  return (
    <input className="text-line" value={line.text} placeholder="Plain line, e.g. Sandwich Station" aria-label="Plain line" onChange={(e) => onChange({ ...line, text: e.target.value })} />
  );
}
