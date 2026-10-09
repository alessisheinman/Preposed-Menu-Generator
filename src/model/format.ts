import { TAGS, type Line, type Meal, type Tag } from './types';

/** Proposal style: every tag group in parentheses — (GF), (Vegan), (Vegan, GF). */
export function formatTags(tags: Tag[]): string {
  const ordered = TAGS.filter((t) => tags.includes(t));
  return ordered.length ? `(${ordered.join(', ')})` : '';
}

export interface PrintItem { name: string; description: string; }

/** What a proposal page prints for each line; empty slots and blank lines are dropped. */
export function printItems(meal: Pick<Meal, 'lines'>): PrintItem[] {
  return meal.lines.flatMap((l: Line): PrintItem[] => {
    if (l.kind === 'text') return l.text.trim() ? [{ name: l.text.trim(), description: '' }] : [];
    if (!l.dishName.trim()) return [];
    const tags = formatTags(l.tags);
    return [{ name: tags ? `${l.dishName.trim()} ${tags}` : l.dishName.trim(), description: l.description.trim() }];
  });
}

export function defaultFileName(eventName: string): string {
  const clean = eventName.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Event';
  return `${clean} Proposed Menu.pdf`;
}
