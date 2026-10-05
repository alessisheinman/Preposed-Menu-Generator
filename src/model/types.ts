export type Tag = 'GF' | 'Vegan' | 'Vegetarian';
export const TAGS: Tag[] = ['Vegan', 'Vegetarian', 'GF'];

export type Category =
  | 'Breakfast' | 'Soup' | 'Salad' | 'Sandwich' | 'Pasta' | 'Rice/Grains'
  | 'Chicken' | 'Beef/Pork' | 'Fish' | 'Vegetarian Main' | 'Vegetable'
  | 'Spread/Bread' | 'Dessert' | 'Beverage/Service';

export const CATEGORIES: Category[] = [
  'Breakfast', 'Soup', 'Salad', 'Sandwich', 'Pasta', 'Rice/Grains',
  'Chicken', 'Beef/Pork', 'Fish', 'Vegetarian Main', 'Vegetable',
  'Spread/Bread', 'Dessert', 'Beverage/Service',
];

/** Dinner slot → catalog categories offered first in that slot's picker. */
export type Slot = 'Starch' | 'Protein' | 'Vegetable' | 'Dessert';
export const SLOTS: Slot[] = ['Starch', 'Protein', 'Vegetable', 'Dessert'];
export const SLOT_CATEGORIES: Record<Slot, Category[]> = {
  Starch: ['Pasta', 'Rice/Grains'],
  Protein: ['Chicken', 'Beef/Pork', 'Fish', 'Vegetarian Main'],
  Vegetable: ['Vegetable'],
  Dessert: ['Dessert'],
};

export interface Dish { id: string; name: string; category: Category; tags: Tag[]; description: string; }
export interface Venue { id: string; name: string; printLabel: string; }

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Custom';
export const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Custom'];

export interface TemplateLine {
  /** null = an empty dinner slot to be filled in. */
  dishId: string | null;
  slot?: Slot;
  /** Dish IDs offered as one-click swaps. */
  alternatives?: string[];
  /** false = offered as a quick-add suggestion instead of added up front. */
  enabled?: boolean;
}

export interface MealTemplate {
  id: string;
  name: string;
  mealType: MealType;
  lines: TemplateLine[];
}

export interface Catalog { dishes: Dish[]; templates: MealTemplate[]; venues: Venue[]; }

/** Dish lines snapshot name, tags and description so catalog edits never change a saved menu. */
export interface DishLine {
  kind: 'dish';
  id: string;
  dishName: string;
  tags: Tag[];
  description: string;
  sourceDishId?: string;
  slot?: Slot;
  alternatives?: string[];
}
/** A plain line such as "Sandwich Station" — printed like a dish name, without description. */
export interface TextLine { kind: 'text'; id: string; text: string; }
export type Line = DishLine | TextLine;

export interface Meal {
  id: string;
  type: MealType;
  /** Printed heading, e.g. BREAKFAST or OVERNIGHT MEAL. */
  title: string;
  templateId?: string;
  lines: Line[];
}
export interface Day { id: string; dateLabel: string; meals: Meal[]; }

export interface Palette {
  primary: string;   // #rrggbb
  secondary: string; // #rrggbb
  /** true = colors follow the cover art; false = the user picked them. */
  auto: boolean;
}

export interface MenuEvent {
  id: string;
  name: string;
  venue: string;
  fileName: string;
  /** Cover art is stored separately (IndexedDB) under this key; null = none uploaded. */
  coverId: string | null;
  /** Vertical crop position of the cover in the banner, 0 (top) – 100 (bottom). */
  coverFocusY: number;
  palette: Palette;
  days: Day[];
  updatedAt: string;
}

export interface CatalogOverrides {
  dishes: { upserted: Dish[]; deletedIds: string[] };
  templates?: MealTemplate[];
  venues?: Venue[];
}

export interface ExportFile {
  schemaVersion: number;
  events: MenuEvent[];
  /** Cover images as data URLs, keyed by coverId. */
  covers?: Record<string, string>;
  catalogOverrides?: CatalogOverrides;
}
