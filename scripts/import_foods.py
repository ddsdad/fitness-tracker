"""
Import foods from opennutrition_foods.xlsm into src/data/foods.js.
Strategy: sample ~800 new items across all categories (everyday type first),
skip items already in existing foods.js by name match.
"""
import pandas as pd, json, re

print("Loading nutrition DB (326K rows)...")
df = pd.read_excel('extra info/opennutrition_foods.xlsm', sheet_name='opennutrition_foods')
print(f"Loaded {len(df)} rows")

def parse_nutrition(val):
    try:
        d = json.loads(val)
        kcal = round(d.get('calories', 0))
        protein = round(d.get('protein', 0), 1)
        carbs   = round(d.get('carbohydrates', 0), 1)
        fat     = round(d.get('total_fat', 0), 1)
        fiber   = round(d.get('dietary_fiber', 0), 1)
        if kcal < 1 or kcal > 2000: return None
        if protein < 0 or carbs < 0 or fat < 0: return None
        return {'kcal':kcal,'protein':protein,'carbs':carbs,'fat':fat,'fiber':fiber}
    except: return None

def parse_serving(val):
    try:
        d = json.loads(val)
        m = d.get('metric', {})
        c = d.get('common', {})
        grams = max(1, round(float(m.get('quantity', 100))))
        label = f"{c.get('quantity',1)} {c.get('unit','serving')}"
        return grams, label
    except:
        return 100, '100g'

# Keyword classifiers
CATS = [
    ('protein',  ['chicken','beef','pork','turkey','salmon','tuna','shrimp','cod','tilapia','sardine',
                  'crab','lobster','egg','steak','lamb','bacon','sausage','protein','whey','casein',
                  'bison','venison','duck','ham','pepperoni','jerky','deli','anchovy','herring',
                  'mackerel','trout','perch','halibut','snapper','catfish','mahi','clam','mussel',
                  'oyster','scallop','octopus','squid','tofu','tempeh','seitan']),
    ('dairy',    ['milk','yogurt','cheese','butter','cream','kefir','cottage','ricotta',
                  'mozzarella','cheddar','parmesan','gouda','brie','camembert','feta','ghee',
                  'ice cream','custard','whipped cream','sour cream','cream cheese']),
    ('carb',     ['rice','bread','pasta','oat','wheat','flour','cereal','quinoa','barley',
                  'bagel','muffin','tortilla','noodle','rye','couscous','cracker','pretzel',
                  'waffle','pancake','granola','bulgur','farro','polenta','grits','corn',
                  'potato','sweet potato','yam','pita','wrap','biscuit','croissant','roll',
                  'bun','sourdough','focaccia','ciabatta']),
    ('vegetable',['spinach','broccoli','kale','lettuce','tomato','cucumber','pepper','carrot',
                  'celery','onion','garlic','mushroom','zucchini','asparagus','cauliflower',
                  'cabbage','beet','pea','bean','lentil','chickpea','arugula','chard','collard',
                  'edamame','green bean','eggplant','artichoke','fennel','leek','radish',
                  'turnip','watercress','bok choy','brussels','okra','squash','pumpkin']),
    ('fruit',    ['apple','banana','orange','grape','strawberry','blueberry','mango',
                  'pineapple','watermelon','peach','pear','cherry','raspberry','blackberry',
                  'melon','kiwi','plum','apricot','fig','papaya','guava','lychee',
                  'pomegranate','grapefruit','lemon','lime','avocado','coconut','date',
                  'raisin','cranberry','tangerine','clementine','nectarine','cantaloupe']),
    ('fat',      ['almond','walnut','cashew','peanut','pecan','pistachio','macadamia',
                  'hazelnut','flaxseed','chia seed','sunflower seed','pumpkin seed',
                  'sesame','tahini','olive oil','coconut oil','avocado oil','peanut butter',
                  'almond butter','mixed nuts','trail mix','walnuts']),
    ('fast_food',['mcdonald','burger king','wendy','subway','pizza hut','kfc','taco bell',
                  'chipotle','starbucks','dunkin','chick-fil-a','popeye','five guys',
                  'domino','papa john','shake shack','in-n-out','arby','sonic',
                  'dairy queen','panda express','panera','buffalo wild','applebee']),
    ('snack',    ['chip','cookie','chocolate','candy bar','brownie','cake','donut',
                  'popcorn','protein bar','energy bar','granola bar','rice cake',
                  'gummy bear','pretzel','crackers','trail mix','m&m','oreo','kit kat',
                  'snickers','twix','reese','cheez-it','goldfish','pringle']),
    ('drink',    ['juice','soda','coffee','tea','beer','wine','sports drink','energy drink',
                  'kombucha','almond milk','oat milk','soy milk','coconut water',
                  'smoothie','shake','lemonade','sparkling water','gatorade','powerade']),
]

EMOJI_MAP = {
    'chicken':'🍗','egg':'🥚','salmon':'🐟','tuna':'🐟','cod':'🐟','tilapia':'🐟',
    'shrimp':'🦐','beef':'🥩','steak':'🥩','pork':'🥓','bacon':'🥓','lamb':'🥩',
    'turkey':'🍗','ham':'🥩','sausage':'🌭',
    'milk':'🥛','cheese':'🧀','yogurt':'🫙','butter':'🧈','egg':'🥚',
    'rice':'🍚','bread':'🍞','pasta':'🍝','oat':'🌾','potato':'🥔',
    'sweet potato':'🍠','corn':'🌽','tortilla':'🌮','bagel':'🥯',
    'apple':'🍎','banana':'🍌','orange':'🍊','grape':'🍇','strawberry':'🍓',
    'blueberry':'🫐','mango':'🥭','avocado':'🥑','lemon':'🍋','watermelon':'🍉',
    'pineapple':'🍍','peach':'🍑','cherry':'🍒','pear':'🍐','coconut':'🥥',
    'broccoli':'🥦','spinach':'🥬','carrot':'🥕','tomato':'🍅','pepper':'🫑',
    'mushroom':'🍄','garlic':'🧄','onion':'🧅','lettuce':'🥬','cucumber':'🥒',
    'peanut':'🥜','almond':'🥜','walnut':'🥜','nut':'🥜','seed':'🌱',
    'olive oil':'🫒','tahini':'🌰',
    'coffee':'☕','tea':'🍵','juice':'🥤','beer':'🍺','wine':'🍷',
    'chocolate':'🍫','cookie':'🍪','cake':'🎂','pizza':'🍕','burger':'🍔',
    'protein':'🧴','whey':'🧴','tofu':'🫘','lentil':'🫘','bean':'🫘',
}

def classify(name):
    nl = name.lower()
    for cat, keywords in CATS:
        for kw in keywords:
            if kw in nl:
                emoji = '🍽️'
                for ek, em in EMOJI_MAP.items():
                    if ek in nl:
                        emoji = em
                        break
                return cat, emoji
    return 'protein', '🍽️'

# ── Read existing foods to avoid duplicates ───────────────────────────────────
with open('src/data/foods.js','r',encoding='utf-8') as f:
    existing = f.read()

existing_names_lower = set(n.lower() for n in re.findall(r"'([^']{3,60})',\s*(?:null|'[^']*'),\s*'(?:protein|carb|vegetable|fruit|dairy|fat|fast_food|snack|drink)'", existing))
existing_ids = set(re.findall(r"food\('([^']+)'", existing))
print(f"Existing food items: {len(existing_ids)}")

# ── Parse and classify all rows ───────────────────────────────────────────────
print("Parsing and classifying foods...")
TARGETS = {
    'protein':200,'carb':120,'vegetable':100,'fruit':100,
    'dairy':80,'fat':60,'fast_food':50,'snack':60,'drink':50,
}
buckets = {cat:[] for cat in TARGETS}

for _, row in df.iterrows():
    name = str(row['name']).strip()
    if not name: continue
    if name.lower() in existing_names_lower: continue

    nutr = parse_nutrition(row.get('nutrition_100g','{}'))
    if nutr is None: continue

    food_type = str(row.get('type','')).lower()
    priority = 0 if 'everyday' in food_type else 1

    cat, emoji = classify(name)
    if cat not in TARGETS: continue
    if len(buckets[cat]) >= TARGETS[cat] * 3: continue  # oversample then dedupe

    grams, label = parse_serving(row.get('serving','{}'))

    tags = []
    if nutr['protein'] >= 20: tags.append('high-protein')
    if nutr['fat'] <= 5 and nutr['protein'] >= 15: tags.append('lean')
    if any(w in name.lower() for w in ['cooked','raw','fresh','grilled','baked']): tags.append('whole-food')

    buckets[cat].append({
        'priority': priority,
        'name': name, 'cat': cat, 'emoji': emoji,
        'g': grams, 'label': label,
        'kcal': nutr['kcal'], 'protein': nutr['protein'],
        'carbs': nutr['carbs'], 'fat': nutr['fat'], 'fiber': nutr['fiber'],
        'tags': tags,
    })

# ── Sample from each bucket ───────────────────────────────────────────────────
def slug(name):
    return re.sub(r'[^a-z0-9]+','_',name.lower().strip()).strip('_')[:35]

def safe(s):
    return s.replace("'","\\'").replace('\n',' ').replace('\r','')

lines = [
    '',
    '// ════════════════════════════════════════════════════════════════════════════',
    '// IMPORTED — OpenNutrition Foods Database (opennutrition.com)',
    '// ════════════════════════════════════════════════════════════════════════════',
]

CAT_LABELS = {
    'protein':'PROTEINS (imported)','carb':'GRAINS & CARBS (imported)',
    'vegetable':'VEGETABLES (imported)','fruit':'FRUITS (imported)',
    'dairy':'DAIRY (imported)','fat':'FATS & NUTS (imported)',
    'fast_food':'FAST FOOD (imported)','snack':'SNACKS (imported)',
    'drink':'DRINKS (imported)',
}

seen_ids = set(existing_ids)
total_added = 0

for cat in ['protein','dairy','carb','vegetable','fruit','fat','fast_food','snack','drink']:
    items = sorted(buckets[cat], key=lambda x: x['priority'])[:TARGETS[cat]]
    if not items: continue
    lines.append(f'\n// ── {CAT_LABELS[cat]} ──')
    for item in items:
        eid = slug(item['name'])
        base = eid; ctr = 2
        while eid in seen_ids: eid = f"{base}_{ctr}"; ctr += 1
        seen_ids.add(eid)

        tag_str = '['+','.join(f"'{t}'" for t in item['tags'])+']' if item['tags'] else '[]'
        lines.append(
            f"  food('{eid}', '{safe(item['name'])}', null, '{cat}', "
            f"'{item['emoji']}', {item['g']}, "
            f"{item['kcal']}, {item['protein']}, {item['carbs']}, "
            f"{item['fat']}, {item['fiber']}, {tag_str}),"
        )
        total_added += 1

print(f"Adding {total_added} new food entries")
for cat, items in buckets.items():
    print(f"  {cat}: {min(len(items), TARGETS[cat])}")

insert = '\n'.join(lines) + '\n'

# Find the closing ] of the _RAW_FOODS array (not rfind — that hits wrong bracket)
marker = 'const _RAW_FOODS = ['
start = existing.find(marker)
if start == -1:
    raise ValueError("Could not find _RAW_FOODS array in foods.js")
pos = start + len(marker)
depth = 1
while depth > 0 and pos < len(existing):
    if existing[pos] == '[': depth += 1
    elif existing[pos] == ']': depth -= 1
    pos += 1
insert_pos = pos - 1  # position of the closing ] of _RAW_FOODS

new_content = existing[:insert_pos] + insert + existing[insert_pos:]

with open('src/data/foods.js','w',encoding='utf-8') as f:
    f.write(new_content)

print("Done! foods.js updated.")
