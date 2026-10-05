import { useMemo, useState } from 'react';
import { move } from './listUtils';
import { slugify } from '../model/ids';
import {
  CATEGORIES, MEAL_TYPES, SLOTS, type Catalog, type CatalogOverrides, type Category, type Dish, type MealTemplate, type Slot,
  type TemplateLine, type Venue,
} from '../model/types';
import { SEED_CATALOG, byName, deleteDish, emptyOverrides, upsertDish } from '../storage/catalog';
import { CommitInput, ConfirmButton, TagToggles } from './common';

interface Props {
  catalog: Catalog;
  overrides: CatalogOverrides;
  setOverrides: (fn: (o: CatalogOverrides) => CatalogOverrides) => void;
}

type Tab = 'dishes' | 'templates' | 'venues';

export function CatalogEditor({ catalog, overrides, setOverrides }: Props) {
  const [tab, setTab] = useState<Tab>('dishes');
  return (
    <div className="card catalog">
      <div className="list-head">
        <h2>Catalog</h2>
        <ConfirmButton label="Reset everything to defaults" confirmLabel="Erase all catalog edits?" onConfirm={() => setOverrides(() => emptyOverrides())} />
      </div>
      <p className="hint">Changes here affect new pages only. Saved proposals keep the names, tags and descriptions they were made with.</p>
      <nav className="tabs" role="tablist">
        {([['dishes', `Dishes (${catalog.dishes.length})`], ['templates', 'Templates'], ['venues', 'Venues']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{label}</button>
        ))}
      </nav>
      {tab === 'dishes' && <DishesTab catalog={catalog} overrides={overrides} setOverrides={setOverrides} />}
      {tab === 'templates' && <TemplatesTab catalog={catalog} setTemplates={(t) => setOverrides((o) => ({ ...o, templates: t }))} />}
      {tab === 'venues' && <VenuesTab venues={catalog.venues} setVenues={(v) => setOverrides((o) => ({ ...o, venues: v }))} />}
    </div>
  );
}

function DishesTab({ catalog, overrides, setOverrides }: Props) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | ''>('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<Category>('Chicken');
  const seedIds = useMemo(() => new Set(SEED_CATALOG.dishes.map((d) => d.id)), []);
  const edited = new Set(overrides.dishes.upserted.map((d) => d.id));
  const shown = catalog.dishes
    .filter((d) => (!cat || d.category === cat) && (!onlyMissing || !d.description.trim()))
    .filter((d) => `${d.name} ${d.description}`.toLowerCase().includes(q.toLowerCase()))
    .sort(byName);
  const save = (d: Dish) => setOverrides((o) => upsertDish(o, d));
  const add = () => {
    const name = newName.trim();
    if (!name || catalog.dishes.some((d) => d.name.toLowerCase() === name.toLowerCase())) return setNewName('');
    let id = slugify(name) || 'dish';
    while (catalog.dishes.some((d) => d.id === id) || seedIds.has(id)) id += '-x';
    save({ id, name, category: newCat, tags: [], description: '' });
    setNewName('');
  };
  return (
    <div>
      <form className="row add-dish" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input value={newName} placeholder="New dish name" onChange={(e) => setNewName(e.target.value)} />
        <select value={newCat} onChange={(e) => setNewCat(e.target.value as Category)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <button type="submit">Add dish</button>
      </form>
      <div className="row filters">
        <input type="search" value={q} placeholder="Search names and descriptions…" onChange={(e) => setQ(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value as Category | '')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> Missing description</label>
        <span className="muted">{shown.length} shown</span>
      </div>
      <table className="dish-table">
        <thead><tr><th>Name</th><th>Description (5–6 words)</th><th>Category</th><th>Tags</th><th /></tr></thead>
        <tbody>
          {shown.map((d) => (
            <tr key={d.id}>
              <td>
                <CommitInput value={d.name} ariaLabel="Dish name" onCommit={(name) => name.trim() && save({ ...d, name: name.trim() })} />
                {edited.has(d.id) && <span className="badge">{seedIds.has(d.id) ? 'edited' : 'new'}</span>}
              </td>
              <td>
                <CommitInput className={d.description.trim() ? '' : 'missing'} value={d.description} ariaLabel="Description" placeholder="Add a description" onCommit={(description) => save({ ...d, description: description.trim() })} />
                {d.description.trim().split(/\s+/).length > 6 && <span className="badge warn">long</span>}
              </td>
              <td>
                <select value={d.category} aria-label="Category" onChange={(e) => save({ ...d, category: e.target.value as Category })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </td>
              <td><TagToggles tags={d.tags} onChange={(tags) => save({ ...d, tags })} /></td>
              <td><ConfirmButton label="Delete" confirmLabel="Sure?" onConfirm={() => setOverrides((o) => deleteDish(o, d.id))} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TemplatesTab({ catalog, setTemplates }: { catalog: Catalog; setTemplates: (t: MealTemplate[]) => void }) {
  const [selected, setSelected] = useState(catalog.templates[0]?.id ?? '');
  const t = catalog.templates.find((x) => x.id === selected);
  const nameOf = (id: string | null) => (id ? catalog.dishes.find((d) => d.id === id)?.name ?? `(deleted: ${id})` : '');
  const idOf = (name: string) => catalog.dishes.find((d) => d.name.toLowerCase() === name.trim().toLowerCase())?.id;
  const sorted = useMemo(() => [...catalog.dishes].sort(byName), [catalog.dishes]);
  const saveT = (next: MealTemplate) => setTemplates(catalog.templates.map((x) => (x.id === next.id ? next : x)));
  const setLines = (lines: TemplateLine[]) => t && saveT({ ...t, lines });
  return (
    <div className="templates">
      <datalist id="dl-cat-dishes">{sorted.map((d) => <option key={d.id} value={d.name} />)}</datalist>
      <div className="row">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} aria-label="Template">
          {MEAL_TYPES.map((mt) => (
            <optgroup key={mt} label={mt}>
              {catalog.templates.filter((x) => x.mealType === mt).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </optgroup>
          ))}
        </select>
        <button type="button" onClick={() => {
          const id = `template-${Date.now().toString(36)}`;
          setTemplates([...catalog.templates, { id, name: 'New template', mealType: 'Lunch', lines: [] }]);
          setSelected(id);
        }}>New template</button>
        {t && <ConfirmButton label="Delete template" confirmLabel="Delete it?" onConfirm={() => {
          const rest = catalog.templates.filter((x) => x.id !== t.id);
          setTemplates(rest);
          setSelected(rest[0]?.id ?? '');
        }} />}
      </div>
      {t && (
        <>
          <div className="row">
            <label className="field grow"><span>Name</span><CommitInput value={t.name} onCommit={(name) => saveT({ ...t, name })} /></label>
            <label className="field"><span>Meal type</span>
              <select value={t.mealType} onChange={(e) => saveT({ ...t, mealType: e.target.value as MealTemplate['mealType'] })}>
                {MEAL_TYPES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
          </div>
          <table className="template-table">
            <thead><tr><th>Dish</th><th>Slot</th><th>Swap options (comma separated)</th><th title="Unticked = offered as a quick-add">On page</th><th /></tr></thead>
            <tbody>
              {t.lines.map((l, i) => (
                <tr key={i}>
                  <td><CommitInput value={nameOf(l.dishId)} list="dl-cat-dishes" placeholder={l.slot ? '(empty slot)' : 'Dish…'} ariaLabel="Dish"
                    onCommit={(v) => setLines(t.lines.map((x, j) => (j === i ? { ...x, dishId: v.trim() ? idOf(v) ?? x.dishId : null } : x)))} /></td>
                  <td>
                    <select value={l.slot ?? ''} aria-label="Slot" onChange={(e) => setLines(t.lines.map((x, j) => (j === i ? { ...x, slot: (e.target.value || undefined) as Slot | undefined } : x)))}>
                      <option value="">—</option>
                      {SLOTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><CommitInput value={(l.alternatives ?? []).map(nameOf).join(', ')} ariaLabel="Swap options"
                    onCommit={(v) => setLines(t.lines.map((x, j) => (j === i ? { ...x, alternatives: v.split(',').map(idOf).filter((id): id is string => !!id) } : x)))} /></td>
                  <td><input type="checkbox" aria-label="On page" checked={l.enabled !== false} onChange={(e) => setLines(t.lines.map((x, j) => (j === i ? { ...x, enabled: e.target.checked ? undefined : false } : x)))} /></td>
                  <td className="nowrap">
                    <button type="button" className="icon" disabled={i === 0} onClick={() => setLines(move(t.lines, i, i - 1))}>↑</button>
                    <button type="button" className="icon" disabled={i === t.lines.length - 1} onClick={() => setLines(move(t.lines, i, i + 1))}>↓</button>
                    <button type="button" className="icon remove" onClick={() => setLines(t.lines.filter((_, j) => j !== i))}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row"><button type="button" onClick={() => setLines([...t.lines, { dishId: null }])}>+ Line</button></div>
        </>
      )}
    </div>
  );
}

function VenuesTab({ venues, setVenues }: { venues: Venue[]; setVenues: (v: Venue[]) => void }) {
  const set = (i: number, v: Venue) => setVenues(venues.map((x, j) => (j === i ? v : x)));
  return (
    <div>
      <table className="dish-table">
        <thead><tr><th>Venue name</th><th /></tr></thead>
        <tbody>
          {venues.map((v, i) => (
            <tr key={v.id}>
              <td><CommitInput value={v.name} ariaLabel="Venue name" onCommit={(name) => set(i, { ...v, name, printLabel: name })} /></td>
              <td><ConfirmButton label="Delete" confirmLabel="Sure?" onConfirm={() => setVenues(venues.filter((_, j) => j !== i))} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => setVenues([...venues, { id: `venue-${Date.now().toString(36)}`, name: 'New venue', printLabel: 'New venue' }])}>+ Venue</button>
    </div>
  );
}
