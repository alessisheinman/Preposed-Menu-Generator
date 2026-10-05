import { slugify } from '../model/ids';
import type { MealTemplate, Slot, TemplateLine, Venue } from '../model/types';

/** Reference dishes by their catalog name; the seed test checks every name exists. */
const d = (name: string, opts: Omit<TemplateLine, 'dishId'> & { alts?: string[] } = {}): TemplateLine => {
  const { alts, ...rest } = opts;
  return { dishId: slugify(name), ...rest, ...(alts ? { alternatives: alts.map(slugify) } : {}) };
};
const extra = (name: string): TemplateLine => d(name, { enabled: false });
const slot = (s: Slot, name?: string, alts?: string[]): TemplateLine =>
  name ? d(name, { slot: s, alts }) : { dishId: null, slot: s };

const SALAD = d('Salad World', { alts: ['Fresh Salad Bar Medley'] });

export const SEED_TEMPLATES: MealTemplate[] = [
  {
    id: 'breakfast-standard', name: 'Standard Breakfast', mealType: 'Breakfast',
    lines: [
      d('Assorted Burritos'),
      d('Organic Scrambled Eggs'),
      d('Breakfast Potatoes', { alts: ['Hash Brown Potatoes', 'Organic Home Fries'] }),
      d('Maple Bacon', { alts: ['Crispy Bacon'] }),
      d('Local Sausage with Thyme', { alts: ['Local Sausage Links', 'Local Turkey Sausage Patties'] }),
      d('Tofu Scramble', { alts: ['“Just” Eggs Scrambled'] }),
      d('Blueberry Pancakes', { alts: ['French Toast', 'Cinnamon Pancakes', 'Buttermilk Pancakes with Warm Syrup'] }),
      d('Fresh Bagels and Cream Cheese'),
      d('Fresh Baked Pastries'),
      d('Fresh Fruits'),
      extra('Selection of Greek and Plain Yogurts'), extra('Individual Assorted Cereals, Muesli, Granola'),
      extra('Assorted Juices'), extra('Freshly Brewed Colombian Coffee'), extra('Espresso Bar'),
    ],
  },
  {
    id: 'lunch-italian', name: 'Italian', mealType: 'Lunch',
    lines: [
      d('Tuscan White Bean Soup', { alts: ['Tomato Cheddar Soup', 'Ten Vegetable Soup'] }),
      SALAD,
      d('Tuna, Chicken and Egg Salad'),
      d('Spaghetti Aglio e Olio', { alts: ['Penne al Pomodoro', 'Fettuccine Alfredo'] }),
      d('Organic Yellow Rice with Vegetables'),
      d('Meatballs Marinara', { alts: ['Chicken Parm'] }),
      d('Black Bean Meatballs', { alts: ['Eggplant Parm'] }),
      d('Creamy Mashed Potatoes'),
      d('Corn on the Cob', { alts: ['Sauteed Broccoli'] }),
      d('Fresh Deli and Cheese Tray'),
      d('Fresh Baked Cookies'),
      d('Fresh Brownies'),
      d('Assorted Fruit'),
    ],
  },
  {
    id: 'lunch-mediterranean', name: 'Mediterranean', mealType: 'Lunch',
    lines: [
      d('Moroccan Lentil Soup', { alts: ['Lentil Soup', 'Mulligatawny Soup'] }),
      SALAD,
      d('Basmati Rice with Dill', { alts: ['Basmati Rice with Vermicelli'] }),
      d('Chicken Kabob'),
      d('Kofta Kabob'),
      d('Falafel'),
      d('Organic Grilled Vegetables'),
      d('Mediterranean Salad'),
      d('Hummus, Tahini, Tzatziki Spreads', { alts: ['Hummus, Tahini, Yogurt with Dill'] }),
      d('Fresh Pita'),
      d('Baklava'),
      d('Fresh Baked Cookies'),
      extra('Rose Water Rice Pudding'), extra('Fried Eggplants'),
    ],
  },
  {
    id: 'lunch-mexican', name: 'Mexican', mealType: 'Lunch',
    lines: [
      d('Ten Vegetable Soup', { alts: ['Black Bean Soup'] }),
      SALAD,
      d('Mexican Rice and Vegetables', { alts: ['Mexican Rice with Vegetables and Tofu', 'Mexican Rice and Beans'] }),
      d('Chicken Fajita'),
      d('Beef Fajita', { alts: ['Carnitas', 'Beef Taco'] }),
      d('Eggplant and Mushroom Fajitas', { alts: ['Vegan Taco Meat (faux meats)'] }),
      d('Sweet Plantains'),
      d('Black Beans', { alts: ['Charro Beans'] }),
      d('Sauteed Onions and Peppers'),
      d('Tortillas', { alts: ['Hard and Soft Taco Shells'] }),
      d('Guacamole, Salsa, Sour Cream, Shredded Cheese'),
      d('Tres Leches'),
      extra('Flan'),
    ],
  },
  {
    id: 'lunch-american', name: 'American (Burgers)', mealType: 'Lunch',
    lines: [
      d('Split Pea Soup', { alts: ['Tuscan White Bean Soup', 'Lentil Soup'] }),
      SALAD,
      d('Grass-Fed Hamburgers'),
      d('Impossible Burgers', { alts: ['Black Bean Burgers'] }),
      d('5 Cheese Jalapeño Mac and Cheese', { alts: ['Five Cheese Mac and Cheese'] }),
      d('Sauteed Portobello Mushrooms'),
      d('Crispy Onions'),
      d('Home-Made Potato Chips'),
      d('Fresh Guacamole'),
      d('Cheese Toppers: Blue, Cheddar, Mozzarella, Swiss'),
      d('Fresh Deli and Sliced Cheeses Selections'),
      d('Fresh Baked Sandwich Rolls, Buns and Brioche'),
      d('Fresh Baked Blondies and Cookies'),
      d('Fresh Berries with Mint'),
      extra('Sliced Tomatoes, Onions and Pickles'),
    ],
  },
  {
    id: 'lunch-indian', name: 'Indian', mealType: 'Lunch',
    lines: [
      SALAD,
      d('Chicken Tikka Masala'),
      d('Chana Masala'),
      d('Mild Coconut Curry Fish'),
      d('Basmati Rice'),
      d('Cumin-Roasted Cauliflower'),
      d('Mango Rice Pudding'),
      d('Cardamom-Spiced Fresh Fruit'),
    ],
  },
  {
    id: 'dinner-proposal', name: 'Dinner (like ENHYPEN)', mealType: 'Dinner',
    lines: [
      slot('Starch', 'Lasagna Bolognese', ['Rigatoni with Sausage and Peas', 'Home Made Lasagna']),
      slot('Starch', 'Faux Chorizo Paella', ['Vegetable Jambalaya', 'Vegetarian Paella']),
      slot('Protein', 'BBQ Chicken', ['Roasted Rosemary Chicken']),
      slot('Protein', 'Braised Pork Ribs', ['Seared Teriyaki Salmon with Bok Choy', 'Braised Beef']),
      slot('Vegetable', 'Organic Roasted Potatoes', ['Roasted Baby Potatoes', 'Creamy Mashed Potatoes']),
      slot('Vegetable', 'Organic Grilled Vegetables', ['Grilled Organic Asparagus and Broccolini']),
      slot('Dessert', 'Belgian Chocolate Cake'),
      slot('Dessert', 'Rainbow Cake', ['Limoncello Cake', 'Red Velvet Cake']),
    ],
  },
  {
    id: 'dinner-slots', name: 'Dinner (empty slots)', mealType: 'Dinner',
    lines: [
      slot('Starch'), slot('Starch'), slot('Protein'), slot('Protein'), slot('Vegetable'), slot('Vegetable'),
      slot('Dessert'), slot('Dessert'),
    ],
  },
  {
    id: 'dinner-comfort', name: 'Comfort Dinner', mealType: 'Dinner',
    lines: [
      slot('Starch', 'Vegetable Jambalaya'),
      slot('Starch', 'Rigatoni with Sausage and Peas'),
      slot('Protein', 'Roasted Rosemary Chicken'),
      slot('Protein', 'Seared Teriyaki Salmon with Bok Choy'),
      slot('Protein', 'Home Made Meatloaf with Gravy'),
      slot('Vegetable', 'Roasted Acorn Squash', ['Roasted Butternut Squash', 'Collard Greens']),
      slot('Vegetable', 'Creamy Mashed Potatoes'),
      slot('Dessert', 'Belgian Chocolate Cake'),
      slot('Dessert', 'Limoncello Cake'),
      slot('Dessert', 'Apple Pie'),
      extra('Fresh Fruit Tray'), extra('French Macarons'),
    ],
  },
];

export const SEED_VENUES: Venue[] = [
  { id: 'rcmh', name: 'Radio City Music Hall', printLabel: 'RCMH' },
  { id: 'barclays', name: 'Barclays Center', printLabel: 'Barclays Center' },
  { id: 'prucenter', name: 'Prudential Center', printLabel: 'PruCenter' },
  { id: 'ubs', name: 'UBS Arena', printLabel: 'UBS Arena' },
  { id: 'pier17', name: 'Pier 17', printLabel: 'Pier 17' },
  { id: 'hulu', name: 'Hulu Theater', printLabel: 'HULU' },
];
