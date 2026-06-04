"""
Import exercises from Functional Fitness Exercise Database v2.9
into src/data/exercises.js — appends new exercises (deduped by name).
Strategy: gym equipment only (barbell/dumbbell/cable/machine/bodyweight/bands),
cap at 25 new exercises per muscle group = ~350-500 total new exercises.
"""
import pandas as pd, re

df = pd.read_excel(
    'extra info/Functional+Fitness+Exercise+Database+(version+2.9).xlsx',
    sheet_name='Exercises', header=15
)
df = df[df['Exercise'].notna()].copy()

MUSCLE_MAP = {
    'Abdominals':'abs','Abductors':'glutes','Adductors':'glutes',
    'Biceps':'biceps','Calves':'calves','Chest':'chest',
    'Forearms':'forearms','Glutes':'glutes','Hamstrings':'hamstrings',
    'Hip Flexors':'abs','Quadriceps':'quads','Shins':'calves',
    'Shoulders':'front_delts','Trapezius':'traps','Trapezius ':'traps',
    'Triceps':'triceps','Back':'lats',
    'Gluteus Maximus':'glutes','Gluteus Medius':'glutes',
    'Biceps Femoris':'hamstrings','Semitendinosus':'hamstrings',
    'Rectus Femoris':'quads','Vastus Lateralis':'quads','Vastus Medialis':'quads',
    'Gastrocnemius':'calves','Soleus':'calves','Tibialis Anterior':'calves',
    'Pectoralis Major':'chest','Pectoralis Minor':'chest','Serratus Anterior':'chest',
    'Anterior Deltoid':'front_delts','Deltoid':'front_delts',
    'Lateral Deltoid':'side_delts','Posterior Deltoid':'rear_delts',
    'Infraspinatus':'rear_delts','Teres Minor':'rear_delts',
    'Latissimus Dorsi':'lats','Teres Major':'lats',
    'Rhomboids':'rhomboids','Rhomboid Major':'rhomboids','Rhomboid Minor':'rhomboids',
    'Upper Trapezius':'traps',
    'Biceps Brachii':'biceps','Brachialis':'biceps',
    'Brachioradialis':'forearms','Wrist Flexors':'forearms','Wrist Extensors':'forearms',
    'Triceps Brachii':'triceps',
    'Rectus Abdominis':'abs','Obliques':'abs','Transverse Abdominis':'abs',
    'External Oblique':'abs',
    'Erector Spinae':'lower_back','Multifidus':'lower_back','Quadratus Lumborum':'lower_back',
    'Iliopsoas':'abs','Iliacus':'abs','Psoas Major':'abs',
    'Hip Adductors':'glutes','Hip Abductors':'glutes',
    'Subscapularis':'chest','Supraspinatus':'side_delts',
}
EQUIP_MAP = {
    'Barbell':'barbell','EZ Bar':'barbell','Trap Bar':'barbell','Landmine':'barbell',
    'Weight Plate':'dumbbell','Dumbbell':'dumbbell',
    'Cable':'cable',
    'Bodyweight':'bodyweight','Pull Up Bar':'bodyweight','Parallette Bars':'bodyweight',
    'Gymnastic Rings':'bodyweight','Stability Ball':'bodyweight','Sliders':'bodyweight',
    'Suspension Trainer':'bodyweight','Ab Wheel':'bodyweight',
    'Resistance Band':'bands','Superband':'bands','Miniband':'bands',
    # Machine types
    'Machine':'machine','Medicine Ball':'machine',
}
PATTERN_MAP = {
    'Horizontal Push':'push_h','Vertical Push':'push_v',
    'Horizontal Pull':'pull_h','Vertical Pull':'pull_v',
    'Hip Hinge':'hinge','Hip Extension':'hinge',
    'Knee Dominant':'squat','Locomotion':'lunge',
    'Elbow Flexion':'isolation','Elbow Extension':'isolation',
    'Ankle Plantar Flexion':'isolation','Spinal Flexion':'isolation',
    'Rotational':'isolation','Anti-Rotational':'isolation',
    'Anti-Extension':'isolation','Isometric Hold':'isolation',
    'Shoulder External Rotation':'isolation','Loaded Carry':'isolation',
    'Hip Adduction':'isolation','Hip Abduction':'isolation',
}
DIFF_MAP = {
    'Beginner':1,'Novice':1,'Intermediate':2,
    'Advanced':3,'Expert':3,'Master':3,'Grand Master':3,'Legendary':3,
}

GYM_EQUIP = {'barbell','dumbbell','cable','bodyweight','bands','machine'}
MAX_PER_MUSCLE = 25  # cap per muscle group

def slug(name):
    return re.sub(r'[^a-z0-9]+','_',name.lower().strip()).strip('_')[:40]

def map_m(val):
    if pd.isna(val): return None
    return MUSCLE_MAP.get(str(val).strip())

with open('src/data/exercises.js','r',encoding='utf-8') as f:
    existing = f.read()

existing_names = set(re.findall(r"name:\s*'([^']+)'", existing))
existing_ids   = set(re.findall(r"id:\s*'([^']+)'", existing))
print(f"Existing exercises: {len(existing_names)}")

# Sort by difficulty so we get beginner/intermediate exercises first (more useful)
DIFF_ORDER = {'Beginner':0,'Novice':1,'Intermediate':2,'Advanced':3,'Expert':4,'Master':5,'Grand Master':6,'Legendary':7}
df['_diff_order'] = df['Difficulty Level'].map(DIFF_ORDER).fillna(3)
df = df.sort_values('_diff_order')

new_exercises = []
seen_ids   = set(existing_ids)
seen_names = set(existing_names)
muscle_count = {}

for _, row in df.iterrows():
    name = str(row['Exercise']).strip()
    if not name or name in seen_names: continue

    equip_raw = str(row.get('Primary Equipment ','') or '').strip()
    equip = EQUIP_MAP.get(equip_raw)
    if not equip or equip not in GYM_EQUIP: continue

    primary = map_m(row.get('Target Muscle Group '))
    if not primary:
        primary = map_m(row.get('Prime Mover Muscle'))
    if not primary: continue

    # Refine Shoulders/Back using Prime Mover
    pm = map_m(row.get('Prime Mover Muscle'))
    if primary == 'front_delts' and pm in ('side_delts','rear_delts'): primary = pm
    if primary == 'lats' and pm in ('rhomboids','traps','lower_back'): primary = pm

    # Cap per muscle group
    if muscle_count.get(primary, 0) >= MAX_PER_MUSCLE: continue

    secondaries = []
    for col in ['Prime Mover Muscle','Secondary Muscle','Tertiary Muscle']:
        m = map_m(row.get(col))
        if m and m != primary and m not in secondaries: secondaries.append(m)

    mech = str(row.get('Mechanics','') or '').strip()
    cat  = 'compound' if mech == 'Compound' else 'isolation'
    pat  = PATTERN_MAP.get(str(row.get('Movement Pattern #1','') or '').strip(), 'isolation')
    diff = DIFF_MAP.get(str(row.get('Difficulty Level','') or '').strip(), 2)

    eid = slug(name)
    base = eid; ctr = 2
    while eid in seen_ids: eid = f"{base}_{ctr}"; ctr += 1

    seen_ids.add(eid); seen_names.add(name)
    muscle_count[primary] = muscle_count.get(primary,0) + 1

    new_exercises.append({
        'id':eid,'name':name,'primary':primary,'secondary':secondaries,
        'category':cat,'equipment':equip,'pattern':pat,'difficulty':diff,
    })

print(f"New exercises to add: {len(new_exercises)}")
print("Per muscle:", {k:v for k,v in sorted(muscle_count.items())})

# ── Generate JS ────────────────────────────────────────────────────────────────
MUSCLE_ORDER = [
    'chest','front_delts','side_delts','rear_delts',
    'lats','rhomboids','traps','biceps','forearms','triceps',
    'lower_back','glutes','hamstrings','quads','calves','abs',
]
MUSCLE_LABELS = {
    'chest':'CHEST','front_delts':'FRONT DELTS','side_delts':'SIDE DELTS',
    'rear_delts':'REAR DELTS','lats':'LATS','rhomboids':'RHOMBOIDS',
    'traps':'TRAPS','biceps':'BICEPS','forearms':'FOREARMS','triceps':'TRICEPS',
    'lower_back':'LOWER BACK','glutes':'GLUTES','hamstrings':'HAMSTRINGS',
    'quads':'QUADS','calves':'CALVES','abs':'ABS',
}

by_muscle = {m:[] for m in MUSCLE_ORDER}
for ex in new_exercises:
    if ex['primary'] in by_muscle: by_muscle[ex['primary']].append(ex)

def sec_str(lst):
    return '[]' if not lst else '['+','.join(f"'{s}'" for s in lst)+']'

lines = [
    '',
    '  // ════════════════════════════════════════════════════════════════════════',
    '  // IMPORTED — Functional Fitness Exercise Database v2.9',
    '  // ════════════════════════════════════════════════════════════════════════',
]
for muscle in MUSCLE_ORDER:
    group = by_muscle.get(muscle,[])
    if not group: continue
    lines.append(f"\n  // ── {MUSCLE_LABELS[muscle]} (imported) ──")
    for ex in group:
        n = ex['name'].replace("'","\\'")
        lines.append(
            f"  {{ id: '{ex['id']}', name: '{n}', primary: '{ex['primary']}', "
            f"secondary: {sec_str(ex['secondary'])}, category: '{ex['category']}', "
            f"equipment: '{ex['equipment']}', pattern: '{ex['pattern']}', "
            f"difficulty: {ex['difficulty']}, tut: 3, notes: '' }},"
        )

insert = '\n'.join(lines)
# Find the closing ] of the EXERCISES array using bracket-depth matching
marker = 'export const EXERCISES = ['
start = existing.find(marker)
if start == -1:
    raise ValueError("Could not find EXERCISES array in exercises.js")
pos = start + len(marker)
depth = 1
while depth > 0 and pos < len(existing):
    if existing[pos] == '[': depth += 1
    elif existing[pos] == ']': depth -= 1
    pos += 1
insert_pos = pos - 1  # position of the closing ] of EXERCISES
new_content = existing[:insert_pos] + insert + '\n' + existing[insert_pos:]

with open('src/data/exercises.js','w',encoding='utf-8') as f:
    f.write(new_content)

print("Done!")
