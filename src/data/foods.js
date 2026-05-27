// Comprehensive food database — macros are per 100g of the edible portion.
// For fixed-serving items (fast food, protein bars) the 'serving' field reflects
// the real-world portion; the per100g values are derived from that.
// Tags: 'high-protein' | 'lean' | 'whole-food' | 'fast-food' | 'sams-club' | 'snack' | 'vegan' | 'low-carb'

export const FOOD_CATEGORIES = {
  protein:    { label: 'Proteins',       emoji: '🥩' },
  habesha:    { label: 'Habesha Food',   emoji: '🇪🇷' },
  carb:       { label: 'Grains & Carbs', emoji: '🌾' },
  fruit:      { label: 'Fruits',         emoji: '🍎' },
  vegetable:  { label: 'Vegetables',     emoji: '🥦' },
  dairy:      { label: 'Dairy',          emoji: '🥛' },
  fat:        { label: 'Fats & Nuts',    emoji: '🥑' },
  fast_food:  { label: 'Fast Food',      emoji: '🍔' },
  snack:      { label: 'Snacks',         emoji: '🍫' },
  drink:      { label: 'Drinks',         emoji: '🥤' },
}

function food(id, name, brand, category, emoji, servingG, kcal, protein, carbs, fat, fiber, tags = []) {
  return {
    id, name, brand, category, emoji,
    serving: { amount: servingG, unit: 'g', label: `${servingG}g` },
    per100g: { kcal, protein, carbs, fat, fiber },
    tags,
  }
}

// Household-portion helper — adds rough real-world measures (great for home-cooked
// & ethnic dishes you don't weigh). portions = [{ label, grams }]
function withPortions(foodObj, portions) {
  return { ...foodObj, portions, serving: { amount: portions[0].grams, unit: 'g', label: portions[0].label } }
}

// Serving-based helper — you pass macros PER SERVING (as published on menus/labels)
// and it back-computes per-100g. Ideal for fast food & packaged items.
function servingFood(id, name, brand, category, emoji, servingG, kcal, protein, carbs, fat, fiber, tags = []) {
  const r = 100 / servingG
  return {
    id, name, brand, category, emoji,
    serving: { amount: servingG, unit: 'g', label: `1 serving` },
    per100g: { kcal: +(kcal*r).toFixed(1), protein: +(protein*r).toFixed(1), carbs: +(carbs*r).toFixed(1), fat: +(fat*r).toFixed(1), fiber: +(fiber*r).toFixed(1) },
    tags,
    portions: [{ label: '1 serving', grams: servingG }, { label: '½ serving', grams: Math.round(servingG/2) }, { label: '2 servings', grams: servingG*2 }],
  }
}

// ─── PROTEINS ────────────────────────────────────────────────────────────────
const PROTEINS = [
  food('chicken_breast',        'Chicken Breast (cooked)',         null,       'protein', '🍗', 100, 165, 31.0,  0.0, 3.6,  0.0, ['high-protein','lean','whole-food']),
  food('chicken_thigh',         'Chicken Thigh (cooked)',          null,       'protein', '🍗', 100, 209, 26.0,  0.0,11.0,  0.0, ['high-protein','whole-food']),
  food('chicken_ground',        'Ground Chicken (cooked)',         null,       'protein', '🍗', 100, 187, 26.0,  0.0, 9.0,  0.0, ['high-protein','whole-food']),
  food('rotisserie_breast',     'Rotisserie Chicken Breast',       null,       'protein', '🍗', 100, 174, 27.0,  0.0, 7.0,  0.0, ['high-protein','whole-food']),
  food('rotisserie_thigh',      'Rotisserie Chicken Thigh',        null,       'protein', '🍗', 100, 198, 23.0,  0.0,11.0,  0.0, ['whole-food']),
  food('kirkland_rotisserie',   'Kirkland Rotisserie Chicken',     'Kirkland', 'protein', '🍗', 100, 174, 27.0,  0.0, 7.0,  0.0, ['high-protein','sams-club']),
  food('kirkland_chicken_frz',  'Kirkland Frozen Chicken Breast',  'Kirkland', 'protein', '🍗', 100, 110, 23.0,  0.0, 2.0,  0.0, ['high-protein','lean','sams-club']),
  food('ground_beef_80',        'Ground Beef 80/20 (cooked)',      null,       'protein', '🥩', 100, 254, 26.0,  0.0,17.0,  0.0, ['high-protein','whole-food']),
  food('ground_beef_90',        'Ground Beef 90/10 (cooked)',      null,       'protein', '🥩', 100, 218, 28.0,  0.0,10.0,  0.0, ['high-protein','lean','whole-food']),
  food('kirkland_ground_beef',  'Kirkland Ground Beef 80/20',      'Kirkland', 'protein', '🥩', 100, 254, 17.0,  0.0,20.0,  0.0, ['sams-club']),
  food('sirloin',               'Sirloin Steak (cooked)',          null,       'protein', '🥩', 100, 207, 30.0,  0.0, 9.0,  0.0, ['high-protein','lean','whole-food']),
  food('ribeye',                'Ribeye Steak (cooked)',           null,       'protein', '🥩', 100, 291, 24.0,  0.0,21.0,  0.0, ['high-protein','whole-food']),
  food('salmon_atlantic',       'Atlantic Salmon (cooked)',        null,       'protein', '🐟', 100, 208, 20.0,  0.0,13.0,  0.0, ['high-protein','whole-food']),
  food('kirkland_salmon',       'Kirkland Salmon Fillet',          'Kirkland', 'protein', '🐟', 100, 161, 22.0,  0.0, 8.0,  0.0, ['high-protein','sams-club']),
  food('canned_tuna',           'Tuna (canned in water)',          null,       'protein', '🐟', 100, 116, 26.0,  0.0, 1.0,  0.0, ['high-protein','lean','whole-food']),
  food('canned_salmon',         'Salmon (canned)',                 null,       'protein', '🐟', 100, 139, 22.0,  0.0, 5.0,  0.0, ['high-protein','whole-food']),
  food('tilapia',               'Tilapia (cooked)',                null,       'protein', '🐟', 100, 128, 26.0,  0.0, 3.0,  0.0, ['high-protein','lean','whole-food']),
  food('cod',                   'Cod (cooked)',                    null,       'protein', '🐟', 100, 105, 23.0,  0.0, 0.9,  0.0, ['high-protein','lean','whole-food']),
  food('shrimp',                'Shrimp (cooked)',                 null,       'protein', '🦐', 100,  99, 24.0,  0.0, 0.3,  0.0, ['high-protein','lean','whole-food']),
  food('kirkland_shrimp',       'Kirkland Cooked Shrimp',          'Kirkland', 'protein', '🦐', 100,  99, 24.0,  0.0, 0.5,  0.0, ['high-protein','lean','sams-club']),
  food('eggs_whole',            'Eggs (whole)',                    null,       'protein', '🥚', 100, 155, 13.0,  1.1,11.0,  0.0, ['high-protein','whole-food']),
  food('egg_whites',            'Egg Whites',                     null,       'protein', '🥚', 100,  52, 11.0,  0.7, 0.2,  0.0, ['high-protein','lean','whole-food']),
  food('kirkland_eggs',         'Kirkland Organic Eggs',           'Kirkland', 'protein', '🥚', 100, 155, 13.0,  1.1,11.0,  0.0, ['sams-club','whole-food']),
  food('turkey_deli',           'Turkey Breast (deli)',            null,       'protein', '🦃', 100, 104, 18.0,  2.0, 2.5,  0.0, ['high-protein','lean']),
  food('ham_deli',              'Ham (deli)',                      null,       'protein', '🐷', 100, 113, 14.0,  4.0, 4.5,  0.0, ['high-protein']),
  food('bacon',                 'Bacon (cooked)',                  null,       'protein', '🥓', 100, 541, 37.0,  1.4,42.0,  0.0, ['high-protein','low-carb']),
  food('pork_chop',             'Pork Chop (cooked)',              null,       'protein', '🥩', 100, 231, 27.0,  0.0,13.0,  0.0, ['high-protein','whole-food']),
  food('pork_tenderloin',       'Pork Tenderloin (cooked)',        null,       'protein', '🥩', 100, 166, 29.0,  0.0, 4.5,  0.0, ['high-protein','lean','whole-food']),
  food('italian_sausage',       'Italian Sausage (cooked)',        null,       'protein', '🌭', 100, 344, 14.0,  4.0,31.0,  0.0, []),
  food('ground_turkey',         'Ground Turkey (cooked)',          null,       'protein', '🦃', 100, 167, 21.0,  0.0, 9.0,  0.0, ['high-protein','lean','whole-food']),
  food('kirkland_ground_turkey','Kirkland Ground Turkey',          'Kirkland', 'protein', '🦃', 100, 167, 21.0,  0.0, 9.0,  0.0, ['high-protein','lean','sams-club']),
  food('tofu_firm',             'Tofu (firm)',                     null,       'protein', '🫘', 100,  76,  8.0,  1.9, 4.0,  0.3, ['high-protein','vegan','whole-food']),
  food('tempeh',                'Tempeh',                         null,       'protein', '🫘', 100, 193, 19.0,  9.0,11.0,  0.0, ['high-protein','vegan','whole-food']),
  food('edamame',               'Edamame (shelled)',               null,       'protein', '🫘', 100, 122, 11.0, 10.0, 5.0,  5.0, ['high-protein','vegan','whole-food']),
  food('black_beans',           'Black Beans (cooked)',            null,       'protein', '🫘', 100, 132,  8.9, 24.0, 0.5,  8.7, ['vegan','whole-food']),
  food('chickpeas',             'Chickpeas (cooked)',              null,       'protein', '🫘', 100, 164,  8.9, 27.0, 2.6,  7.6, ['vegan','whole-food']),
  food('lentils',               'Lentils (cooked)',                null,       'protein', '🫘', 100, 116,  9.0, 20.0, 0.4,  7.9, ['vegan','whole-food']),
  food('whey_protein',          'Whey Protein Powder',             null,       'protein', '🧴', 30,  120, 24.0,  3.0, 1.5,  0.5, ['high-protein','lean','snack']),
]

// ─── GRAINS & CARBS ────────────────────────────────────────────────────────────
const CARBS = [
  food('white_rice',            'White Rice (cooked)',             null, 'carb', '🍚', 100, 130, 2.7, 28.0, 0.3, 0.4, ['whole-food','vegan']),
  food('brown_rice',            'Brown Rice (cooked)',             null, 'carb', '🍚', 100, 111, 2.6, 23.0, 0.9, 1.8, ['whole-food','vegan']),
  food('members_brown_rice',    'Member\'s Mark Organic Brown Rice','Member\'s Mark','carb','🍚',100,111,2.6,23.0,0.9,1.8,['sams-club','vegan']),
  food('oats_dry',              'Rolled Oats (dry)',               null, 'carb', '🌾', 40,  156, 6.7, 26.4, 2.8, 4.0, ['whole-food','vegan']),
  food('oatmeal',               'Oatmeal (cooked)',                null, 'carb', '🌾', 240,  71, 2.5, 12.0, 1.4, 1.7, ['whole-food','vegan']),
  food('pasta_white',           'Pasta (cooked)',                  null, 'carb', '🍝', 100, 158, 5.8, 31.0, 0.9, 1.8, ['whole-food','vegan']),
  food('pasta_wholewheat',      'Whole Wheat Pasta (cooked)',      null, 'carb', '🍝', 100, 124, 5.3, 26.0, 0.5, 3.9, ['whole-food','vegan']),
  food('white_bread',           'White Bread',                     null, 'carb', '🍞',  30, 265, 9.0, 49.0, 3.2, 2.7, ['vegan']),
  food('wheat_bread',           'Whole Wheat Bread',               null, 'carb', '🍞',  30, 247,13.0, 41.0, 4.2, 7.0, ['vegan']),
  food('kirkland_bread',        'Kirkland Whole Grain Bread',      'Kirkland','carb','🍞',40,100,4.0,18.0,1.5,3.0,['sams-club','vegan']),
  food('sweet_potato',          'Sweet Potato (cooked)',           null, 'carb', '🍠', 100,  90, 2.0, 21.0, 0.1, 3.3, ['whole-food','vegan']),
  food('white_potato',          'White Potato (baked)',            null, 'carb', '🥔', 100,  93, 2.5, 21.0, 0.1, 2.1, ['whole-food','vegan']),
  food('quinoa',                'Quinoa (cooked)',                 null, 'carb', '🌾', 100, 120, 4.4, 22.0, 1.9, 2.8, ['whole-food','vegan']),
  food('members_quinoa',        'Member\'s Mark Organic Quinoa',  'Member\'s Mark','carb','🌾',100,368,14.0,64.0,6.0,7.0,['sams-club','vegan']),
  food('tortilla_flour',        'Flour Tortilla (10")',            null, 'carb', '🫓',  70, 218, 6.0, 40.0, 4.5, 2.0, ['vegan']),
  food('tortilla_corn',         'Corn Tortilla (6")',              null, 'carb', '🫓',  28,  60, 1.5, 12.0, 0.7, 1.5, ['vegan']),
  food('corn',                  'Corn Kernels',                   null, 'carb', '🌽', 100,  96, 3.4, 21.0, 1.5, 2.4, ['whole-food','vegan']),
  food('granola',               'Granola',                        null, 'carb', '🌾',  50, 236, 5.5, 32.0,10.0, 3.5, []),
  food('english_muffin',        'English Muffin',                 null, 'carb', '🍞',  57, 134, 5.0, 26.0, 1.0, 2.0, ['vegan']),
  food('bagel',                 'Bagel (plain)',                   null, 'carb', '🥯',  98, 270,10.0, 53.0, 1.5, 2.3, ['vegan']),
  food('rice_cakes',            'Rice Cakes',                     null, 'carb', '🌾',  10,  35, 0.7,  7.3, 0.3, 0.4, ['vegan','snack']),
]

// ─── FRUITS ───────────────────────────────────────────────────────────────────
const FRUITS = [
  food('banana',            'Banana',           null, 'fruit', '🍌', 120,  89, 1.1, 23.0, 0.3, 2.6, ['whole-food','vegan']),
  food('apple',             'Apple',            null, 'fruit', '🍎', 182,  52, 0.3, 14.0, 0.2, 2.4, ['whole-food','vegan']),
  food('orange',            'Orange',           null, 'fruit', '🍊', 131,  47, 0.9, 12.0, 0.1, 2.4, ['whole-food','vegan']),
  food('grapes',            'Grapes',           null, 'fruit', '🍇', 100,  69, 0.7, 18.0, 0.2, 0.9, ['whole-food','vegan']),
  food('strawberries',      'Strawberries',     null, 'fruit', '🍓', 100,  32, 0.7,  7.7, 0.3, 2.0, ['whole-food','vegan']),
  food('blueberries',       'Blueberries',      null, 'fruit', '🫐', 100,  57, 0.7, 14.0, 0.3, 2.4, ['whole-food','vegan']),
  food('kirkland_blueberries','Kirkland Frozen Blueberries','Kirkland','fruit','🫐',100,57,0.7,14.0,0.3,2.4,['sams-club','vegan']),
  food('kirkland_strawberries','Kirkland Frozen Strawberries','Kirkland','fruit','🍓',100,32,0.7,7.7,0.3,2.0,['sams-club','vegan']),
  food('mango',             'Mango',            null, 'fruit', '🥭', 100,  60, 0.8, 15.0, 0.4, 1.6, ['whole-food','vegan']),
  food('pineapple',         'Pineapple',        null, 'fruit', '🍍', 100,  50, 0.5, 13.0, 0.1, 1.4, ['whole-food','vegan']),
  food('watermelon',        'Watermelon',       null, 'fruit', '🍉', 100,  30, 0.6,  7.6, 0.2, 0.4, ['whole-food','vegan']),
  food('peach',             'Peach',            null, 'fruit', '🍑', 100,  39, 0.9, 10.0, 0.3, 1.5, ['whole-food','vegan']),
  food('cherries',          'Cherries',         null, 'fruit', '🍒', 100,  63, 1.1, 16.0, 0.2, 2.1, ['whole-food','vegan']),
  food('raspberries',       'Raspberries',      null, 'fruit', '🫐', 100,  52, 1.2, 12.0, 0.7, 6.5, ['whole-food','vegan']),
  food('avocado',           'Avocado',          null, 'fat',   '🥑', 150, 160, 2.0,  9.0,15.0, 6.7, ['whole-food','vegan','low-carb']),
]

// ─── VEGETABLES ───────────────────────────────────────────────────────────────
const VEGETABLES = [
  food('broccoli',          'Broccoli',           null, 'vegetable', '🥦', 100,  34, 2.8,  7.0, 0.4, 2.6, ['whole-food','vegan']),
  food('spinach',           'Spinach',            null, 'vegetable', '🌿', 100,  23, 2.9,  3.6, 0.4, 2.2, ['whole-food','vegan']),
  food('kirkland_spinach',  'Kirkland Organic Baby Spinach','Kirkland','vegetable','🌿',100,23,2.9,3.6,0.4,2.2,['sams-club','vegan']),
  food('kale',              'Kale',               null, 'vegetable', '🥬', 100,  49, 4.3,  9.0, 0.9, 3.6, ['whole-food','vegan']),
  food('carrots',           'Carrots',            null, 'vegetable', '🥕', 100,  41, 0.9, 10.0, 0.2, 2.8, ['whole-food','vegan']),
  food('bell_pepper_red',   'Bell Pepper (red)',  null, 'vegetable', '🫑', 100,  31, 1.0,  6.0, 0.3, 2.1, ['whole-food','vegan']),
  food('bell_pepper_green', 'Bell Pepper (green)',null, 'vegetable', '🫑', 100,  20, 0.9,  4.6, 0.2, 1.7, ['whole-food','vegan']),
  food('cucumber',          'Cucumber',           null, 'vegetable', '🥒', 100,  15, 0.6,  3.6, 0.1, 0.5, ['whole-food','vegan']),
  food('tomato',            'Tomato',             null, 'vegetable', '🍅', 100,  18, 0.9,  3.9, 0.2, 1.2, ['whole-food','vegan']),
  food('lettuce',           'Lettuce (romaine)',  null, 'vegetable', '🥗', 100,  17, 1.2,  3.3, 0.3, 2.1, ['whole-food','vegan']),
  food('onion',             'Onion',              null, 'vegetable', '🧅', 100,  40, 1.1,  9.3, 0.1, 1.7, ['whole-food','vegan']),
  food('garlic',            'Garlic',             null, 'vegetable', '🧄',  10, 149, 6.4, 33.1, 0.5, 2.1, ['whole-food','vegan']),
  food('green_beans',       'Green Beans',        null, 'vegetable', '🌿', 100,  31, 1.8,  7.0, 0.2, 2.7, ['whole-food','vegan']),
  food('asparagus',         'Asparagus',          null, 'vegetable', '🌿', 100,  20, 2.2,  3.9, 0.1, 2.1, ['whole-food','vegan']),
  food('zucchini',          'Zucchini',           null, 'vegetable', '🥒', 100,  17, 1.2,  3.1, 0.3, 1.0, ['whole-food','vegan']),
  food('mushroom',          'Mushrooms',          null, 'vegetable', '🍄', 100,  22, 3.1,  3.3, 0.3, 1.0, ['whole-food','vegan']),
  food('celery',            'Celery',             null, 'vegetable', '🌿', 100,  16, 0.7,  3.0, 0.2, 1.6, ['whole-food','vegan']),
  food('cauliflower',       'Cauliflower',        null, 'vegetable', '🥦', 100,  25, 2.0,  5.0, 0.3, 2.0, ['whole-food','vegan']),
  food('cabbage',           'Cabbage',            null, 'vegetable', '🥬', 100,  25, 1.3,  5.8, 0.1, 2.5, ['whole-food','vegan']),
  food('edamame_veg',       'Edamame (pods)',     null, 'vegetable', '🫘', 100,  94, 9.2,  8.1, 4.7, 5.2, ['whole-food','vegan']),
  food('mixed_greens',      'Mixed Greens',       null, 'vegetable', '🥗', 100,  20, 2.0,  3.6, 0.3, 2.0, ['whole-food','vegan']),
]

// ─── DAIRY ────────────────────────────────────────────────────────────────────
const DAIRY = [
  food('greek_yogurt_0',      'Greek Yogurt 0% (plain)',      null,       'dairy', '🥛', 170,  59,10.0, 3.6, 0.4, 0.0, ['high-protein','lean']),
  food('greek_yogurt_full',   'Greek Yogurt (full fat)',      null,       'dairy', '🥛', 170,  97, 9.0, 3.6, 5.0, 0.0, ['high-protein']),
  food('kirkland_greek_yog',  'Kirkland Greek Yogurt',        'Kirkland', 'dairy', '🥛', 170,  81,10.0, 8.0, 1.0, 0.0, ['high-protein','sams-club']),
  food('cottage_cheese_2',    'Cottage Cheese 2%',            null,       'dairy', '🥛', 226,  86,12.0, 4.0, 2.3, 0.0, ['high-protein','lean']),
  food('cottage_cheese_4',    'Cottage Cheese 4%',            null,       'dairy', '🥛', 226,  98,11.0, 3.4, 4.3, 0.0, ['high-protein']),
  food('milk_whole',          'Whole Milk',                   null,       'dairy', '🥛', 240,  61, 3.2, 4.8, 3.3, 0.0, []),
  food('milk_2pct',           '2% Milk',                     null,       'dairy', '🥛', 240,  50, 3.4, 4.8, 2.0, 0.0, []),
  food('milk_skim',           'Skim Milk',                   null,       'dairy', '🥛', 240,  34, 3.4, 4.8, 0.2, 0.0, ['lean']),
  food('kirkland_milk',       'Kirkland Organic Milk',        'Kirkland', 'dairy', '🥛', 240,  61, 3.2, 4.8, 3.3, 0.0, ['sams-club']),
  food('kirkland_almond_milk','Kirkland Almond Milk',         'Kirkland', 'dairy', '🥛', 240,  13, 0.4, 0.6, 1.0, 0.5, ['sams-club','vegan','lean']),
  food('cheddar_cheese',      'Cheddar Cheese',              null,       'dairy', '🧀',  28, 402,25.0, 1.3,33.0, 0.0, ['high-protein','low-carb']),
  food('mozzarella',          'Mozzarella',                  null,       'dairy', '🧀',  28, 280,28.0, 2.2,17.0, 0.0, ['high-protein','low-carb']),
  food('kirkland_cheese',     'Kirkland Cheese Slices',       'Kirkland', 'dairy', '🧀',  28, 402,25.0, 1.3,33.0, 0.0, ['sams-club','low-carb']),
  food('string_cheese',       'String Cheese',               null,       'dairy', '🧀',  28, 284,24.0, 2.0,20.0, 0.0, ['high-protein','snack','low-carb']),
  food('cream_cheese',        'Cream Cheese',                null,       'dairy', '🧀',  30, 342, 6.0, 4.0,34.0, 0.0, ['low-carb']),
  food('chocolate_milk',      'Chocolate Milk',              null,       'dairy', '🥛', 240,  83, 3.4,12.0, 2.5, 0.5, []),
]

// ─── FATS & NUTS ──────────────────────────────────────────────────────────────
const FATS = [
  food('almonds',           'Almonds',             null,       'fat', '🌰',  28, 579,21.0,22.0,50.0, 12.5, ['whole-food','vegan','snack','low-carb']),
  food('kirkland_almonds',  'Kirkland Almonds',    'Kirkland', 'fat', '🌰',  28, 579,21.0,22.0,50.0, 12.5, ['sams-club','vegan','snack','low-carb']),
  food('walnuts',           'Walnuts',             null,       'fat', '🌰',  28, 654,15.0,14.0,65.0,  6.7, ['whole-food','vegan','snack']),
  food('cashews',           'Cashews',             null,       'fat', '🌰',  28, 553,18.0,30.0,44.0,  3.3, ['whole-food','vegan','snack']),
  food('peanuts',           'Peanuts',             null,       'fat', '🥜',  28, 567,26.0,16.0,49.0,  8.5, ['whole-food','vegan','snack']),
  food('mixed_nuts',        'Mixed Nuts',          null,       'fat', '🌰',  28, 607,20.0,21.0,55.0,  5.0, ['whole-food','vegan','snack']),
  food('kirkland_mixed_nuts','Kirkland Mixed Nuts','Kirkland', 'fat', '🌰',  28, 607,16.0,22.0,54.0,  5.0, ['sams-club','vegan','snack']),
  food('kirkland_trail_mix','Kirkland Trail Mix',  'Kirkland', 'fat', '🌰',  40, 508,11.0,57.0,28.0,  5.0, ['sams-club','vegan','snack']),
  food('peanut_butter',     'Peanut Butter',       null,       'fat', '🥜',  32, 588,25.0,20.0,50.0,  6.0, ['vegan','snack','low-carb']),
  food('kirkland_pb',       'Kirkland Peanut Butter','Kirkland','fat','🥜',  32, 588,25.0,20.0,50.0,  6.0, ['sams-club','vegan']),
  food('almond_butter',     'Almond Butter',       null,       'fat', '🌰',  32, 614,21.0,18.0,56.0,  4.0, ['vegan','snack','low-carb']),
  food('olive_oil',         'Olive Oil',           null,       'fat', '🫒',  15, 884, 0.0, 0.0,100.0, 0.0, ['whole-food','vegan','low-carb']),
  food('kirkland_olive_oil','Kirkland Extra Virgin Olive Oil','Kirkland','fat','🫒',15,884,0.0,0.0,100.0,0.0,['sams-club','vegan','low-carb']),
  food('coconut_oil',       'Coconut Oil',         null,       'fat', '🥥',  14, 892, 0.0, 0.0,100.0, 0.0, ['vegan','low-carb']),
  food('butter',            'Butter',              null,       'fat', '🧈',  14, 717, 0.9, 0.1, 81.0, 0.0, ['low-carb']),
  food('kirkland_hummus',   'Member\'s Mark Hummus','Member\'s Mark','fat','🫘',60,166,7.0,14.0,9.5,3.0,['sams-club','vegan']),
  food('kirkland_guac',     'Member\'s Mark Guacamole','Member\'s Mark','fat','🥑',60,164,2.0,10.0,14.0,4.0,['sams-club','vegan','low-carb']),
]

// ─── FAST FOOD — McDONALD'S ───────────────────────────────────────────────────
const MCDONALDS = [
  // Using actual item weight for servingG, deriving per100g from that
  food('mc_big_mac',          'Big Mac',                    'McDonald\'s', 'fast_food', '🍔', 215, 256, 11.6, 20.9, 14.0, 1.4, ['fast-food']),
  food('mc_mcdouble',         'McDouble',                   'McDonald\'s', 'fast_food', '🍔', 175, 229, 12.6, 20.0, 11.4, 1.1, ['fast-food']),
  food('mc_mcchicken',        'McChicken',                  'McDonald\'s', 'fast_food', '🍔', 148, 270,  9.5, 27.7, 12.8, 1.3, ['fast-food']),
  food('mc_qpc',              'Quarter Pounder w/ Cheese',  'McDonald\'s', 'fast_food', '🍔', 203, 256, 14.8, 21.2, 12.8, 1.5, ['fast-food']),
  food('mc_crispy',           'McChicken Crispy Deluxe',    'McDonald\'s', 'fast_food', '🍔', 236, 236,  9.7, 22.9, 11.4, 1.0, ['fast-food']),
  food('mc_fries_med',        'French Fries (Medium)',      'McDonald\'s', 'fast_food', '🍟', 117, 274,  3.4, 36.8, 12.8, 3.4, ['fast-food']),
  food('mc_fries_large',      'French Fries (Large)',       'McDonald\'s', 'fast_food', '🍟', 154, 318,  4.5, 42.9, 14.9, 4.0, ['fast-food']),
  food('mc_nuggets_10',       '10pc Chicken McNuggets',     'McDonald\'s', 'fast_food', '🍗', 162, 259, 13.6, 16.0, 16.0, 1.2, ['fast-food']),
  food('mc_nuggets_6',        '6pc Chicken McNuggets',      'McDonald\'s', 'fast_food', '🍗',  97, 259, 13.6, 16.0, 16.0, 1.2, ['fast-food']),
  food('mc_filet',            'Filet-O-Fish',               'McDonald\'s', 'fast_food', '🐟', 141, 270, 10.6, 27.0, 13.5, 1.4, ['fast-food']),
  food('mc_egg_mcmuffin',     'Egg McMuffin',               'McDonald\'s', 'fast_food', '🧇', 135, 230, 12.6, 22.2,  9.6, 1.5, ['fast-food']),
  food('mc_sausage_egg',      'Sausage McMuffin w/ Egg',    'McDonald\'s', 'fast_food', '🧇', 170, 282, 12.4, 17.6, 17.6, 1.2, ['fast-food']),
  food('mc_hotcakes',         'Hotcakes (3)',                'McDonald\'s', 'fast_food', '🥞', 220, 345,  8.6, 60.9, 10.0, 1.8, ['fast-food']),
  food('mc_mcflurry_mm',      'McFlurry M&M',               'McDonald\'s', 'fast_food', '🍨', 400, 173,  3.8, 26.3,  5.5, 0.5, ['fast-food']),
  food('mc_coffee_black',     'McCafé Black Coffee',         'McDonald\'s', 'fast_food', '☕', 355,   2,  0.3,  0.0,  0.0, 0.0, ['fast-food']),
  food('mc_vanilla_latte',    'McCafé Vanilla Latte (M)',   'McDonald\'s', 'fast_food', '☕', 355, 250,  9.9, 39.4,  6.1, 0.0, ['fast-food']),
]

// ─── FAST FOOD — BURGER KING ──────────────────────────────────────────────────
const BURGER_KING = [
  food('bk_whopper',          'Whopper',                    'Burger King', 'fast_food', '🍔', 290, 228,  9.7, 16.9, 13.8, 1.4, ['fast-food']),
  food('bk_double_whopper',   'Double Whopper',             'Burger King', 'fast_food', '🍔', 375, 240, 11.7, 13.6, 14.9, 1.1, ['fast-food']),
  food('bk_chicken_sandwich', 'Original Chicken Sandwich',  'Burger King', 'fast_food', '🍔', 227, 291, 10.1, 25.1, 17.2, 1.5, ['fast-food']),
  food('bk_impossible',       'Impossible Whopper',         'Burger King', 'fast_food', '🍔', 272, 243,  9.9, 21.3, 13.2, 1.8, ['fast-food']),
  food('bk_onion_rings_med',  'Onion Rings (Medium)',       'Burger King', 'fast_food', '🧅', 120, 342,  4.2, 43.3, 17.5, 3.3, ['fast-food']),
  food('bk_fries_med',        'French Fries (Medium)',      'Burger King', 'fast_food', '🍟', 128, 320,  3.9, 43.8, 15.6, 3.9, ['fast-food']),
  food('bk_cheeseburger',     'Cheeseburger',               'Burger King', 'fast_food', '🍔', 133, 315, 16.5, 31.6, 14.3, 1.5, ['fast-food']),
]

// ─── FAST FOOD — CHIPOTLE ─────────────────────────────────────────────────────
const CHIPOTLE = [
  food('chip_chicken_bowl',   'Chicken Burrito Bowl',       'Chipotle', 'fast_food', '🍗', 480, 138, 10.4, 15.2,  3.8, 2.1, ['fast-food','high-protein']),
  food('chip_steak_bowl',     'Steak Burrito Bowl',         'Chipotle', 'fast_food', '🥩', 490, 139,  8.8, 15.5,  4.1, 2.0, ['fast-food']),
  food('chip_sofritas_bowl',  'Sofritas Burrito Bowl',      'Chipotle', 'fast_food', '🫘', 460, 152,  6.5, 19.6,  5.2, 3.5, ['fast-food','vegan']),
  food('chip_chicken_burrito','Chicken Burrito',             'Chipotle', 'fast_food', '🌯', 584, 177, 10.8, 19.9,  5.3, 2.4, ['fast-food']),
  food('chip_chicken_tacos',  'Chicken Tacos (3)',           'Chipotle', 'fast_food', '🌮', 290, 181, 12.4, 19.7,  5.2, 2.8, ['fast-food']),
  food('chip_chips_guac',     'Chips & Guacamole',          'Chipotle', 'fast_food', '🥑', 295, 271,  3.7, 29.5, 15.6, 6.1, ['fast-food']),
  food('chip_carnitas_bowl',  'Carnitas Burrito Bowl',       'Chipotle', 'fast_food', '🥩', 480, 145,  9.0, 15.0,  5.4, 1.8, ['fast-food']),
]

// ─── FAST FOOD — SUBWAY ───────────────────────────────────────────────────────
const SUBWAY = [
  food('sub_turkey_6',        '6" Turkey Breast',           'Subway', 'fast_food', '🥖', 225, 124,  8.0, 20.4,  2.0, 2.4, ['fast-food','lean']),
  food('sub_turkey_12',       '12" Turkey Breast',          'Subway', 'fast_food', '🥖', 450, 124,  8.0, 20.4,  2.0, 2.4, ['fast-food','lean']),
  food('sub_tuna_6',          '6" Tuna',                    'Subway', 'fast_food', '🐟', 255, 176,  7.5, 17.3,  9.0, 1.6, ['fast-food']),
  food('sub_rotisserie_6',    '6" Rotisserie Chicken',      'Subway', 'fast_food', '🍗', 260, 135,  8.8, 17.7,  3.5, 1.9, ['fast-food','lean']),
  food('sub_steak_6',         '6" Steak & Cheese',          'Subway', 'fast_food', '🥩', 282, 161,  9.6, 19.1,  5.3, 1.4, ['fast-food']),
  food('sub_veggie_6',        '6" Veggie Delite',           'Subway', 'fast_food', '🥗', 233, 99,   4.0, 18.9,  1.3, 2.6, ['fast-food','vegan','lean']),
  food('sub_bmt_6',           '6" BMT',                     'Subway', 'fast_food', '🥖', 261, 218, 11.1, 22.2,  9.2, 1.9, ['fast-food']),
]

// ─── FAST FOOD — CHICK-FIL-A ─────────────────────────────────────────────────
const CHICKFILA = [
  food('cfa_classic',         'Classic Chicken Sandwich',   'Chick-fil-A', 'fast_food', '🍔', 181, 243, 15.5, 22.7,  9.9, 1.1, ['fast-food','high-protein']),
  food('cfa_deluxe',          'Deluxe Chicken Sandwich',    'Chick-fil-A', 'fast_food', '🍔', 213, 239, 14.1, 19.7, 10.8, 1.3, ['fast-food']),
  food('cfa_grilled',         'Grilled Chicken Sandwich',   'Chick-fil-A', 'fast_food', '🍔', 200, 190, 17.5, 18.5,  5.5, 1.0, ['fast-food','lean','high-protein']),
  food('cfa_nuggets_8',       'Nuggets (8pc)',               'Chick-fil-A', 'fast_food', '🍗', 113, 221, 25.7,  9.7,  9.7, 0.4, ['fast-food','high-protein']),
  food('cfa_nuggets_12',      'Nuggets (12pc)',              'Chick-fil-A', 'fast_food', '🍗', 170, 224, 25.9,  9.9,  9.4, 0.4, ['fast-food','high-protein']),
  food('cfa_strips_3',        'Chick-n-Strips (3)',          'Chick-fil-A', 'fast_food', '🍗', 120, 283, 22.5, 18.3, 12.5, 0.8, ['fast-food']),
  food('cfa_waffle_fries_med','Waffle Potato Fries (Medium)','Chick-fil-A', 'fast_food', '🍟', 128, 328,  4.7, 39.1, 16.4, 4.7, ['fast-food']),
  food('cfa_mac_cheese',      'Mac & Cheese (medium)',       'Chick-fil-A', 'fast_food', '🧀', 212, 212,  8.9, 20.8, 10.4, 0.9, ['fast-food']),
  food('cfa_cobb_salad',      'Cobb Salad (grilled)',        'Chick-fil-A', 'fast_food', '🥗', 390, 167, 13.6,  7.2,  9.0, 2.6, ['fast-food','lean']),
  food('cfa_milkshake',       'Chocolate Milkshake (sm)',   'Chick-fil-A', 'fast_food', '🥤', 425, 120,  2.4, 19.1,  4.2, 0.5, ['fast-food']),
]

// ─── FAST FOOD — TACO BELL ────────────────────────────────────────────────────
const TACO_BELL = [
  food('tb_crunchy_taco',     'Crunchy Taco',               'Taco Bell', 'fast_food', '🌮',  84, 202,  9.5, 20.2,  9.5, 2.4, ['fast-food']),
  food('tb_soft_taco',        'Soft Taco',                  'Taco Bell', 'fast_food', '🌮',  99, 182,  9.1, 20.2,  7.1, 2.0, ['fast-food']),
  food('tb_burrito_supreme',  'Burrito Supreme',             'Taco Bell', 'fast_food', '🌯', 248, 161,  6.5, 21.4,  5.6, 2.4, ['fast-food']),
  food('tb_chalupa',          'Chalupa Supreme',             'Taco Bell', 'fast_food', '🌯', 153, 242, 10.5, 20.3, 13.7, 2.6, ['fast-food']),
  food('tb_chicken_quesadilla','Chicken Quesadilla',         'Taco Bell', 'fast_food', '🫓', 184, 277, 15.2, 21.7, 14.1, 1.1, ['fast-food','high-protein']),
  food('tb_mexican_pizza',    'Mexican Pizza',               'Taco Bell', 'fast_food', '🍕', 225, 316,  9.8, 31.6, 16.9, 2.7, ['fast-food']),
  food('tb_nachos_bellgrande','Nachos BellGrande',           'Taco Bell', 'fast_food', '🧀', 308, 247,  8.4, 30.8, 12.0, 3.9, ['fast-food']),
  food('tb_doritos_taco',     'Doritos Locos Taco',          'Taco Bell', 'fast_food', '🌮',  89, 191,  9.0, 19.1,  9.0, 2.2, ['fast-food']),
  food('tb_beefy_5layer',     'Beefy 5-Layer Burrito',       'Taco Bell', 'fast_food', '🌯', 248, 198,  9.3, 28.2,  6.5, 3.2, ['fast-food']),
]

// ─── FAST FOOD — WENDY'S ──────────────────────────────────────────────────────
const WENDYS = [
  food('w_daves_single',      'Dave\'s Single',              'Wendy\'s', 'fast_food', '🍔', 266, 222, 12.8, 15.0, 12.0, 0.8, ['fast-food']),
  food('w_daves_double',      'Dave\'s Double',              'Wendy\'s', 'fast_food', '🍔', 370, 235, 15.1, 10.8, 13.8, 0.5, ['fast-food']),
  food('w_baconator',         'Baconator',                   'Wendy\'s', 'fast_food', '🍔', 360, 264, 16.4, 10.3, 16.7, 0.6, ['fast-food']),
  food('w_spicy_chicken',     'Spicy Chicken Sandwich',      'Wendy\'s', 'fast_food', '🍔', 213, 235, 14.1, 26.3,  8.5, 1.4, ['fast-food']),
  food('w_grilled_chicken',   'Grilled Chicken Sandwich',    'Wendy\'s', 'fast_food', '🍔', 200, 195, 13.5, 24.5,  5.0, 1.0, ['fast-food','lean']),
  food('w_jr_hamburger',      'Jr. Hamburger',               'Wendy\'s', 'fast_food', '🍔', 118, 203, 12.7, 21.2,  6.8, 1.0, ['fast-food']),
  food('w_fries_med',         'French Fries (Medium)',        'Wendy\'s', 'fast_food', '🍟', 142, 296,  3.5, 40.1, 12.7, 2.8, ['fast-food']),
  food('w_frosty_choc_med',   'Chocolate Frosty (Medium)',   'Wendy\'s', 'fast_food', '🍨', 397,  98,  2.5, 17.9,  2.3, 1.0, ['fast-food']),
  food('w_chili_small',       'Chili (Small)',               'Wendy\'s', 'fast_food', '🍲', 227, 110,  8.4, 13.7,  3.1, 3.1, ['fast-food']),
]

// ─── FAST FOOD — FIVE GUYS ────────────────────────────────────────────────────
const FIVE_GUYS = [
  food('fg_cheeseburger',     'Cheeseburger',               'Five Guys', 'fast_food', '🍔', 295, 285, 16.3, 13.2, 18.6, 0.7, ['fast-food']),
  food('fg_hamburger',        'Hamburger',                  'Five Guys', 'fast_food', '🍔', 252, 263, 14.7, 13.5, 16.7, 0.7, ['fast-food']),
  food('fg_little_cheese',    'Little Cheeseburger',        'Five Guys', 'fast_food', '🍔', 195, 282, 13.3, 20.5, 16.4, 0.8, ['fast-food']),
  food('fg_bacon_cheeseburger','Bacon Cheeseburger',         'Five Guys', 'fast_food', '🍔', 330, 308, 17.9, 12.7, 20.6, 0.6, ['fast-food']),
  food('fg_fries_regular',    'Fries (Regular)',             'Five Guys', 'fast_food', '🍟', 411, 232,  3.4, 31.9, 10.0, 3.2, ['fast-food']),
  food('fg_hot_dog',          'Hot Dog',                    'Five Guys', 'fast_food', '🌭', 186, 312, 14.0, 25.8, 17.7, 1.1, ['fast-food']),
]

// ─── FAST FOOD — STARBUCKS ────────────────────────────────────────────────────
const STARBUCKS = [
  food('sbux_latte_grande',   'Caffè Latte Grande (2%)',    'Starbucks', 'fast_food', '☕', 473,  40,  2.7, 4.0,  1.5, 0.0, ['fast-food']),
  food('sbux_cappuccino',     'Cappuccino Grande',           'Starbucks', 'fast_food', '☕', 473,  30,  2.1, 3.0,  1.1, 0.0, ['fast-food']),
  food('sbux_frappuccino',    'Mocha Frappuccino Grande',   'Starbucks', 'fast_food', '🧋', 473,  87,  1.1,14.0,  3.2, 0.3, ['fast-food']),
  food('sbux_cold_brew',      'Cold Brew (Black)',           'Starbucks', 'fast_food', '☕', 473,   1,  0.1, 0.0,  0.0, 0.0, ['fast-food','lean']),
  food('sbux_iced_coffee',    'Iced Coffee (Black)',         'Starbucks', 'fast_food', '☕', 473,   5,  0.5, 1.0,  0.0, 0.0, ['fast-food','lean']),
  food('sbux_egg_cheese',     'Bacon Egg & Cheese Sandwich','Starbucks', 'fast_food', '🥪', 151, 285, 11.9,23.8, 14.6, 0.7, ['fast-food']),
  food('sbux_turkey_pesto',   'Turkey Pesto Panini',        'Starbucks', 'fast_food', '🥪', 222, 261, 15.3,28.8,  9.0, 1.4, ['fast-food','high-protein']),
  food('sbux_protein_box',    'Eggs & Cheddar Protein Box', 'Starbucks', 'fast_food', '📦', 191, 241, 13.1,22.5, 10.0, 2.6, ['fast-food']),
  food('sbux_spinach_wrap',   'Spinach Feta Wrap',          'Starbucks', 'fast_food', '🫓', 165, 284, 12.7,33.9,  9.7, 3.0, ['fast-food']),
]

// ─── FAST FOOD — PANERA ───────────────────────────────────────────────────────
const PANERA = [
  food('pan_broc_ched',       'Broccoli Cheddar Soup (bowl)','Panera', 'fast_food', '🍲', 340, 106,  4.1,  9.4,  5.9, 1.2, ['fast-food']),
  food('pan_chicken_soup',    'Chicken Noodle Soup',         'Panera', 'fast_food', '🍲', 340,  38,  2.4,  5.0,  0.9, 0.6, ['fast-food','lean']),
  food('pan_turkey_sourdough','Half Turkey on Sourdough',    'Panera', 'fast_food', '🥪', 260, 173, 11.5,22.7,  4.2, 2.3, ['fast-food','lean']),
  food('pan_fuji_chicken',    'Fuji Apple Chicken Salad',    'Panera', 'fast_food', '🥗', 327, 147,  9.2,11.6,  6.4, 2.5, ['fast-food','lean']),
  food('pan_mac_cheese',      'Mac & Cheese Bowl',           'Panera', 'fast_food', '🧀', 340, 185,  7.1,24.7,  6.5, 0.9, ['fast-food']),
  food('pan_egg_sandwich',    'Avocado Egg White Sandwich',  'Panera', 'fast_food', '🥪', 204, 310, 18.6,35.8, 10.3, 4.4, ['fast-food','high-protein']),
]

// ─── FAST FOOD — PIZZA HUT / DOMINO'S ─────────────────────────────────────────
const PIZZA = [
  food('pizza_cheese_slice',  'Cheese Pizza Slice (14")',    'Pizza Hut',   'fast_food', '🍕', 105, 277, 12.4,35.2, 10.5, 2.4, ['fast-food']),
  food('pizza_pepperoni_slice','Pepperoni Pizza Slice (14")','Pizza Hut',   'fast_food', '🍕', 111, 313, 14.0,35.1, 13.5, 2.2, ['fast-food']),
  food('dominos_cheese',      'Cheese Pizza Slice (14")',    'Domino\'s',   'fast_food', '🍕', 108, 267, 11.1,34.3, 10.0, 2.3, ['fast-food']),
  food('dominos_pepperoni',   'Pepperoni Pizza Slice',       'Domino\'s',   'fast_food', '🍕', 116, 299, 12.9,34.3, 12.9, 2.2, ['fast-food']),
]

// ─── SNACKS & PACKAGED ────────────────────────────────────────────────────────
const SNACKS = [
  food('quest_bar',           'Quest Protein Bar',           'Quest',     'snack', '🍫', 60, 317, 35.0, 43.3, 13.3, 1.7, ['high-protein','snack']),
  food('kirkland_protein_bar','Kirkland Protein Bar',        'Kirkland',  'snack', '🍫', 58, 328, 36.2, 36.2, 12.1, 1.7, ['high-protein','snack','sams-club']),
  food('sams_protein_shake',  'Sam\'s Choice Protein Shake', 'Sam\'s Club','snack','🧴', 330,  45, 9.1,  2.4,  0.6, 0.0, ['high-protein','snack','sams-club','lean']),
  food('clif_bar',            'Clif Bar',                   'Clif',      'snack', '🍫', 68, 368, 13.2, 66.2, 10.3, 5.9, ['snack']),
  food('kind_bar',            'KIND Almond & Coconut Bar',   'KIND',      'snack', '🍫', 40, 500, 15.0, 55.0, 30.0, 7.5, ['snack']),
  food('larabar',             'Larabar',                    'Larabar',   'snack', '🍫', 45, 422, 11.1, 53.3, 22.2, 6.7, ['snack','vegan']),
  food('beef_jerky',          'Beef Jerky',                 null,        'snack', '🥩', 28, 410, 33.0, 11.0, 26.0, 1.0, ['high-protein','snack','low-carb']),
  food('popcorn',             'Popcorn (air-popped)',        null,        'snack', '🍿', 30, 375, 11.0, 74.0,  4.3, 14.5,['snack','vegan']),
  food('potato_chips',        'Potato Chips',               null,        'snack', '🥔', 28, 536,  7.1, 53.3, 35.7, 3.6, ['snack']),
  food('crackers',            'Whole Grain Crackers',        null,        'snack', '🫓', 30, 421,  8.0, 68.0, 14.0, 4.0, ['snack']),
  food('protein_chips',       'Quest Protein Chips',         'Quest',     'snack', '🥔', 32, 406, 56.3, 21.9, 14.1, 0.3, ['high-protein','snack','low-carb']),
  food('rice_krispies',       'Rice Krispies Treat',         null,        'snack', '🍬', 33, 394,  3.0, 82.0,  6.1, 0.0, ['snack']),
  food('dark_chocolate',      'Dark Chocolate 70%',         null,        'snack', '🍫', 40, 598,  7.5, 46.0, 43.0, 10.9, ['snack']),
  food('granola_bar',         'Granola Bar',                null,        'snack', '🌾', 40, 471, 7.0,  57.5, 20.0, 4.0, ['snack']),
  food('applesauce',          'Applesauce (unsweetened)',    null,        'snack', '🍎', 113,  41, 0.2, 10.8,  0.1, 1.2, ['snack','vegan','lean']),
]

// ─── DRINKS ───────────────────────────────────────────────────────────────────
const DRINKS = [
  { ...food('water',          'Water',                      null, 'drink', '💧', 250,   0, 0.0,  0.0, 0.0, 0.0, ['lean','vegan']), serving: { amount: 250, unit: 'ml', label: '250ml' } },
  { ...food('oj',             'Orange Juice',               null, 'drink', '🍊', 240,  45, 0.7, 10.4, 0.2, 0.2, ['vegan']), serving: { amount: 240, unit: 'ml', label: '240ml' } },
  { ...food('apple_juice',    'Apple Juice',                null, 'drink', '🍎', 240,  46, 0.1, 11.4, 0.1, 0.2, ['vegan']), serving: { amount: 240, unit: 'ml', label: '240ml' } },
  { ...food('coca_cola',      'Coca-Cola',                  null, 'drink', '🥤', 355,  41, 0.0, 10.6, 0.0, 0.0, []), serving: { amount: 355, unit: 'ml', label: '355ml' } },
  { ...food('diet_coke',      'Diet Coke',                  null, 'drink', '🥤', 355,   0, 0.0,  0.0, 0.0, 0.0, ['lean']), serving: { amount: 355, unit: 'ml', label: '355ml' } },
  { ...food('gatorade',       'Gatorade',                   null, 'drink', '🥤', 591,  26, 0.0,  6.9, 0.0, 0.0, []), serving: { amount: 591, unit: 'ml', label: '591ml' } },
  { ...food('coffee_black',   'Black Coffee',               null, 'drink', '☕', 240,   2, 0.3,  0.0, 0.0, 0.0, ['lean']), serving: { amount: 240, unit: 'ml', label: '240ml' } },
  { ...food('protein_shake_generic','Protein Shake (generic)', null, 'drink','🧴', 330, 120,25.0, 4.0, 2.0, 0.5, ['high-protein','lean']), serving: { amount: 330, unit: 'ml', label: '330ml' } },
  { ...food('beer_regular',   'Beer (regular)',              null, 'drink', '🍺', 355,  43, 0.5,  3.6, 0.0, 0.0, []), serving: { amount: 355, unit: 'ml', label: '355ml' } },
  { ...food('red_wine',       'Red Wine',                   null, 'drink', '🍷', 150,  85, 0.1,  2.7, 0.0, 0.0, []), serving: { amount: 150, unit: 'ml', label: '150ml' } },
]

// ─── CANNED FISH, ORGAN MEATS & EXTRA WHOLE FOODS ────────────────────────────
const WHOLE_FOODS_EXTRA = [
  withPortions(food('sardines_oil',   'Sardines (canned in oil, drained)', null, 'protein', '🐟', 90, 208, 25.0, 0.0, 11.0, 0.0, ['high-protein','whole-food','omega-3','calcium','complete']),
    [{ label: '1 can (drained)', grams: 90 }, { label: '½ can', grams: 45 }, { label: '100g', grams: 100 }]),
  withPortions(food('sardines_water', 'Sardines (canned in water)',        null, 'protein', '🐟', 90, 160, 25.0, 0.0,  7.0, 0.0, ['high-protein','lean','whole-food','omega-3','calcium','complete']),
    [{ label: '1 can (drained)', grams: 90 }, { label: '½ can', grams: 45 }, { label: '100g', grams: 100 }]),
  withPortions(food('mackerel_canned','Mackerel (canned)',                 null, 'protein', '🐟', 100, 262, 24.0, 0.0, 18.0, 0.0, ['high-protein','whole-food','omega-3','complete']),
    [{ label: '1 can', grams: 100 }, { label: '½ can', grams: 50 }]),
  withPortions(food('anchovies',      'Anchovies (canned)',                null, 'protein', '🐟', 30, 210, 29.0, 0.0, 10.0, 0.0, ['high-protein','omega-3','complete']),
    [{ label: '1 tin', grams: 45 }, { label: '5 fillets', grams: 20 }]),
  food('mussels',        'Mussels (cooked)',          null, 'protein', '🦪', 100, 172, 24.0,  7.0,  4.5, 0.0, ['high-protein','omega-3','b12','iron']),
  food('beef_liver',     'Beef Liver (cooked)',       null, 'protein', '🥩', 100, 175, 27.0,  5.0,  5.0, 0.0, ['high-protein','iron','b12','whole-food','complete']),
  food('chicken_liver',  'Chicken Liver (cooked)',    null, 'protein', '🍗', 100, 167, 24.0,  1.0,  6.0, 0.0, ['high-protein','iron','b12','complete']),
  food('beef_heart',     'Beef Heart (cooked)',       null, 'protein', '🫀', 100, 165, 28.0,  0.2,  5.0, 0.0, ['high-protein','iron','b12','lean','complete']),
  food('cottage_2',      'Cottage Cheese (2%)',       null, 'dairy',   '🧀', 100,  84, 11.0,  4.3,  2.3, 0.0, ['high-protein','calcium','complete']),
  withPortions(food('kefir', 'Kefir (plain)',         null, 'dairy',   '🥛', 240,  65,  3.8,  4.8,  3.5, 0.0, ['calcium','probiotic']),
    [{ label: '1 cup', grams: 240 }, { label: '½ cup', grams: 120 }]),
  food('eggs_boiled',    'Boiled Egg',               null, 'protein', '🥚',  50, 155, 13.0,  1.1, 11.0, 0.0, ['high-protein','whole-food','complete']),
]

// ─── HABESHA (ERITREAN / ETHIOPIAN) ──────────────────────────────────────────
// Macros per 100g; portions use rough household measures (ladle, scoop, piece).
const HABESHA = [
  withPortions(food('injera',        'Injera (teff flatbread)',          null, 'habesha', '🫓', 120, 130,  3.8, 26.0, 0.7, 3.0, ['whole-food']),
    [{ label: '1 large piece', grams: 120 }, { label: '1 small piece', grams: 70 }, { label: '½ piece', grams: 60 }]),
  withPortions(food('injera_white',  'Injera (teff + wheat mix)',        null, 'habesha', '🫓', 120, 165,  4.0, 33.0, 0.9, 2.0, []),
    [{ label: '1 large piece', grams: 120 }, { label: '1 small piece', grams: 70 }]),
  withPortions(food('doro_wat',      'Doro Wat (spicy chicken stew)',    null, 'habesha', '🍲', 150, 150, 11.0,  6.0, 9.0, 1.5, ['high-protein','complete']),
    [{ label: '1 ladle', grams: 150 }, { label: '1 small scoop', grams: 80 }, { label: 'large portion', grams: 220 }]),
  withPortions(food('zigni',         'Zigni / Tsebhi (beef berbere stew)',null,'habesha', '🍲', 150, 180, 14.0,  5.0, 11.0, 1.0, ['high-protein','complete']),
    [{ label: '1 ladle', grams: 150 }, { label: '1 small scoop', grams: 80 }, { label: 'large portion', grams: 220 }]),
  withPortions(food('shiro',         'Shiro (spiced chickpea stew)',     null, 'habesha', '🥘', 150, 150,  6.0, 14.0, 8.0, 4.0, ['vegan','whole-food']),
    [{ label: '1 ladle', grams: 150 }, { label: '1 small scoop', grams: 80 }]),
  withPortions(food('misir_wat',     'Misir Wat (red lentil stew)',      null, 'habesha', '🥘', 150, 120,  6.0, 16.0, 4.0, 5.0, ['vegan','whole-food']),
    [{ label: '1 ladle', grams: 150 }, { label: '1 small scoop', grams: 80 }]),
  withPortions(food('tibs',          'Tibs (sautéed beef/lamb)',         null, 'habesha', '🍖', 180, 210, 20.0,  2.0, 14.0, 0.5, ['high-protein','complete']),
    [{ label: 'plate portion', grams: 180 }, { label: 'small portion', grams: 110 }]),
  withPortions(food('kitfo',         'Kitfo (minced beef + niter kibbeh)',null,'habesha', '🥩', 150, 250, 18.0,  0.5, 20.0, 0.0, ['high-protein','complete']),
    [{ label: '1 portion', grams: 150 }, { label: 'small portion', grams: 90 }]),
  withPortions(food('gomen',         'Gomen (collard greens)',           null, 'habesha', '🥬', 120,  75,  3.0,  7.0, 4.0, 3.0, ['vegan']),
    [{ label: '1 scoop', grams: 120 }, { label: 'small scoop', grams: 70 }]),
  withPortions(food('atakilt',       'Atakilt Wat (cabbage/carrot/potato)',null,'habesha','🥕', 150,  90,  2.0, 11.0, 5.0, 3.0, ['vegan']),
    [{ label: '1 scoop', grams: 150 }, { label: 'small scoop', grams: 80 }]),
  withPortions(food('ful',           'Ful (stewed fava beans)',          null, 'habesha', '🫘', 200, 110,  6.0, 15.0, 3.0, 5.0, ['vegan','whole-food']),
    [{ label: '1 bowl', grams: 200 }, { label: '½ bowl', grams: 100 }]),
  withPortions(food('firfir',        'Fir-fir (shredded injera in sauce)',null,'habesha', '🍲', 200, 180,  5.0, 28.0, 6.0, 2.5, []),
    [{ label: '1 plate', grams: 200 }, { label: 'small plate', grams: 120 }]),
  withPortions(food('hilbet',        'Hilbet (fenugreek/lentil paste)',  null, 'habesha', '🥣', 100, 130,  7.0, 14.0, 5.0, 5.0, ['vegan']),
    [{ label: '1 scoop', grams: 100 }, { label: 'small scoop', grams: 60 }]),
  withPortions(food('alicha',        'Alicha (mild veg/meat stew)',      null, 'habesha', '🥘', 150, 130,  7.0,  9.0, 7.0, 2.0, []),
    [{ label: '1 ladle', grams: 150 }, { label: 'small scoop', grams: 80 }]),
  withPortions(food('sambusa',       'Sambusa (fried lentil/meat pastry)',null,'habesha', '🥟', 50, 300,  8.0, 30.0, 16.0, 2.0, []),
    [{ label: '1 piece', grams: 50 }, { label: '2 pieces', grams: 100 }]),
  withPortions(food('dabo',          'Dabo (Habesha bread)',             null, 'habesha', '🍞', 80, 270,  8.0, 50.0, 4.0, 2.0, []),
    [{ label: '1 thick slice', grams: 80 }, { label: '1 thin slice', grams: 45 }]),
  withPortions(food('genfo',         'Genfo (barley porridge)',          null, 'habesha', '🥣', 200, 150,  4.0, 28.0, 3.0, 3.0, []),
    [{ label: '1 bowl', grams: 200 }, { label: '½ bowl', grams: 100 }]),
  withPortions(food('niter_kibbeh',  'Niter Kibbeh (spiced butter)',     null, 'habesha', '🧈', 14, 900,  0.5,  0.0, 99.0, 0.0, []),
    [{ label: '1 tbsp', grams: 14 }, { label: '1 tsp', grams: 5 }]),
  withPortions(food('berbere',       'Berbere spice',                    null, 'habesha', '🌶️', 8, 300, 12.0, 50.0, 8.0, 25.0, []),
    [{ label: '1 tbsp', grams: 8 }, { label: '1 tsp', grams: 3 }]),
]

// ═══════════════════════════════════════════════════════════════════════════
//  MEGA EXPANSION  — hundreds more foods (per 100g unless noted)
// ═══════════════════════════════════════════════════════════════════════════

// ─── SEAFOOD & FISH ──────────────────────────────────────────────────────────
const SEAFOOD = [
  food('haddock',        'Haddock (cooked)',          null, 'protein', '🐟', 100, 112, 24.0, 0.0, 0.9, 0.0, ['high-protein','lean','complete']),
  food('halibut',        'Halibut (cooked)',          null, 'protein', '🐟', 100, 140, 27.0, 0.0, 3.0, 0.0, ['high-protein','lean','complete']),
  food('trout',          'Rainbow Trout (cooked)',    null, 'protein', '🐟', 100, 190, 27.0, 0.0, 8.0, 0.0, ['high-protein','omega-3','complete']),
  food('sea_bass',       'Sea Bass (cooked)',         null, 'protein', '🐟', 100, 124, 23.0, 0.0, 2.6, 0.0, ['high-protein','lean','complete']),
  food('mahi',           'Mahi-Mahi (cooked)',        null, 'protein', '🐟', 100, 109, 24.0, 0.0, 0.9, 0.0, ['high-protein','lean','complete']),
  food('tuna_steak',     'Tuna Steak (cooked)',       null, 'protein', '🐟', 100, 184, 30.0, 0.0, 6.0, 0.0, ['high-protein','omega-3','complete']),
  food('herring',        'Herring (cooked)',          null, 'protein', '🐟', 100, 203, 23.0, 0.0,12.0, 0.0, ['high-protein','omega-3','complete']),
  food('catfish',        'Catfish (cooked)',          null, 'protein', '🐟', 100, 144, 18.0, 0.0, 8.0, 0.0, ['high-protein','complete']),
  food('snapper',        'Red Snapper (cooked)',      null, 'protein', '🐟', 100, 128, 26.0, 0.0, 1.7, 0.0, ['high-protein','lean','complete']),
  food('swordfish',      'Swordfish (cooked)',        null, 'protein', '🐟', 100, 172, 28.0, 0.0, 5.7, 0.0, ['high-protein','complete']),
  food('crab',           'Crab (cooked)',             null, 'protein', '🦀', 100, 97,  19.0, 0.0, 1.5, 0.0, ['high-protein','lean','complete']),
  food('lobster',        'Lobster (cooked)',          null, 'protein', '🦞', 100, 89,  19.0, 0.0, 0.9, 0.0, ['high-protein','lean','complete']),
  food('scallops',       'Scallops (cooked)',         null, 'protein', '🐚', 100, 111, 20.5, 5.0, 0.8, 0.0, ['high-protein','lean','complete']),
  food('oysters',        'Oysters (cooked)',          null, 'protein', '🦪', 100, 102, 11.0, 6.0, 3.5, 0.0, ['high-protein','iron','b12','complete']),
  food('clams',          'Clams (cooked)',            null, 'protein', '🐚', 100, 148, 25.0, 5.0, 2.0, 0.0, ['high-protein','iron','b12','complete']),
  food('octopus',        'Octopus (cooked)',          null, 'protein', '🐙', 100, 164, 30.0, 4.0, 2.0, 0.0, ['high-protein','lean','complete']),
  food('calamari',       'Calamari (cooked, plain)',  null, 'protein', '🦑', 100, 175, 18.0, 8.0, 7.0, 0.0, ['high-protein','complete']),
  food('crab_kirkland',  'Kirkland Lump Crab',        'Kirkland', 'protein', '🦀', 100, 84, 18.0, 0.0, 1.0, 0.0, ['high-protein','lean','sams-club','complete']),
  food('smoked_salmon',  'Smoked Salmon (lox)',       null, 'protein', '🐟', 100, 117, 18.0, 0.0, 4.3, 0.0, ['high-protein','omega-3','complete']),
  food('imitation_crab', 'Imitation Crab',            null, 'protein', '🦀', 100, 95,  8.0, 15.0, 0.4, 0.0, ['lean']),
]

// ─── MEATS & POULTRY (more cuts) ─────────────────────────────────────────────
const MEATS = [
  food('lamb_chop',      'Lamb Chop (cooked)',        null, 'protein', '🍖', 100, 250, 25.0, 0.0,16.0, 0.0, ['high-protein','complete']),
  food('lamb_ground',    'Ground Lamb (cooked)',      null, 'protein', '🍖', 100, 282, 25.0, 0.0,20.0, 0.0, ['high-protein','complete']),
  food('veal',           'Veal Cutlet (cooked)',      null, 'protein', '🥩', 100, 196, 31.0, 0.0, 7.0, 0.0, ['high-protein','lean','complete']),
  food('duck_breast',    'Duck Breast (cooked)',      null, 'protein', '🦆', 100, 201, 24.0, 0.0,11.0, 0.0, ['high-protein','complete']),
  food('bison',          'Bison (cooked)',            null, 'protein', '🦬', 100, 143, 28.0, 0.0, 2.4, 0.0, ['high-protein','lean','iron','complete']),
  food('venison',        'Venison (cooked)',          null, 'protein', '🦌', 100, 158, 30.0, 0.0, 3.2, 0.0, ['high-protein','lean','iron','complete']),
  food('goat',           'Goat (cooked)',             null, 'protein', '🐐', 100, 143, 27.0, 0.0, 3.0, 0.0, ['high-protein','lean','complete']),
  food('flank_steak',    'Flank Steak (cooked)',      null, 'protein', '🥩', 100, 192, 28.0, 0.0, 8.0, 0.0, ['high-protein','lean','complete']),
  food('skirt_steak',    'Skirt Steak (cooked)',      null, 'protein', '🥩', 100, 215, 27.0, 0.0,11.0, 0.0, ['high-protein','complete']),
  food('filet_mignon',   'Filet Mignon (cooked)',     null, 'protein', '🥩', 100, 227, 29.0, 0.0,12.0, 0.0, ['high-protein','complete']),
  food('brisket',        'Beef Brisket (cooked)',     null, 'protein', '🥩', 100, 246, 28.0, 0.0,14.0, 0.0, ['high-protein','complete']),
  food('beef_ribs',      'Beef Short Ribs (cooked)',  null, 'protein', '🍖', 100, 312, 26.0, 0.0,23.0, 0.0, ['high-protein','complete']),
  food('pork_belly',     'Pork Belly (cooked)',       null, 'protein', '🥓', 100, 518, 9.0,  0.0,53.0, 0.0, []),
  food('pork_ribs',      'Pork Ribs (cooked)',        null, 'protein', '🍖', 100, 277, 25.0, 0.0,19.0, 0.0, ['high-protein']),
  food('chicken_wing',   'Chicken Wings (cooked)',    null, 'protein', '🍗', 100, 203, 30.0, 0.0, 8.1, 0.0, ['high-protein','complete']),
  food('chicken_drumstick','Chicken Drumstick (cooked)',null,'protein', '🍗', 100, 172, 28.0, 0.0, 6.0, 0.0, ['high-protein','complete']),
  food('turkey_ground_93','Ground Turkey 93/7 (cooked)',null,'protein', '🦃', 100, 176, 22.0, 0.0,10.0, 0.0, ['high-protein','complete']),
  food('turkey_leg',     'Turkey Leg (cooked)',       null, 'protein', '🦃', 100, 208, 28.0, 0.0,10.0, 0.0, ['high-protein','complete']),
  food('cornish_hen',    'Cornish Hen (cooked)',      null, 'protein', '🍗', 100, 220, 25.0, 0.0,13.0, 0.0, ['high-protein','complete']),
  food('chorizo',        'Chorizo (cooked)',          null, 'protein', '🌭', 100, 455, 24.0, 2.0,38.0, 0.0, ['high-protein']),
  food('salami',         'Salami',                    null, 'protein', '🍖', 100, 336, 22.0, 2.0,26.0, 0.0, ['high-protein']),
  food('pepperoni',      'Pepperoni',                 null, 'protein', '🍕', 100, 504, 19.0, 1.0,46.0, 0.0, []),
  food('prosciutto',     'Prosciutto',                null, 'protein', '🥓', 100, 250, 26.0, 0.0,16.0, 0.0, ['high-protein']),
  food('roast_beef_deli','Roast Beef (deli)',         null, 'protein', '🥩', 100, 117, 19.0, 1.5, 4.0, 0.0, ['high-protein','lean']),
  food('chicken_deli',   'Chicken Breast (deli)',     null, 'protein', '🍗', 100, 105, 17.0, 3.0, 2.5, 0.0, ['high-protein','lean']),
  food('hot_dog',        'Hot Dog (beef)',            null, 'protein', '🌭', 100, 290, 10.0, 4.0,26.0, 0.0, []),
]

// ─── PLANT PROTEINS & LEGUMES ────────────────────────────────────────────────
const PLANT_PROTEIN = [
  food('seitan',         'Seitan',                    null, 'protein', '🌱', 100, 143, 25.0, 14.0, 2.0, 1.2, ['high-protein','vegan']),
  food('tempeh',         'Tempeh',                    null, 'protein', '🫘', 100, 192, 20.0, 8.0, 11.0, 4.0, ['high-protein','vegan','whole-food']),
  food('edamame',        'Edamame (shelled)',         null, 'protein', '🫛', 100, 122, 11.0, 10.0, 5.0, 5.0, ['high-protein','vegan','whole-food']),
  food('lentils_green',  'Green Lentils (cooked)',    null, 'protein', '🫘', 100, 116, 9.0, 20.0, 0.4, 8.0, ['vegan','whole-food']),
  food('lentils_red',    'Red Lentils (cooked)',      null, 'protein', '🫘', 100, 100, 7.5, 17.0, 0.4, 7.0, ['vegan','whole-food']),
  food('chickpeas',      'Chickpeas (cooked)',        null, 'protein', '🫘', 100, 164, 9.0, 27.0, 2.6, 8.0, ['vegan','whole-food']),
  food('black_beans',    'Black Beans (cooked)',      null, 'protein', '🫘', 100, 132, 9.0, 24.0, 0.5, 9.0, ['vegan','whole-food']),
  food('kidney_beans',   'Kidney Beans (cooked)',     null, 'protein', '🫘', 100, 127, 9.0, 23.0, 0.5, 7.0, ['vegan','whole-food']),
  food('pinto_beans',    'Pinto Beans (cooked)',      null, 'protein', '🫘', 100, 143, 9.0, 26.0, 0.7, 9.0, ['vegan','whole-food']),
  food('navy_beans',     'Navy Beans (cooked)',       null, 'protein', '🫘', 100, 140, 8.0, 26.0, 0.6, 11.0, ['vegan','whole-food']),
  food('white_beans',    'White Beans (cooked)',      null, 'protein', '🫘', 100, 139, 9.7, 25.0, 0.4, 6.3, ['vegan','whole-food']),
  food('lima_beans',     'Lima Beans (cooked)',       null, 'protein', '🫘', 100, 115, 8.0, 21.0, 0.4, 7.0, ['vegan','whole-food']),
  food('split_peas',     'Split Peas (cooked)',       null, 'protein', '🫛', 100, 118, 8.3, 21.0, 0.4, 8.3, ['vegan','whole-food']),
  food('soybeans',       'Soybeans (cooked)',         null, 'protein', '🫘', 100, 173, 17.0, 10.0, 9.0, 6.0, ['high-protein','vegan','whole-food']),
  food('falafel',        'Falafel',                   null, 'protein', '🧆', 100, 333, 13.0, 32.0, 18.0, 5.0, ['vegan']),
  food('hummus',         'Hummus',                    null, 'protein', '🫓', 100, 166, 8.0, 14.0, 10.0, 6.0, ['vegan','whole-food']),
  food('refried_beans',  'Refried Beans',             null, 'protein', '🫘', 100, 90,  5.0, 15.0, 1.5, 5.0, ['vegan']),
  food('soy_milk',       'Soy Milk (unsweetened)',    null, 'dairy', '🥛', 100, 33, 3.3, 1.2, 1.8, 0.5, ['vegan']),
  food('textured_veg',   'TVP (textured soy protein)',null, 'protein', '🌱', 100, 333, 52.0, 35.0, 1.0, 18.0, ['high-protein','vegan']),
]

// ─── FRUITS (lots) ───────────────────────────────────────────────────────────
const FRUITS_MORE = [
  food('mango',          'Mango',                     null, 'fruit', '🥭', 100, 60,  0.8, 15.0, 0.4, 1.6, ['whole-food']),
  food('pineapple',      'Pineapple',                 null, 'fruit', '🍍', 100, 50,  0.5, 13.0, 0.1, 1.4, ['whole-food']),
  food('watermelon',     'Watermelon',                null, 'fruit', '🍉', 100, 30,  0.6, 8.0, 0.2, 0.4, ['whole-food']),
  food('cantaloupe',     'Cantaloupe',                null, 'fruit', '🍈', 100, 34,  0.8, 8.0, 0.2, 0.9, ['whole-food']),
  food('honeydew',       'Honeydew Melon',            null, 'fruit', '🍈', 100, 36,  0.5, 9.0, 0.1, 0.8, ['whole-food']),
  food('papaya',         'Papaya',                    null, 'fruit', '🫐', 100, 43,  0.5, 11.0, 0.3, 1.7, ['whole-food']),
  food('kiwi',           'Kiwi',                      null, 'fruit', '🥝', 100, 61,  1.1, 15.0, 0.5, 3.0, ['whole-food']),
  food('pear',           'Pear',                      null, 'fruit', '🍐', 100, 57,  0.4, 15.0, 0.1, 3.1, ['whole-food']),
  food('plum',           'Plum',                      null, 'fruit', '🟣', 100, 46,  0.7, 11.0, 0.3, 1.4, ['whole-food']),
  food('peach',          'Peach',                     null, 'fruit', '🍑', 100, 39,  0.9, 10.0, 0.3, 1.5, ['whole-food']),
  food('apricot',        'Apricot',                   null, 'fruit', '🍑', 100, 48,  1.4, 11.0, 0.4, 2.0, ['whole-food']),
  food('cherries',       'Cherries',                  null, 'fruit', '🍒', 100, 63,  1.1, 16.0, 0.2, 2.1, ['whole-food']),
  food('grapes',         'Grapes',                    null, 'fruit', '🍇', 100, 69,  0.7, 18.0, 0.2, 0.9, ['whole-food']),
  food('pomegranate',    'Pomegranate',               null, 'fruit', '🔴', 100, 83,  1.7, 19.0, 1.2, 4.0, ['whole-food']),
  food('figs',           'Figs (fresh)',              null, 'fruit', '🟤', 100, 74,  0.8, 19.0, 0.3, 2.9, ['whole-food']),
  food('dates',          'Dates (Medjool)',           null, 'fruit', '🟤', 100, 277, 1.8, 75.0, 0.2, 6.7, ['whole-food']),
  food('grapefruit',     'Grapefruit',                null, 'fruit', '🍊', 100, 42,  0.8, 11.0, 0.1, 1.6, ['whole-food']),
  food('mandarin',       'Mandarin Orange',           null, 'fruit', '🍊', 100, 53,  0.8, 13.0, 0.3, 1.8, ['whole-food']),
  food('lemon',          'Lemon',                     null, 'fruit', '🍋', 100, 29,  1.1, 9.0, 0.3, 2.8, ['whole-food']),
  food('lime',           'Lime',                      null, 'fruit', '🟢', 100, 30,  0.7, 11.0, 0.2, 2.8, ['whole-food']),
  food('raspberries',    'Raspberries',               null, 'fruit', '🫐', 100, 52,  1.2, 12.0, 0.7, 6.5, ['whole-food']),
  food('blackberries',   'Blackberries',              null, 'fruit', '🫐', 100, 43,  1.4, 10.0, 0.5, 5.3, ['whole-food']),
  food('cranberries',    'Cranberries (fresh)',       null, 'fruit', '🔴', 100, 46,  0.4, 12.0, 0.1, 4.6, ['whole-food']),
  food('coconut_meat',   'Coconut Meat',              null, 'fruit', '🥥', 100, 354, 3.3, 15.0, 33.0, 9.0, ['whole-food']),
  food('guava',          'Guava',                     null, 'fruit', '🟢', 100, 68,  2.6, 14.0, 1.0, 5.4, ['whole-food']),
  food('passionfruit',   'Passionfruit',              null, 'fruit', '🟣', 100, 97,  2.2, 23.0, 0.7, 10.0, ['whole-food']),
  food('lychee',         'Lychee',                    null, 'fruit', '🔴', 100, 66,  0.8, 17.0, 0.4, 1.3, ['whole-food']),
  food('dragonfruit',    'Dragon Fruit',              null, 'fruit', '🐉', 100, 60,  1.2, 13.0, 0.0, 3.0, ['whole-food']),
  food('raisins',        'Raisins',                   null, 'fruit', '🟤', 100, 299, 3.1, 79.0, 0.5, 3.7, ['whole-food']),
  food('dried_apricot',  'Dried Apricots',            null, 'fruit', '🟠', 100, 241, 3.4, 63.0, 0.5, 7.3, ['whole-food']),
  food('banana_chips',   'Banana Chips',              null, 'snack', '🍌', 100, 519, 2.3, 58.0, 34.0, 8.0, []),
]

// ─── VEGETABLES (lots) ───────────────────────────────────────────────────────
const VEG_MORE = [
  food('cauliflower',    'Cauliflower',               null, 'vegetable', '🥦', 100, 25,  1.9, 5.0, 0.3, 2.0, ['vegan','whole-food']),
  food('asparagus',      'Asparagus',                 null, 'vegetable', '🥬', 100, 20,  2.2, 3.9, 0.1, 2.1, ['vegan','whole-food']),
  food('green_beans',    'Green Beans',               null, 'vegetable', '🫛', 100, 31,  1.8, 7.0, 0.2, 2.7, ['vegan','whole-food']),
  food('brussels',       'Brussels Sprouts',          null, 'vegetable', '🥬', 100, 43,  3.4, 9.0, 0.3, 3.8, ['vegan','whole-food']),
  food('zucchini',       'Zucchini',                  null, 'vegetable', '🥒', 100, 17,  1.2, 3.1, 0.3, 1.0, ['vegan','whole-food']),
  food('eggplant',       'Eggplant',                  null, 'vegetable', '🍆', 100, 25,  1.0, 6.0, 0.2, 3.0, ['vegan','whole-food']),
  food('okra',           'Okra',                      null, 'vegetable', '🟢', 100, 33,  1.9, 7.0, 0.2, 3.2, ['vegan','whole-food']),
  food('mushrooms',      'Mushrooms (white)',         null, 'vegetable', '🍄', 100, 22,  3.1, 3.3, 0.3, 1.0, ['vegan','whole-food']),
  food('bell_pepper',    'Bell Pepper (red)',         null, 'vegetable', '🫑', 100, 31,  1.0, 6.0, 0.3, 2.1, ['vegan','whole-food']),
  food('tomato',         'Tomato',                    null, 'vegetable', '🍅', 100, 18,  0.9, 3.9, 0.2, 1.2, ['vegan','whole-food']),
  food('cucumber',       'Cucumber',                  null, 'vegetable', '🥒', 100, 15,  0.7, 3.6, 0.1, 0.5, ['vegan','whole-food']),
  food('carrots',        'Carrots',                   null, 'vegetable', '🥕', 100, 41,  0.9, 10.0, 0.2, 2.8, ['vegan','whole-food']),
  food('beets',          'Beets',                     null, 'vegetable', '🟣', 100, 43,  1.6, 10.0, 0.2, 2.8, ['vegan','whole-food']),
  food('cabbage',        'Cabbage',                   null, 'vegetable', '🥬', 100, 25,  1.3, 6.0, 0.1, 2.5, ['vegan','whole-food']),
  food('kale',           'Kale',                      null, 'vegetable', '🥬', 100, 49,  4.3, 9.0, 0.9, 3.6, ['vegan','whole-food']),
  food('spinach',        'Spinach',                   null, 'vegetable', '🥬', 100, 23,  2.9, 3.6, 0.4, 2.2, ['vegan','whole-food','iron']),
  food('broccoli',       'Broccoli',                  null, 'vegetable', '🥦', 100, 34,  2.8, 7.0, 0.4, 2.6, ['vegan','whole-food']),
  food('sweet_corn',     'Sweet Corn',                null, 'vegetable', '🌽', 100, 86,  3.3, 19.0, 1.4, 2.0, ['vegan','whole-food']),
  food('peas',           'Green Peas',                null, 'vegetable', '🟢', 100, 81,  5.4, 14.0, 0.4, 5.7, ['vegan','whole-food']),
  food('onion',          'Onion',                     null, 'vegetable', '🧅', 100, 40,  1.1, 9.0, 0.1, 1.7, ['vegan','whole-food']),
  food('garlic',         'Garlic',                    null, 'vegetable', '🧄', 100, 149, 6.4, 33.0, 0.5, 2.1, ['vegan','whole-food']),
  food('leeks',          'Leeks',                     null, 'vegetable', '🥬', 100, 61,  1.5, 14.0, 0.3, 1.8, ['vegan','whole-food']),
  food('celery',         'Celery',                    null, 'vegetable', '🥬', 100, 16,  0.7, 3.0, 0.2, 1.6, ['vegan','whole-food']),
  food('artichoke',      'Artichoke',                 null, 'vegetable', '🌿', 100, 47,  3.3, 11.0, 0.2, 5.4, ['vegan','whole-food']),
  food('butternut',      'Butternut Squash',          null, 'vegetable', '🎃', 100, 45,  1.0, 12.0, 0.1, 2.0, ['vegan','whole-food']),
  food('radish',         'Radish',                    null, 'vegetable', '🔴', 100, 16,  0.7, 3.4, 0.1, 1.6, ['vegan','whole-food']),
  food('turnip',         'Turnip',                    null, 'vegetable', '🥬', 100, 28,  0.9, 6.0, 0.1, 1.8, ['vegan','whole-food']),
  food('bok_choy',       'Bok Choy',                  null, 'vegetable', '🥬', 100, 13,  1.5, 2.2, 0.2, 1.0, ['vegan','whole-food']),
  food('collard',        'Collard Greens',            null, 'vegetable', '🥬', 100, 32,  3.0, 5.4, 0.6, 4.0, ['vegan','whole-food']),
  food('pumpkin',        'Pumpkin',                   null, 'vegetable', '🎃', 100, 26,  1.0, 7.0, 0.1, 0.5, ['vegan','whole-food']),
]

// ─── GRAINS & STARCHES ───────────────────────────────────────────────────────
const GRAINS_MORE = [
  food('quinoa',         'Quinoa (cooked)',           null, 'carb', '🌾', 100, 120, 4.4, 21.0, 1.9, 2.8, ['vegan','whole-food']),
  food('couscous',       'Couscous (cooked)',         null, 'carb', '🌾', 100, 112, 3.8, 23.0, 0.2, 1.4, ['vegan']),
  food('bulgur',         'Bulgur (cooked)',           null, 'carb', '🌾', 100, 83,  3.1, 19.0, 0.2, 4.5, ['vegan','whole-food']),
  food('farro',          'Farro (cooked)',            null, 'carb', '🌾', 100, 130, 5.0, 26.0, 1.0, 3.5, ['vegan','whole-food']),
  food('barley',         'Barley (cooked)',           null, 'carb', '🌾', 100, 123, 2.3, 28.0, 0.4, 3.8, ['vegan','whole-food']),
  food('millet',         'Millet (cooked)',           null, 'carb', '🌾', 100, 119, 3.5, 24.0, 1.0, 1.3, ['vegan','whole-food']),
  food('buckwheat',      'Buckwheat (cooked)',        null, 'carb', '🌾', 100, 92,  3.4, 20.0, 0.6, 2.7, ['vegan','whole-food']),
  food('polenta',        'Polenta (cooked)',          null, 'carb', '🌽', 100, 85,  2.0, 18.0, 0.4, 1.0, ['vegan']),
  food('grits',          'Grits (cooked)',            null, 'carb', '🌽', 100, 71,  1.4, 16.0, 0.3, 0.8, ['vegan']),
  food('basmati',        'Basmati Rice (cooked)',     null, 'carb', '🍚', 100, 121, 3.5, 25.0, 0.4, 0.6, ['vegan']),
  food('jasmine_rice',   'Jasmine Rice (cooked)',     null, 'carb', '🍚', 100, 129, 2.7, 28.0, 0.2, 0.3, ['vegan']),
  food('wild_rice',      'Wild Rice (cooked)',        null, 'carb', '🍚', 100, 101, 4.0, 21.0, 0.3, 1.8, ['vegan','whole-food']),
  food('bagel',          'Bagel (plain)',             null, 'carb', '🥯', 100, 257, 10.0, 50.0, 1.5, 2.1, []),
  food('pita',           'Pita Bread',                null, 'carb', '🫓', 100, 275, 9.0, 55.0, 1.2, 2.2, []),
  food('naan',           'Naan',                      null, 'carb', '🫓', 100, 310, 9.0, 50.0, 8.0, 2.0, []),
  food('tortilla_corn',  'Corn Tortilla',             null, 'carb', '🌮', 100, 218, 5.7, 45.0, 2.9, 6.3, ['vegan','whole-food']),
  food('croissant',      'Croissant',                 null, 'carb', '🥐', 100, 406, 8.0, 46.0, 21.0, 2.6, []),
  food('pancake',        'Pancakes',                  null, 'carb', '🥞', 100, 227, 6.0, 28.0, 10.0, 1.0, []),
  food('waffle',         'Waffle',                    null, 'carb', '🧇', 100, 291, 8.0, 33.0, 14.0, 2.0, []),
  food('ramen_noodles',  'Ramen Noodles (cooked)',    null, 'carb', '🍜', 100, 138, 4.5, 25.0, 2.0, 1.2, []),
  food('rice_noodles',   'Rice Noodles (cooked)',     null, 'carb', '🍜', 100, 108, 1.8, 25.0, 0.2, 1.0, ['vegan']),
  food('gnocchi',        'Gnocchi',                   null, 'carb', '🥟', 100, 156, 3.8, 32.0, 1.5, 2.0, []),
  food('cornbread',      'Cornbread',                 null, 'carb', '🌽', 100, 330, 7.0, 47.0, 12.0, 2.0, []),
  food('hash_browns',    'Hash Browns',               null, 'carb', '🥔', 100, 265, 3.0, 35.0, 13.0, 3.0, []),
  food('mashed_potato',  'Mashed Potatoes',           null, 'carb', '🥔', 100, 113, 2.0, 17.0, 4.2, 1.5, []),
  food('plantain',       'Plantain (cooked)',         null, 'carb', '🍌', 100, 122, 0.8, 32.0, 0.4, 2.3, ['vegan','whole-food']),
]

// ─── DAIRY & EGGS (more) ─────────────────────────────────────────────────────
const DAIRY_MORE = [
  food('cheddar',        'Cheddar Cheese',            null, 'dairy', '🧀', 100, 403, 25.0, 1.3, 33.0, 0.0, ['high-protein','calcium']),
  food('mozzarella',     'Mozzarella',                null, 'dairy', '🧀', 100, 280, 22.0, 2.2, 17.0, 0.0, ['high-protein','calcium']),
  food('parmesan',       'Parmesan',                  null, 'dairy', '🧀', 100, 392, 36.0, 3.2, 26.0, 0.0, ['high-protein','calcium']),
  food('feta',           'Feta Cheese',               null, 'dairy', '🧀', 100, 264, 14.0, 4.0, 21.0, 0.0, ['calcium']),
  food('swiss_cheese',   'Swiss Cheese',              null, 'dairy', '🧀', 100, 380, 27.0, 5.0, 28.0, 0.0, ['high-protein','calcium']),
  food('gouda',          'Gouda',                     null, 'dairy', '🧀', 100, 356, 25.0, 2.2, 27.0, 0.0, ['high-protein','calcium']),
  food('cream_cheese',   'Cream Cheese',              null, 'dairy', '🧀', 100, 342, 6.0, 4.0, 34.0, 0.0, []),
  food('ricotta',        'Ricotta',                   null, 'dairy', '🧀', 100, 174, 11.0, 3.0, 13.0, 0.0, ['calcium']),
  food('milk_whole',     'Whole Milk',                null, 'dairy', '🥛', 100, 61,  3.2, 4.8, 3.3, 0.0, ['calcium']),
  food('milk_skim',      'Skim Milk',                 null, 'dairy', '🥛', 100, 34,  3.4, 5.0, 0.1, 0.0, ['lean','calcium']),
  food('almond_milk',    'Almond Milk (unsweetened)', null, 'dairy', '🥛', 100, 15,  0.6, 0.3, 1.2, 0.3, ['vegan']),
  food('oat_milk',       'Oat Milk',                  null, 'dairy', '🥛', 100, 50,  1.0, 7.0, 1.5, 0.8, ['vegan']),
  food('greek_yogurt_full','Greek Yogurt (full-fat)', null, 'dairy', '🥛', 100, 97,  9.0, 4.0, 5.0, 0.0, ['high-protein','calcium']),
  food('greek_yogurt_0', 'Greek Yogurt (non-fat)',    null, 'dairy', '🥛', 100, 59,  10.0, 3.6, 0.4, 0.0, ['high-protein','lean','calcium']),
  food('skyr',           'Skyr (Icelandic yogurt)',   null, 'dairy', '🥛', 100, 63,  11.0, 4.0, 0.2, 0.0, ['high-protein','lean','calcium']),
  food('butter',         'Butter',                    null, 'fat', '🧈', 100, 717, 0.9, 0.1, 81.0, 0.0, []),
  food('ghee',           'Ghee',                      null, 'fat', '🧈', 100, 900, 0.0, 0.0, 100.0, 0.0, []),
  food('string_cheese',  'String Cheese',             null, 'dairy', '🧀', 100, 318, 24.0, 2.0, 24.0, 0.0, ['high-protein','calcium']),
]

// ─── NUTS, SEEDS & FATS ──────────────────────────────────────────────────────
const NUTS_FATS = [
  food('almonds',        'Almonds',                   null, 'fat', '🥜', 100, 579, 21.0, 22.0, 50.0, 12.5, ['whole-food']),
  food('walnuts',        'Walnuts',                   null, 'fat', '🥜', 100, 654, 15.0, 14.0, 65.0, 6.7, ['whole-food','omega-3']),
  food('cashews',        'Cashews',                   null, 'fat', '🥜', 100, 553, 18.0, 30.0, 44.0, 3.3, ['whole-food']),
  food('pistachios',     'Pistachios',                null, 'fat', '🥜', 100, 560, 20.0, 28.0, 45.0, 10.0, ['whole-food']),
  food('pecans',         'Pecans',                    null, 'fat', '🥜', 100, 691, 9.0, 14.0, 72.0, 9.6, ['whole-food']),
  food('macadamia',      'Macadamia Nuts',            null, 'fat', '🥜', 100, 718, 8.0, 14.0, 76.0, 8.6, ['whole-food']),
  food('brazil_nuts',    'Brazil Nuts',               null, 'fat', '🥜', 100, 659, 14.0, 12.0, 67.0, 7.5, ['whole-food']),
  food('hazelnuts',      'Hazelnuts',                 null, 'fat', '🥜', 100, 628, 15.0, 17.0, 61.0, 9.7, ['whole-food']),
  food('peanuts',        'Peanuts',                   null, 'fat', '🥜', 100, 567, 26.0, 16.0, 49.0, 8.5, ['whole-food','high-protein']),
  food('peanut_butter',  'Peanut Butter',             null, 'fat', '🥜', 100, 588, 25.0, 20.0, 50.0, 6.0, ['high-protein']),
  food('almond_butter',  'Almond Butter',             null, 'fat', '🥜', 100, 614, 21.0, 19.0, 56.0, 10.0, ['high-protein']),
  food('chia_seeds',     'Chia Seeds',                null, 'fat', '🌰', 100, 486, 17.0, 42.0, 31.0, 34.0, ['whole-food','omega-3']),
  food('flax_seeds',     'Flax Seeds',                null, 'fat', '🌰', 100, 534, 18.0, 29.0, 42.0, 27.0, ['whole-food','omega-3']),
  food('pumpkin_seeds',  'Pumpkin Seeds',             null, 'fat', '🎃', 100, 559, 30.0, 11.0, 49.0, 6.0, ['whole-food','high-protein','iron']),
  food('sunflower_seeds','Sunflower Seeds',           null, 'fat', '🌻', 100, 584, 21.0, 20.0, 51.0, 9.0, ['whole-food']),
  food('sesame_seeds',   'Sesame Seeds',              null, 'fat', '🌰', 100, 573, 18.0, 23.0, 50.0, 12.0, ['whole-food','calcium']),
  food('avocado',        'Avocado',                   null, 'fat', '🥑', 100, 160, 2.0, 9.0, 15.0, 7.0, ['whole-food']),
  food('olive_oil',      'Olive Oil',                 null, 'fat', '🫒', 100, 884, 0.0, 0.0, 100.0, 0.0, []),
  food('coconut_oil',    'Coconut Oil',               null, 'fat', '🥥', 100, 862, 0.0, 0.0, 100.0, 0.0, []),
  food('olives',         'Olives',                    null, 'fat', '🫒', 100, 115, 0.8, 6.0, 11.0, 3.2, ['whole-food']),
  food('tahini',         'Tahini',                    null, 'fat', '🌰', 100, 595, 17.0, 21.0, 54.0, 9.3, ['high-protein']),
  food('trail_mix',      'Trail Mix',                 null, 'snack', '🥜', 100, 462, 14.0, 45.0, 29.0, 5.0, []),
]

// ─── CONDIMENTS & SAUCES ─────────────────────────────────────────────────────
const CONDIMENTS = [
  withPortions(food('ketchup',     'Ketchup',          null, 'fat', '🍅', 17, 100, 1.0, 26.0, 0.1, 0.3, []), [{label:'1 tbsp',grams:17},{label:'1 tsp',grams:5}]),
  withPortions(food('mustard',     'Mustard',          null, 'fat', '🟡', 5, 66, 4.4, 6.0, 4.0, 3.3, []), [{label:'1 tsp',grams:5},{label:'1 tbsp',grams:15}]),
  withPortions(food('mayo',        'Mayonnaise',       null, 'fat', '🥚', 14, 680, 1.0, 0.6, 75.0, 0.0, []), [{label:'1 tbsp',grams:14}]),
  withPortions(food('soy_sauce',   'Soy Sauce',        null, 'fat', '🍶', 16, 53, 8.0, 4.9, 0.6, 0.8, []), [{label:'1 tbsp',grams:16},{label:'1 tsp',grams:5}]),
  withPortions(food('hot_sauce',   'Hot Sauce',        null, 'fat', '🌶️', 5, 11, 0.5, 1.8, 0.4, 0.3, []), [{label:'1 tsp',grams:5},{label:'1 tbsp',grams:15}]),
  withPortions(food('sriracha',    'Sriracha',         null, 'fat', '🌶️', 9, 93, 1.9, 19.0, 0.9, 2.4, []), [{label:'1 tbsp',grams:9}]),
  withPortions(food('ranch',       'Ranch Dressing',   null, 'fat', '🥗', 30, 320, 1.0, 5.0, 33.0, 0.0, []), [{label:'2 tbsp',grams:30}]),
  withPortions(food('bbq_sauce',   'BBQ Sauce',        null, 'fat', '🍖', 17, 172, 0.8, 41.0, 0.6, 0.7, []), [{label:'1 tbsp',grams:17}]),
  withPortions(food('honey',       'Honey',            null, 'fat', '🍯', 21, 304, 0.3, 82.0, 0.0, 0.2, []), [{label:'1 tbsp',grams:21},{label:'1 tsp',grams:7}]),
  withPortions(food('maple_syrup', 'Maple Syrup',      null, 'fat', '🍁', 20, 260, 0.0, 67.0, 0.1, 0.0, []), [{label:'1 tbsp',grams:20}]),
  withPortions(food('salsa',       'Salsa',            null, 'vegetable', '🍅', 36, 36, 1.5, 7.0, 0.2, 1.5, ['vegan']), [{label:'2 tbsp',grams:36},{label:'¼ cup',grams:60}]),
  withPortions(food('guacamole',   'Guacamole',        null, 'fat', '🥑', 30, 150, 2.0, 8.0, 13.0, 6.0, ['whole-food']), [{label:'2 tbsp',grams:30},{label:'¼ cup',grams:60}]),
  withPortions(food('pesto',       'Pesto',            null, 'fat', '🌿', 16, 458, 5.0, 6.0, 47.0, 1.0, []), [{label:'1 tbsp',grams:16}]),
  withPortions(food('marinara',    'Marinara Sauce',   null, 'vegetable', '🍅', 125, 60, 1.6, 9.0, 2.0, 2.0, ['vegan']), [{label:'½ cup',grams:125}]),
]

// ═══════════════════════════════════════════════════════════════════════════
//  FAST FOOD CHAINS  (macros are PER SERVING via servingFood)
// ═══════════════════════════════════════════════════════════════════════════
const QDOBA = [
  servingFood('qdoba_chicken_bowl','Chicken Burrito Bowl','Qdoba','fast_food','🌯',520, 705, 47, 65, 28, 9, ['fast-food','high-protein']),
  servingFood('qdoba_steak_bowl',  'Steak Burrito Bowl', 'Qdoba','fast_food','🌯',520, 730, 44, 64, 33, 9, ['fast-food','high-protein']),
  servingFood('qdoba_chicken_burrito','Chicken Burrito','Qdoba','fast_food','🌯',650, 1020, 54, 104, 42, 11, ['fast-food','high-protein']),
  servingFood('qdoba_quesadilla', 'Cheese Quesadilla',  'Qdoba','fast_food','🫓',300, 720, 32, 56, 41, 3, ['fast-food']),
  servingFood('qdoba_taco_chicken','Chicken Taco (1)',  'Qdoba','fast_food','🌮',120, 230, 14, 18, 11, 2, ['fast-food']),
  servingFood('qdoba_nachos',     'Loaded Nachos',      'Qdoba','fast_food','🧀',450, 1140, 47, 91, 64, 10, ['fast-food']),
  servingFood('qdoba_queso_side', 'Queso (side)',       'Qdoba','fast_food','🧀',60,  130, 4, 6, 10, 0, ['fast-food']),
]
const PANDA_EXPRESS = [
  servingFood('panda_orange_chicken','Orange Chicken','Panda Express','fast_food','🍗',170, 490, 25, 51, 23, 2, ['fast-food']),
  servingFood('panda_beijing_beef','Beijing Beef',  'Panda Express','fast_food','🥩',171, 470, 14, 46, 26, 2, ['fast-food']),
  servingFood('panda_kungpao',    'Kung Pao Chicken','Panda Express','fast_food','🌶️',162, 290, 16, 14, 19, 3, ['fast-food']),
  servingFood('panda_teriyaki',   'Grilled Teriyaki Chicken','Panda Express','fast_food','🍗',191, 275, 33, 14, 10, 0, ['fast-food','high-protein']),
  servingFood('panda_broccoli_beef','Broccoli Beef', 'Panda Express','fast_food','🥦',150, 150, 9, 13, 7, 2, ['fast-food']),
  servingFood('panda_honey_walnut','Honey Walnut Shrimp','Panda Express','fast_food','🦐',105, 360, 13, 35, 23, 2, ['fast-food']),
  servingFood('panda_fried_rice', 'Fried Rice',      'Panda Express','fast_food','🍚',286, 520, 11, 85, 16, 1, ['fast-food']),
  servingFood('panda_chow_mein',  'Chow Mein',       'Panda Express','fast_food','🍜',284, 510, 13, 80, 20, 6, ['fast-food']),
  servingFood('panda_white_rice', 'Steamed White Rice','Panda Express','fast_food','🍚',272, 380, 7, 87, 0, 0, ['fast-food']),
  servingFood('panda_string_bean_chicken','String Bean Chicken','Panda Express','fast_food','🫛',162, 190, 14, 13, 9, 4, ['fast-food']),
  servingFood('panda_eggroll',    'Chicken Egg Roll (1)','Panda Express','fast_food','🥟',77, 200, 6, 20, 10, 2, ['fast-food']),
  servingFood('panda_rangoon',    'Cream Cheese Rangoon (3)','Panda Express','fast_food','🥟',64, 190, 5, 24, 8, 1, ['fast-food']),
]
const KFC = [
  servingFood('kfc_orig_breast', 'Original Recipe Breast','KFC','fast_food','🍗',161, 390, 39, 11, 21, 0, ['fast-food','high-protein']),
  servingFood('kfc_orig_thigh',  'Original Recipe Thigh','KFC','fast_food','🍗',126, 280, 19, 8, 19, 0, ['fast-food']),
  servingFood('kfc_orig_drum',   'Original Recipe Drumstick','KFC','fast_food','🍗',59, 130, 12, 4, 8, 0, ['fast-food']),
  servingFood('kfc_tenders',     'Crispy Tenders (3)','KFC','fast_food','🍗',141, 410, 30, 19, 24, 1, ['fast-food','high-protein']),
  servingFood('kfc_pot_pie',     'Chicken Pot Pie','KFC','fast_food','🥧',423, 720, 27, 67, 39, 4, ['fast-food']),
  servingFood('kfc_famous_bowl', 'Famous Bowl',    'KFC','fast_food','🥣',490, 710, 26, 78, 33, 6, ['fast-food']),
  servingFood('kfc_mac',         'Mac & Cheese',   'KFC','fast_food','🧀',136, 200, 8, 23, 8, 1, ['fast-food']),
  servingFood('kfc_biscuit',     'Biscuit',        'KFC','fast_food','🫓',64, 180, 4, 23, 8, 1, ['fast-food']),
  servingFood('kfc_coleslaw',    'Coleslaw',       'KFC','fast_food','🥗',130, 170, 1, 22, 9, 3, ['fast-food']),
]
const POPEYES = [
  servingFood('popeyes_breast',  'Spicy Chicken Breast','Popeyes','fast_food','🍗',191, 380, 32, 13, 23, 1, ['fast-food','high-protein']),
  servingFood('popeyes_sandwich','Chicken Sandwich','Popeyes','fast_food','🍔',240, 700, 28, 50, 42, 2, ['fast-food']),
  servingFood('popeyes_tenders', 'Tenders (3)',    'Popeyes','fast_food','🍗',130, 340, 23, 18, 20, 1, ['fast-food','high-protein']),
  servingFood('popeyes_shrimp',  'Popcorn Shrimp', 'Popeyes','fast_food','🦐',110, 280, 9, 22, 17, 1, ['fast-food']),
  servingFood('popeyes_redbeans','Red Beans & Rice','Popeyes','fast_food','🫘',150, 230, 6, 25, 14, 6, ['fast-food']),
  servingFood('popeyes_biscuit', 'Biscuit',        'Popeyes','fast_food','🫓',60, 200, 3, 26, 12, 1, ['fast-food']),
]
const IN_N_OUT = [
  servingFood('innout_double',   'Double-Double',  'In-N-Out','fast_food','🍔',330, 670, 37, 39, 41, 3, ['fast-food','high-protein']),
  servingFood('innout_cheese',   'Cheeseburger',   'In-N-Out','fast_food','🍔',268, 480, 22, 39, 27, 3, ['fast-food']),
  servingFood('innout_hamburger','Hamburger',      'In-N-Out','fast_food','🍔',243, 390, 16, 39, 19, 3, ['fast-food']),
  servingFood('innout_protein',  'Double-Double (Protein Style)','In-N-Out','fast_food','🥬',300, 520, 33, 11, 39, 3, ['fast-food','high-protein','low-carb']),
  servingFood('innout_fries',    'French Fries',   'In-N-Out','fast_food','🍟',125, 370, 5, 54, 18, 2, ['fast-food']),
  servingFood('innout_shake',    'Vanilla Shake',  'In-N-Out','fast_food','🥤',425, 590, 9, 78, 29, 0, ['fast-food']),
]
const DUNKIN = [
  servingFood('dunkin_glazed',   'Glazed Donut',   'Dunkin','fast_food','🍩',60, 240, 4, 28, 14, 1, ['fast-food']),
  servingFood('dunkin_boston',   'Boston Kreme Donut','Dunkin','fast_food','🍩',92, 300, 4, 39, 15, 1, ['fast-food']),
  servingFood('dunkin_munchkins','Munchkins (5)',  'Dunkin','fast_food','🍩',75, 280, 4, 36, 14, 1, ['fast-food']),
  servingFood('dunkin_bagel',    'Plain Bagel',    'Dunkin','fast_food','🥯',105, 320, 11, 64, 3, 3, ['fast-food']),
  servingFood('dunkin_wake_wrap','Wake-Up Wrap',   'Dunkin','fast_food','🌯',76, 180, 8, 14, 10, 0, ['fast-food']),
  servingFood('dunkin_sausage_sandwich','Sausage Egg & Cheese','Dunkin','fast_food','🥪',160, 500, 19, 38, 30, 1, ['fast-food']),
  servingFood('dunkin_latte',    'Latte (medium)', 'Dunkin','drink','☕',440, 190, 11, 19, 7, 0, ['fast-food']),
  servingFood('dunkin_iced_coffee','Iced Coffee (medium, w/ cream & sugar)','Dunkin','drink','🥤',590, 170, 2, 32, 5, 0, ['fast-food']),
]
const RAISING_CANES = [
  servingFood('canes_3finger',   '3 Finger Combo (no sides)','Raising Canes','fast_food','🍗',150, 410, 31, 18, 22, 1, ['fast-food','high-protein']),
  servingFood('canes_chicken',   'Chicken Finger (1)','Raising Canes','fast_food','🍗',50, 130, 10, 6, 7, 0, ['fast-food']),
  servingFood('canes_sandwich',  'Chicken Sandwich','Raising Canes','fast_food','🍔',230, 730, 30, 42, 47, 2, ['fast-food']),
  servingFood('canes_texas_toast','Texas Toast',   'Raising Canes','fast_food','🍞',54, 190, 4, 23, 9, 1, ['fast-food']),
  servingFood('canes_sauce',     "Cane's Sauce",   'Raising Canes','fast_food','🥫',43, 190, 1, 2, 19, 0, ['fast-food']),
]
const JERSEY_MIKES = [
  servingFood('jm_turkey_reg',   'Turkey Sub (regular)','Jersey Mikes','fast_food','🥪',290, 590, 30, 60, 24, 3, ['fast-food','high-protein']),
  servingFood('jm_italian',      'Original Italian (regular)','Jersey Mikes','fast_food','🥪',310, 770, 33, 62, 42, 3, ['fast-food','high-protein']),
  servingFood('jm_cheesesteak',  'Philly Cheesesteak (regular)','Jersey Mikes','fast_food','🥪',300, 630, 38, 56, 27, 3, ['fast-food','high-protein']),
  servingFood('jm_club',         'Club Supreme (regular)','Jersey Mikes','fast_food','🥪',330, 820, 39, 60, 47, 3, ['fast-food','high-protein']),
  servingFood('jm_tuna',         'Tuna Sub (regular)','Jersey Mikes','fast_food','🥪',300, 800, 30, 58, 50, 3, ['fast-food']),
]
const OTHER_CHAINS = [
  servingFood('arbys_roast_beef','Roast Beef Classic','Arbys','fast_food','🥪',154, 360, 23, 37, 14, 2, ['fast-food','high-protein']),
  servingFood('arbys_beefcheddar','Beef n Cheddar', 'Arbys','fast_food','🥪',195, 450, 23, 45, 20, 2, ['fast-food']),
  servingFood('arbys_curly',     'Curly Fries (medium)','Arbys','fast_food','🍟',128, 410, 5, 49, 22, 5, ['fast-food']),
  servingFood('sonic_cheeseburger','SuperSONIC Cheeseburger','Sonic','fast_food','🍔',300, 800, 38, 56, 47, 3, ['fast-food','high-protein']),
  servingFood('sonic_corndog',   'Corn Dog',       'Sonic','fast_food','🌭',95, 240, 6, 25, 13, 1, ['fast-food']),
  servingFood('sonic_tots',      'Tater Tots (medium)','Sonic','fast_food','🥔',141, 330, 3, 38, 19, 4, ['fast-food']),
  servingFood('jackbox_jumbo',   'Jumbo Jack',     'Jack in the Box','fast_food','🍔',261, 580, 22, 48, 34, 3, ['fast-food']),
  servingFood('jackbox_tacos',   'Tacos (2)',      'Jack in the Box','fast_food','🌮',114, 340, 10, 30, 20, 4, ['fast-food']),
  servingFood('whataburger',     'Whataburger',    'Whataburger','fast_food','🍔',337, 590, 27, 53, 30, 3, ['fast-food','high-protein']),
  servingFood('culvers_butterburger','ButterBurger Cheese','Culvers','fast_food','🍔',200, 540, 28, 38, 31, 1, ['fast-food','high-protein']),
  servingFood('culvers_curds',   'Cheese Curds',   'Culvers','fast_food','🧀',142, 540, 23, 38, 33, 2, ['fast-food']),
  servingFood('shake_shack_single','ShackBurger (single)','Shake Shack','fast_food','🍔',195, 530, 27, 35, 33, 2, ['fast-food','high-protein']),
  servingFood('shake_shack_fries','Crinkle Fries', 'Shake Shack','fast_food','🍟',117, 420, 5, 47, 24, 4, ['fast-food']),
  servingFood('wingstop_wings',  'Classic Wings (6, plain)','Wingstop','fast_food','🍗',300, 430, 42, 0, 28, 0, ['fast-food','high-protein']),
  servingFood('wingstop_boneless','Boneless Wings (6)','Wingstop','fast_food','🍗',200, 470, 28, 38, 23, 2, ['fast-food','high-protein']),
  servingFood('jimmyjohns_turkey','Turkey Tom (8-inch)','Jimmy Johns','fast_food','🥪',230, 510, 24, 49, 24, 2, ['fast-food','high-protein']),
  servingFood('jimmyjohns_italian','Italian Night Club','Jimmy Johns','fast_food','🥪',310, 880, 39, 52, 56, 3, ['fast-food','high-protein']),
  servingFood('littlecaesars_pep','Pepperoni Pizza (1 slice)','Little Caesars','fast_food','🍕',102, 280, 12, 31, 11, 2, ['fast-food']),
  servingFood('deltaco_taco',    'Del Taco (1)',   'Del Taco','fast_food','🌮',78, 170, 8, 11, 10, 2, ['fast-food']),
  servingFood('deltaco_quesadilla','Chicken Quesadilla','Del Taco','fast_food','🫓',184, 450, 23, 38, 23, 2, ['fast-food','high-protein']),
]

// ─── MORE SAM'S CLUB / KIRKLAND ──────────────────────────────────────────────
const SAMS_MORE = [
  food('kirkland_protein_bar','Kirkland Protein Bar','Kirkland','snack','🍫', 60, 333, 35.0, 33.0, 12.0, 17.0, ['high-protein','sams-club']),
  food('kirkland_almonds',  'Kirkland Almonds',      'Kirkland','fat','🥜', 100, 579, 21.0, 22.0, 50.0, 12.5, ['sams-club','whole-food']),
  food('kirkland_trailmix', 'Kirkland Trail Mix',    'Kirkland','snack','🥜', 100, 484, 14.0, 44.0, 31.0, 6.0, ['sams-club']),
  food('kirkland_pb',       'Kirkland Peanut Butter','Kirkland','fat','🥜', 100, 588, 25.0, 20.0, 50.0, 6.0, ['high-protein','sams-club']),
  food('kirkland_whey',     'Kirkland Whey Protein', 'Kirkland','protein','🧴', 31, 387, 77.0, 10.0, 4.8, 1.6, ['high-protein','sams-club']),
  food('kirkland_bacon',    'Kirkland Bacon',        'Kirkland','protein','🥓', 100, 541, 37.0, 1.4, 42.0, 0.0, ['sams-club']),
  food('member_mark_chicken','Members Mark Chicken Breast',"Sam's Club",'protein','🍗', 100, 110, 23.0, 0.0, 2.0, 0.0, ['high-protein','lean','sams-club']),
  food('member_mark_salmon','Members Mark Salmon',  "Sam's Club",'protein','🐟', 100, 161, 22.0, 0.0, 8.0, 0.0, ['high-protein','sams-club','omega-3']),
  food('kirkland_eggs_l',   'Kirkland Large Eggs',   'Kirkland','protein','🥚', 50, 70, 6.0, 0.4, 5.0, 0.0, ['high-protein','sams-club','complete']),
  food('kirkland_quinoa',   'Kirkland Organic Quinoa','Kirkland','carb','🌾', 100, 120, 4.4, 21.0, 1.9, 2.8, ['sams-club','vegan']),
  food('kirkland_oliveoil', 'Kirkland Olive Oil',    'Kirkland','fat','🫒', 100, 884, 0.0, 0.0, 100.0, 0.0, ['sams-club']),
]

const _RAW_FOODS = [
  ...PROTEINS,
  ...WHOLE_FOODS_EXTRA,
  ...SEAFOOD,
  ...MEATS,
  ...PLANT_PROTEIN,
  ...HABESHA,
  ...CARBS,
  ...GRAINS_MORE,
  ...FRUITS_MORE,
  ...VEG_MORE,
  ...DAIRY_MORE,
  ...NUTS_FATS,
  ...CONDIMENTS,
  ...QDOBA,
  ...PANDA_EXPRESS,
  ...KFC,
  ...POPEYES,
  ...IN_N_OUT,
  ...DUNKIN,
  ...RAISING_CANES,
  ...JERSEY_MIKES,
  ...OTHER_CHAINS,
  ...SAMS_MORE,
  ...FRUITS,
  ...VEGETABLES,
  ...DAIRY,
  ...FATS,
  ...MCDONALDS,
  ...BURGER_KING,
  ...CHIPOTLE,
  ...SUBWAY,
  ...CHICKFILA,
  ...TACO_BELL,
  ...WENDYS,
  ...FIVE_GUYS,
  ...STARBUCKS,
  ...PANERA,
  ...PIZZA,
  ...SNACKS,
  ...DRINKS,
]

// De-duplicate by id (keeps the first/original definition on collision)
export const FOODS = _RAW_FOODS.filter((f, i) => _RAW_FOODS.findIndex(x => x.id === f.id) === i)

// Build a search index for fast lookup
export const FOOD_INDEX = new Map(FOODS.map(f => [f.id, f]))

export function searchFoods(query, limit = 20) {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  const results = []
  for (const food of FOODS) {
    const score = (
      (food.name.toLowerCase().startsWith(q) ? 10 : 0) +
      (food.name.toLowerCase().includes(q) ? 5 : 0) +
      (food.brand?.toLowerCase().includes(q) ? 3 : 0) +
      (food.tags.some(t => t.includes(q)) ? 2 : 0)
    )
    if (score > 0) results.push({ food, score })
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit).map(r => r.food)
}

/** Get macros for a specific gram amount */
export function getFoodMacros(food, grams) {
  const ratio = grams / 100
  return {
    kcal:    Math.round(food.per100g.kcal    * ratio),
    protein: +(food.per100g.protein * ratio).toFixed(1),
    carbs:   +(food.per100g.carbs   * ratio).toFixed(1),
    fat:     +(food.per100g.fat     * ratio).toFixed(1),
    fiber:   +(food.per100g.fiber   * ratio).toFixed(1),
  }
}

// ─── Labeling / quality helpers ──────────────────────────────────────────────
// Protein density = grams of protein per 100 kcal. >10 = excellent, 5–10 = good.
export function proteinDensity(food) {
  if (!food.per100g.kcal) return 0
  return +(food.per100g.protein / food.per100g.kcal * 100).toFixed(1)
}

export function proteinQualityLabel(food) {
  const d = proteinDensity(food)
  if (food.per100g.protein < 5) return null
  if (d >= 12) return { label: 'Elite protein', color: 'var(--green)' }
  if (d >= 7)  return { label: 'High protein',  color: 'var(--green)' }
  if (d >= 4)  return { label: 'Good protein',  color: 'var(--yellow)' }
  return null
}

// Micronutrient / quality chips inferred from tags
const NUTRIENT_CHIPS = {
  'omega-3':  { label: 'Omega-3', emoji: '🐟' },
  'iron':     { label: 'Iron',    emoji: '🩸' },
  'b12':      { label: 'B12',     emoji: '⚡' },
  'calcium':  { label: 'Calcium', emoji: '🦴' },
  'complete': { label: 'Complete protein', emoji: '✅' },
  'probiotic':{ label: 'Probiotic', emoji: '🦠' },
  'whole-food': { label: 'Whole food', emoji: '🌿' },
  'lean':     { label: 'Lean',    emoji: '🍃' },
}
export function nutrientChips(food) {
  return (food.tags || []).filter(t => NUTRIENT_CHIPS[t]).map(t => NUTRIENT_CHIPS[t])
}
