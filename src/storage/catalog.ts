import { SEED_DISHES } from '../catalog/dishes';
import { SEED_TEMPLATES, SEED_VENUES } from '../catalog/templates';
import type { Catalog, CatalogOverrides, Dish } from '../model/types';

export const SEED_CATALOG: Catalog = { dishes: SEED_DISHES, templates: SEED_TEMPLATES, venues: SEED_VENUES };

export const emptyOverrides = (): CatalogOverrides => ({ dishes: { upserted: [], deletedIds: [] } });

/** User edits layered over the bundled seed, so shipping a new seed never erases them. */
export function mergeCatalog(seed: Catalog, o: CatalogOverrides): Catalog {
  const deleted = new Set(o.dishes.deletedIds);
  const upserts = new Map(o.dishes.upserted.map((d) => [d.id, d]));
  const dishes = seed.dishes.filter((d) => !deleted.has(d.id)).map((d) => upserts.get(d.id) ?? d);
  const seedIds = new Set(seed.dishes.map((d) => d.id));
  for (const d of o.dishes.upserted) if (!seedIds.has(d.id) && !deleted.has(d.id)) dishes.push(d);
  return { dishes, templates: o.templates ?? seed.templates, venues: o.venues ?? seed.venues };
}

export function upsertDish(o: CatalogOverrides, dish: Dish): CatalogOverrides {
  return {
    ...o,
    dishes: {
      upserted: [...o.dishes.upserted.filter((d) => d.id !== dish.id), dish],
      deletedIds: o.dishes.deletedIds.filter((id) => id !== dish.id),
    },
  };
}

export function deleteDish(o: CatalogOverrides, id: string): CatalogOverrides {
  return {
    ...o,
    dishes: {
      upserted: o.dishes.upserted.filter((d) => d.id !== id),
      deletedIds: o.dishes.deletedIds.includes(id) ? o.dishes.deletedIds : [...o.dishes.deletedIds, id],
    },
  };
}

export const byName = (a: Dish, b: Dish) => a.name.localeCompare(b.name);
