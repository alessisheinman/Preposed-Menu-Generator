import { slugify } from '../model/ids';
import type { Category, Dish, Tag } from '../model/types';
import { DESCRIPTIONS } from './descriptions';

/*
 * Seed dish catalog for client proposals (copied from the kitchen menu catalog, minus kitchen-only equipment,
 * plus the client-facing names used on proposals such as the ENHYPEN menu).: jackmonkeycatering.com menu + every dish from the finished kitchen menus.
 * Where the two name the same dish differently, the kitchen-menu name wins.
 * Suffix codes after "|": V = Vegan, VT = Vegetarian, G = GF  (e.g. "Falafel|V,G").
 * Tags are conservative — only where the kitchen menus print them; edit in the Catalog screen.
 */
const SEED: Record<Category, string[]> = {
  Breakfast: [
    // client-facing names from the ENHYPEN proposal
    'Fresh Baked Pastries', 'Fresh Bagels and Cream Cheese', 'Organic Scrambled Eggs|G', 'Tofu Scramble|V,G',
    'Local Sausage with Thyme|G', 'Assorted Burritos',
    // from the D+D 2026 menu
    'Maple Bacon|G', 'Cinnamon Pancakes', 'Huevos Rancheros|G', 'Hash Brown Potatoes|V,G',
    'Signature Crumb Cakes', 'Scrambled Organic Eggs|G', '“Just” Eggs Scrambled|V,G', 'Hard Boiled Eggs|G',
    'Egg Station|G', 'Shakshuka|VT,G', 'Crispy Bacon|G', 'Canadian Bacon|G', 'Local Sausage Patties|G',
    'Local Sausage Links|G', 'Local Turkey Sausage Patties|G', 'Vegan Sausage|V', 'Breakfast Potatoes|G',
    'Organic Home Fries|V,G', 'Blueberry Pancakes', 'Buttermilk Pancakes with Warm Syrup', 'French Toast',
    'Croissants with Ham and Cheese', 'Breakfast Burritos', 'Quinoa Cakes', 'Baked Beans|V,G', 'Grilled Tomatoes|V,G',
    'Hot Oatmeal|V', 'Assorted Fresh Bagels', 'Assorted Cream Cheese Selections', 'Lox with Capers, Crème Fraiche, Onions',
    'Assorted Jellies, Jams, Preserves', 'Peanut, Cashew and Almond Butter', 'Individual Assorted Cereals, Muesli, Granola',
    'Selection of Sliced Breads', 'Selection of Greek and Plain Yogurts', 'Plain Yogurts', 'Fresh Fruits|V,G',
  ],
  'Beverage/Service': [
    'Espresso Bar', 'Freshly Brewed Colombian Coffee', 'Assorted Juices', 'Selection of Milks and Non-Dairy',
  ],
  Soup: [
    // from the D+D 2026 menu
    'Tomato and Rice Soup|V,G',
    'Lentil Soup|V,G', 'Moroccan Lentil Soup|V,G', 'Mulligatawny Soup|V,G', 'Tuscan White Bean Soup|V,G',
    'Tomato Cheddar Soup|G', 'Ten Vegetable Soup|V,G', 'Chicken Soup with Vegetables', 'Autumn Minestrone|V',
    'Black Bean Soup|V,G', 'Broccoli Cheddar Soup', 'Butternut Squash Soup|V,G', 'Carrot Ginger Soup|V,G',
    'Carrot, Ginger & Artichoke Soup|V,G', 'Chicken Corn Soup', 'Cream of Broccoli Soup', 'Cream of Mushroom Soup',
    'French Onion Cheddar Soup', 'Lobster Bisque', 'Home Made Matzo Ball Soup', 'Miso Soup with Tofu and Scallions|V,G',
    'Mushroom Barley Soup|V', 'Pumpkin Bisque|V,G', 'Split Pea Soup|V,G', 'Sweet Cherry Tomato Soup|V,G', 'Texas Chili|G',
  ],
  Sandwich: [
    // from the D+D 2026 menu
    'Mini Grilled Cheese Sandwiches on Country Bread',
    'Aged Cheddar and Chutney', 'Applewood Smoked Ham and Mustard', 'Arugula, Parmesan, Pine Nuts, Balsamic',
    'Avocado & Parmesan', 'Balsamic Chicken & Avocado', 'BLT', 'Crispy Chicken Cutlet', 'Chicken, Apple and Cranberry',
    'Classic Turkey Club', 'Green Goddess', 'Country Grilled Cheese', 'Grilled Veggie Wrap|V', 'Homemade Falafel Wraps|V',
    'Spinach & Parmesan', 'Tuna Wraps', 'Turkey and Mustard', 'Turkey, Avocado on Pita', 'Turkey Wraps',
  ],
  Salad: [
    'Salad World', 'Fresh Salad Bar Medley', 'Tuna, Chicken and Egg Salad',
    'Homemade Albacore Tuna, Chicken, Home-style Potato & Egg Salad',
    'Mediterranean Salad|V,G', 'Baby Spinach Salad', 'Burrata Salad', 'Chickpea Salad|V,G', 'Cobb Salad', 'Cole Slaw',
    'Grilled Chicken Caesar', 'Grilled Chicken, Spinach and Pine Nuts', 'Hummus and Grilled Veggies|V',
    'Mesclun with Cranberries, Candied Walnuts and Blue Cheese', 'Mesclun with Oranges, Apples and Nuts',
    'Mixed Seasonal Greens|V,G', 'Pasta Primavera (cold)', 'Quinoa Salad with Mint|V,G', 'Roasted Corn Salad|V,G',
    'Three Bean Salad|V,G', 'Yellow and Red Beet Salad|V,G',
  ],
  Pasta: [
    'Lasagna Bolognese',
    // from the D+D 2026 menu
    'Penne alla Vodka', 'Ricotta Ravioli with Toasted Sage|VT', 'Sesame Noodles', 'Vegetable Lo-Mein', 'Stir Fry Noodles with Tofu|V',
    '5 Cheese Jalapeño Mac and Cheese', 'Five Cheese Mac and Cheese',
    'Penne al Pomodoro|V', 'Rigatoni with Sausage and Peas', 'Spaghetti Aglio e Olio|V', 'Fettuccine Alfredo',
    'Home Made Lasagna', '3 Cheese Ravioli with Sage Butter', 'Alfredo Penne with Shitake Mushrooms and Parsley',
    'Baby Spinach Lasagna', 'Asiago Rigatoni', "Bucatini All'Amatriciana", 'Cheese Ravioli with Saffron',
    'Cheese Tortellini with Fresh Tomato and Basil', 'Fettuccine with Creamy Rosemary Sauce', 'Fettuccine ai Porcini',
    'Fresh Spinach and Chicken Ravioli with Organic Kale Pesto', 'Lobster Ravioli', 'Manicotti with Ricotta and Tomato Sauce',
    'Orecchiette with Broccoli Rabe', 'Orecchiette with Organic Peas and Sausage', 'Organic Grilled Veggie Lasagna',
    'Penne with Chicken & Mushroom', 'Penne with Eggplant & Tomato', 'Pesto Lasagna', 'Radicchio & Ricotta Lasagna',
    'Rigatoni with Bolognese Sauce', 'Shrimp Pad Thai', 'Spaghetti alla Carbonara', 'Spaghetti and Meatballs',
  ],
  'Rice/Grains': [
    'Organic Yellow Rice with Vegetables|V,G', 'Faux Chorizo Paella|V,G',
    // from the D+D 2026 menu
    'Wild Rice Pilaf with Vegetable Medley|V,G', 'Jasmine Rice with Cranberries, Tofu and Dill|V,G', 'Yellow Rice with Vegetables', 'Steamed Jasmine Rice|V,G', 'Steamed White Rice|V,G', 'Basmati Rice with Vermicelli', 'Mexican Rice and Beans|V,G', 'Mexican Rice and Vegetables|V,G', 'Pork Fried Rice|G', 'Vegetable Fried Rice|V,G',
    'Basmati Rice|V,G', 'Vegetable Jambalaya|V,G', 'Basmati Rice with Dill|V,G', 'Brown Rice with Vegetables and Tofu|V,G',
    'Wild Rice with Vegetables and Tofu|V,G', 'Wild Rice with Edamame|V,G', 'Mexican Rice with Vegetables and Tofu|V,G',
    'Forbidden Rice with Vegetables and Tofu|V,G', 'Vegetarian Paella|V,G', 'Basmati Brown Rice with Dried Fruit|V,G',
    'Basmati Rice with Cranberries, Dates and Apricots|V,G', 'Black Sticky Rice|V,G', 'Chicken Jambalaya|G',
    'Coconut Basmati Rice|V,G', 'Coconut Jasmine Rice|V,G', 'Farro|V', 'Forbidden Rice|V,G', 'Ginger Curried Fried Rice',
    'Israeli Couscous|V', 'Mahogany Steamed Black Rice|V,G', 'Pumpkin Risotto|G', 'Risotto with Cantaloupe|G',
    'Risotto ai Porcini|G', 'Spanish Paella with Shrimp and Free-Range Chicken|G', 'Spanish Yellow Organic Rice with Veggies|V,G',
    'Steamed Brown Rice|V,G', 'Veggie Couscous|V',
  ],
  Chicken: [
    // from the D+D 2026 menu
    'Kung Pao Chicken', 'Orange Ginger Chicken', 'Chicken and Broccoli',
    'Chicken Kabob|G', 'Grilled Chicken Paillard with Tomatoes and Arugula|G', 'Roasted Rosemary Chicken|G',
    'Free-Range Roasted Rosemary Chicken|G', 'Chicken Parm', 'Chicken Pot Pie', 'Chicken Fajita|G', 'BBQ Chicken|G',
    'Grilled Chicken Breasts with Grilled Veggies|G', 'Chicken Alfredo', 'Chicken Cacciatore|G', 'Chicken Chimichurri|G',
    'Chicken Cordon Bleu', 'Chicken Cutlets', 'Chicken Marsala', 'Chicken Piccata|G', 'Chicken Pizzaiola',
    'Chicken Roulade with Prosciutto and Mozzarella', 'Chicken Tikka Masala', 'Chicken with Ginger and Veggies|G',
    'Chicken with Prosciutto and Mozzarella', 'Chicken with Apricots, Shitake Mushrooms and Couscous', 'Dijon Chicken|G',
    'Fried Chicken', 'Lemon Chicken|G', 'Moroccan Chicken|G', 'Pulled Chicken|G', 'Tarragon Chicken|G', 'Chicken Fingers',
    'Teriyaki Chicken',
  ],
  'Beef/Pork': [
    'Braised Pork Ribs|G',
    // from the D+D 2026 menu
    'Sloppy Joe|G', 'Beef and Broccoli', 'Black Pepper Sirloin Steak', 'Bourbon Braised Beef', 'Tamari Shredded Pork', 'Vegetable, Chicken, Pork Dumplings', 'Vegetable, Pork, Shrimp Spring Rolls',
    'Grass-Fed Hamburgers|G', 'Kofta Kabob|G', 'Home Made Meatloaf with Gravy', 'Meatloaf', 'Braised Beef|G', 'Seared Skirt Steak with Rosemary|G',
    'Meatballs Marinara|G', 'Carnitas|G', 'Beef Taco|G', 'Beef Fajita|G', 'Hamburgers',
    'Beef Stew with Organic Potatoes and Carrots|G', 'Brisket|G', 'Rib-Eye|G', 'Filet Mignon in Hoisin Sauce',
    'Filet Mignon with Rosemary|G', 'Swedish Meatballs', 'Marinated Sliced Skirt Steak|G', "Shepherd's Pie",
    'Beef Tenderloin|G', 'Filet with Balsamic Reduction|G', 'Prime Rib|G', 'Texas Beef Chili|G', 'Pork Chops|G',
    'Pork Loin with Aromatic Spices|G', 'Pork Loin with Mushrooms|G', 'Pulled Pork|G', 'Roasted Rosemary Pork Loin|G',
  ],
  Fish: [
    'Seared Salmon with Spinach|G', 'Organic Seared Wild King Salmon with Spinach|G', 'Seared Teriyaki Salmon with Bok Choy|G',
    'Salmon Teriyaki|G', 'Miso Glazed Cod Fish with Bok Choy|G', 'Tilapia with Capers and Lemon', 'Mild Coconut Curry Fish', 'Chilean Sea Bass with Miso|G',
    'Coconut Crusted Salmon', 'Crab Cakes', 'Grilled Salmon with Lemon Butter and Capers|G', 'Mahi-Mahi|G',
    'Panko Crusted Salmon Fillets with Horseradish Sauce', 'Poached Salmon|G', 'Rosemary Infused Cod|G',
    'Sea Bass with Tomato and Capers|G', 'Seared Tuna|G', "Slammin' Salmon (Cajun Spices)|G", 'Sweet Chili Salmon',
    'Tilapia Meuniere', 'Tilapia with Chive Oil and Capers|G', 'Tilapia with Corn Salsa|G', 'Tuna Steaks|G',
  ],
  'Vegetarian Main': [
    // from the D+D 2026 menu
    'Vegan Taco Meat (faux meats)|V,G', 'Eggplant and Mushroom Fajitas|V,G', 'Tofu Steaks with Hoisin Sauce|V,G',
    'Impossible Burgers|V,G', 'Black Bean Burgers|V,G', 'Chana Masala|V,G', 'Falafel|V,G', 'Eggplant Parm|VT', 'Black Bean Meatballs|V,G', 'BBQ Tofu|V,G', 'Vegan Stuffed Tomatoes|V,G',
  ],
  Vegetable: [
    'Organic Roasted Potatoes|V,G',
    // from the D+D 2026 menu
    'Cauliflower in Garlic Sauce|V,G', 'Eggplants with Garlic Sauce', 'Super Greens', 'Grilled Organic Bok Choy', 'Vegetable Stir Fry', 'Charro Beans|V,G', 'Crispy Brussels Sprouts|V,G', "Baked Potato Bar with the Fixin's",
    'Sauteed Portobello Mushrooms|V,G', 'Crispy Onions|V', 'Home-Made Potato Chips|V,G', 'Cumin-Roasted Cauliflower|V,G',
    'Organic Grilled Vegetables|V,G', 'Fried Eggplants|V,G', 'Roasted Acorn Squash|V,G', 'Roasted Butternut Squash|V,G',
    'Grilled Organic Asparagus and Broccolini|V,G', 'Creamy Mashed Potatoes|G', 'Mashed Potatoes|G', 'Sauteed Broccoli|V,G',
    'Sauteed Broccoli with Garlic|V,G', 'Steamed Broccoli|V,G', 'Collard Greens|V,G', 'Carrots and Zucchini|V,G',
    'Roasted Baby Potatoes|V,G', 'Sweet Plantains|V,G', 'Black Beans|V,G', 'Baked Sweet Potatoes|V,G', 'Baked Potatoes|V,G',
    'Broccolini|V,G', 'Butternut Squash with Ricotta Salata|G', 'Corn on the Cob|V,G', 'Creamed Spinach|G',
    'Creamy Parsnip Puree|G', 'Crispy Kale|V,G', 'Curried Cauliflower with Tahini|V,G', 'Grilled Asparagus|V,G',
    'Grilled Zucchini|V,G', 'Haricot Vert|V,G', 'Lyonnaise Potatoes|G', 'Mashed Sweet Potatoes|G', 'Potatoes Au Gratin|G',
    'Refried Beans|G', 'Roasted Brussels Sprouts|V,G', 'Roasted Cauliflower|V,G', 'Roasted Heirloom Potatoes|V,G',
    'Sauteed Broccoli Rabe|V,G', 'Sauteed Kale|V,G', 'Sauteed Onions and Peppers|V,G', 'Sauteed Spinach|V,G',
    'Smashed Potatoes|V,G', 'Steak Fries|V', 'Steamed Carrots|V,G', 'Steamed Zucchini|V,G', 'String Beans Almandine|G',
    'Stuffed Tomatoes with Minced Meat|G',
  ],
  'Spread/Bread': [
    // from the D+D 2026 menu
    'Hard and Soft Taco Shells', 'Fresh Baked Breads with GF Options', 'Guacamole, Salsa, Sour Cream, Shredded Cheese',
    'Fresh Guacamole|V,G', 'Cheese Toppers: Blue, Cheddar, Mozzarella, Swiss', 'Sliced Tomatoes, Onions and Pickles|V,G',
    'Fresh Deli and Sliced Cheeses Selections', 'Fresh Baked Sandwich Rolls, Buns and Brioche',
    'Hummus, Tahini, Yogurt with Dill|G', 'Hummus, Tahini, Tzatziki Spreads|G', 'Fresh Pita|V', 'Tortillas|V',
    'Deli and Cheese Tray', 'Fresh Deli and Cheese Tray',
  ],
  Dessert: [
    'Fresh Baked Cookies', 'Fresh Brownies', 'Assorted Fruit|V,G', 'Rainbow Cake',
    // from the D+D 2026 menu
    'Lemon Bars', 'Chocolate Chip Cookies', 'Fresh Baked Sugar Cookies', 'Fresh Baked Crumb Cake', 'Brownies', 'Chocolate Cake', 'Black Forest Cake', 'Orange Cake', 'Mango Ice Cream', 'Sliced Watermelon|V,G', 'Pineapple and Oranges|V,G', 'Lychees|V,G',
    'Fresh Baked Blondies and Cookies', 'Fresh Berries with Mint|V,G', 'Mango Rice Pudding', 'Cardamom-Spiced Fresh Fruit',
    'Fresh Cookies', 'Fresh Cookies and Brownies', 'Fresh Blondies and Brownies', 'Baklava', 'French Macarons|G',
    'Belgian Chocolate Cake', 'Limoncello Cake', 'Red Velvet Cake', 'Cheesecake', 'Apple Pie', 'Blueberry Pie',
    'Berry Trifle', 'Chocolate Salted Caramel Trifle', 'Banana Cream Pie Trifle', 'Flan|G', 'Tres Leches',
    'Fresh Fruit Tray|V,G', 'Alfajores', 'Fresh Pies', 'Fresh Biscotti', 'Cannolis', 'Cannoli Cake', 'Chocolate Mousse Cake',
    'Coconut Macaroons|G', 'Crack Pie', 'Cupcakes', 'Dulce de Leche Cake', 'Éclairs', 'French Almond Macaroons|G',
    'Lemon Mousse Cake', 'Meringues with Whipped Cream|G', 'Rose Water Rice Pudding|G', 'Rugelach', 'Home-Made Tiramisu',
  ],
};

const TAG_CODES: Record<string, Tag> = { V: 'Vegan', VT: 'Vegetarian', G: 'GF' };

export function parseSeedEntry(entry: string, category: Category): Dish {
  const [name, codes = ''] = entry.split('|');
  const tags = codes.split(',').filter(Boolean).map((c) => {
    const tag = TAG_CODES[c.trim()];
    if (!tag) throw new Error(`Unknown tag code "${c}" in "${entry}"`);
    return tag;
  });
  return { id: slugify(name), name: name.trim(), category, tags, description: DESCRIPTIONS[name.trim()] ?? '' };
}

export const SEED_DISHES: Dish[] = (Object.entries(SEED) as [Category, string[]][]).flatMap(([category, entries]) =>
  entries.map((e) => parseSeedEntry(e, category)),
);
