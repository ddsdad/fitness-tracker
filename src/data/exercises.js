// Exercise database — equipment, movement pattern, difficulty, coaching note
// equipment: barbell | dumbbell | cable | machine | bodyweight | bands | kettlebell
// pattern:   push_h | push_v | pull_h | pull_v | hinge | squat | lunge | isolation
// difficulty: 1=beginner  2=intermediate  3=advanced

export const EXERCISES = [

  // ── CHEST ──────────────────────────────────────────────────────────────────
  { id: 'bench_press',      name: 'Barbell Bench Press',       primary: 'chest', secondary: ['front_delts','triceps'],        category: 'compound',  equipment: 'barbell',    pattern: 'push_h', difficulty: 2, tut: 3,   notes: 'Touch chest, feet flat, arch natural' },
  { id: 'incline_bench',    name: 'Incline Barbell Press',     primary: 'chest', secondary: ['front_delts','triceps'],        category: 'compound',  equipment: 'barbell',    pattern: 'push_h', difficulty: 2, tut: 3,   notes: '30–45° incline hits upper chest' },
  { id: 'decline_bench',    name: 'Decline Barbell Press',     primary: 'chest', secondary: ['triceps'],                     category: 'compound',  equipment: 'barbell',    pattern: 'push_h', difficulty: 2, tut: 3,   notes: 'Lower pec emphasis; keep arch controlled' },
  { id: 'db_bench',         name: 'Dumbbell Bench Press',      primary: 'chest', secondary: ['front_delts','triceps'],        category: 'compound',  equipment: 'dumbbell',   pattern: 'push_h', difficulty: 2, tut: 3,   notes: 'Greater ROM at bottom; wrists neutral' },
  { id: 'incline_db',       name: 'Incline Dumbbell Press',    primary: 'chest', secondary: ['front_delts','triceps'],        category: 'compound',  equipment: 'dumbbell',   pattern: 'push_h', difficulty: 2, tut: 3,   notes: 'Great upper-chest stretch at bottom' },
  { id: 'cable_fly_low',    name: 'Cable Fly (Low-to-High)',   primary: 'chest', secondary: ['front_delts'],                  category: 'isolation', equipment: 'cable',      pattern: 'isolation', difficulty: 1, tut: 3, notes: 'Targets upper pec; slight elbow bend' },
  { id: 'cable_fly_high',   name: 'Cable Fly (High-to-Low)',   primary: 'chest', secondary: ['front_delts'],                  category: 'isolation', equipment: 'cable',      pattern: 'isolation', difficulty: 1, tut: 3, notes: 'Targets lower pec; great as finisher' },
  { id: 'pec_deck',         name: 'Pec Deck Machine Fly',      primary: 'chest', secondary: [],                               category: 'isolation', equipment: 'machine',    pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Constant tension; excellent bottom stretch' },
  { id: 'db_fly',           name: 'Dumbbell Fly',              primary: 'chest', secondary: [],                               category: 'isolation', equipment: 'dumbbell',   pattern: 'isolation', difficulty: 2, tut: 3, notes: 'Keep slight elbow bend; prioritise stretch' },
  { id: 'push_up',          name: 'Push-Up',                   primary: 'chest', secondary: ['front_delts','triceps'],        category: 'compound',  equipment: 'bodyweight', pattern: 'push_h', difficulty: 1, tut: 2,   notes: 'Core tight; lower to 1 cm off ground' },
  { id: 'wide_push_up',     name: 'Wide Push-Up',              primary: 'chest', secondary: ['front_delts'],                  category: 'compound',  equipment: 'bodyweight', pattern: 'push_h', difficulty: 1, tut: 2,   notes: 'Wide hands emphasise outer pec' },
  { id: 'dips',             name: 'Chest Dips',                primary: 'chest', secondary: ['triceps','front_delts'],        category: 'compound',  equipment: 'bodyweight', pattern: 'push_h', difficulty: 2, tut: 3,   notes: 'Lean forward to target chest over tris' },
  { id: 'landmine_press',   name: 'Landmine Press',            primary: 'chest', secondary: ['front_delts','triceps'],        category: 'compound',  equipment: 'barbell',    pattern: 'push_h', difficulty: 2, tut: 3,   notes: 'Shoulder-friendly press; single or double arm' },
  { id: 'svend_press',      name: 'Svend Press',               primary: 'chest', secondary: [],                               category: 'isolation', equipment: 'dumbbell',   pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Press plates together; squeeze pecs hard' },

  // ── FRONT DELTS ────────────────────────────────────────────────────────────
  { id: 'ohp',              name: 'Overhead Press (Barbell)',  primary: 'front_delts', secondary: ['side_delts','triceps','traps'], category: 'compound',  equipment: 'barbell',    pattern: 'push_v', difficulty: 3, tut: 3,   notes: 'Brace core; keep bar path vertical' },
  { id: 'db_ohp',           name: 'Dumbbell Shoulder Press',  primary: 'front_delts', secondary: ['side_delts','triceps'],        category: 'compound',  equipment: 'dumbbell',   pattern: 'push_v', difficulty: 2, tut: 3,   notes: 'Greater ROM than barbell; seat upright' },
  { id: 'arnold_press',     name: 'Arnold Press',             primary: 'front_delts', secondary: ['side_delts'],                  category: 'compound',  equipment: 'dumbbell',   pattern: 'push_v', difficulty: 2, tut: 3,   notes: 'Rotate palms through full arc' },
  { id: 'machine_press',    name: 'Machine Shoulder Press',   primary: 'front_delts', secondary: ['side_delts','triceps'],        category: 'compound',  equipment: 'machine',    pattern: 'push_v', difficulty: 1, tut: 3,   notes: 'Ideal for beginners; focus on squeeze at top' },
  { id: 'front_raise',      name: 'Dumbbell Front Raise',     primary: 'front_delts', secondary: [],                              category: 'isolation', equipment: 'dumbbell',   pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Raise to eye level; control descent' },
  { id: 'cable_front_raise',name: 'Cable Front Raise',        primary: 'front_delts', secondary: [],                              category: 'isolation', equipment: 'cable',      pattern: 'isolation', difficulty: 1, tut: 3,   notes: 'Constant tension; great pump' },
  { id: 'pike_push_up',     name: 'Pike Push-Up',             primary: 'front_delts', secondary: ['triceps'],                     category: 'compound',  equipment: 'bodyweight', pattern: 'push_v', difficulty: 2, tut: 2,   notes: 'Elevate feet for harder version' },

  // ── SIDE DELTS ─────────────────────────────────────────────────────────────
  { id: 'lateral_raise',    name: 'Dumbbell Lateral Raise',   primary: 'side_delts', secondary: [],         category: 'isolation', equipment: 'dumbbell', pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Lead with elbows; slight forward lean' },
  { id: 'cable_lateral',    name: 'Cable Lateral Raise',      primary: 'side_delts', secondary: [],         category: 'isolation', equipment: 'cable',    pattern: 'isolation', difficulty: 1, tut: 3,   notes: 'Cable gives tension at bottom ROM' },
  { id: 'machine_lateral',  name: 'Machine Lateral Raise',    primary: 'side_delts', secondary: [],         category: 'isolation', equipment: 'machine',  pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Strict form; no body English' },
  { id: 'upright_row_cable',name: 'Cable Upright Row',        primary: 'side_delts', secondary: ['traps'],  category: 'compound',  equipment: 'cable',    pattern: 'pull_h',    difficulty: 2, tut: 2.5, notes: 'Elbows above wrists; pause at top' },
  { id: 'banded_lateral',   name: 'Banded Lateral Raise',     primary: 'side_delts', secondary: [],         category: 'isolation', equipment: 'bands',    pattern: 'isolation', difficulty: 1, tut: 2,   notes: 'Tension increases at the top — great pump' },

  // ── REAR DELTS ─────────────────────────────────────────────────────────────
  { id: 'face_pull',        name: 'Face Pull',                primary: 'rear_delts', secondary: ['rhomboids','traps'], category: 'isolation', equipment: 'cable',      pattern: 'pull_h',    difficulty: 1, tut: 3,   notes: 'Aim for ears; thumbs back at peak' },
  { id: 'rear_delt_fly',    name: 'Rear Delt Fly (DB)',       primary: 'rear_delts', secondary: ['rhomboids'],          category: 'isolation', equipment: 'dumbbell',   pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Bend 90°; light weight, high reps' },
  { id: 'cable_rear_fly',   name: 'Cable Rear Delt Fly',      primary: 'rear_delts', secondary: [],                     category: 'isolation', equipment: 'cable',      pattern: 'isolation', difficulty: 1, tut: 3,   notes: 'Cross-cable for constant tension' },
  { id: 'incline_y_raise',  name: 'Incline Y-Raise',          primary: 'rear_delts', secondary: ['traps','rhomboids'],  category: 'isolation', equipment: 'dumbbell',   pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Face-down on incline; arms form Y shape' },
  { id: 'band_pull_apart',  name: 'Band Pull-Apart',          primary: 'rear_delts', secondary: ['rhomboids'],          category: 'isolation', equipment: 'bands',      pattern: 'isolation', difficulty: 1, tut: 2,   notes: 'Great for shoulder health; high reps' },

  // ── LATS ───────────────────────────────────────────────────────────────────
  { id: 'deadlift',         name: 'Conventional Deadlift',    primary: 'lats', secondary: ['traps','rhomboids','lower_back','glutes','hamstrings'], category: 'compound', equipment: 'barbell',    pattern: 'hinge',  difficulty: 3, tut: 4,   notes: 'Bar over mid-foot; push floor away' },
  { id: 'barbell_row',      name: 'Barbell Row',              primary: 'lats', secondary: ['rhomboids','rear_delts','biceps','traps'],              category: 'compound', equipment: 'barbell',    pattern: 'pull_h', difficulty: 3, tut: 3,   notes: 'Flat back; drive elbows toward hip' },
  { id: 'pendlay_row',      name: 'Pendlay Row',              primary: 'lats', secondary: ['rhomboids','traps','biceps'],                           category: 'compound', equipment: 'barbell',    pattern: 'pull_h', difficulty: 3, tut: 3,   notes: 'Bar dead-stops each rep; explosive pull' },
  { id: 'db_row',           name: 'Dumbbell Row',             primary: 'lats', secondary: ['rhomboids','rear_delts','biceps'],                      category: 'compound', equipment: 'dumbbell',   pattern: 'pull_h', difficulty: 2, tut: 3,   notes: 'Support on bench; elbow drives past hip' },
  { id: 'pull_up',          name: 'Pull-Up',                  primary: 'lats', secondary: ['biceps','rear_delts','rhomboids'],                      category: 'compound', equipment: 'bodyweight', pattern: 'pull_v', difficulty: 3, tut: 3,   notes: 'Full hang at bottom; chest to bar' },
  { id: 'chin_up',          name: 'Chin-Up',                  primary: 'lats', secondary: ['biceps'],                                               category: 'compound', equipment: 'bodyweight', pattern: 'pull_v', difficulty: 2, tut: 3,   notes: 'Supinated grip; biceps more involved' },
  { id: 'lat_pulldown',     name: 'Lat Pulldown',             primary: 'lats', secondary: ['biceps','rear_delts'],                                  category: 'compound', equipment: 'machine',    pattern: 'pull_v', difficulty: 1, tut: 3,   notes: 'Pull to upper chest; elbows down and back' },
  { id: 'wide_pulldown',    name: 'Wide-Grip Pulldown',       primary: 'lats', secondary: ['rear_delts'],                                           category: 'compound', equipment: 'machine',    pattern: 'pull_v', difficulty: 1, tut: 3,   notes: 'Wide grip for lat width; pull to chin' },
  { id: 'straight_pulldown',name: 'Straight-Arm Pulldown',    primary: 'lats', secondary: [],                                                       category: 'isolation',equipment: 'cable',      pattern: 'isolation', difficulty: 1, tut: 3, notes: 'Arms straight; great mind-muscle connection' },
  { id: 'tbar_row',         name: 'T-Bar Row',                primary: 'lats', secondary: ['rhomboids','biceps','traps'],                           category: 'compound', equipment: 'machine',    pattern: 'pull_h', difficulty: 2, tut: 3,   notes: 'Chest-supported reduces lower-back stress' },

  // ── RHOMBOIDS ──────────────────────────────────────────────────────────────
  { id: 'seated_row',       name: 'Seated Cable Row',         primary: 'rhomboids', secondary: ['lats','rear_delts','biceps','traps'], category: 'compound',  equipment: 'cable',      pattern: 'pull_h', difficulty: 1, tut: 3,   notes: 'Upright torso; squeeze blades at end' },
  { id: 'chest_supp_row',   name: 'Chest-Supported DB Row',   primary: 'rhomboids', secondary: ['lats','rear_delts','biceps'],         category: 'compound',  equipment: 'dumbbell',   pattern: 'pull_h', difficulty: 1, tut: 3,   notes: 'Takes lower back out; pure upper back' },
  { id: 'machine_row',      name: 'Machine Seated Row',       primary: 'rhomboids', secondary: ['lats','biceps'],                      category: 'compound',  equipment: 'machine',    pattern: 'pull_h', difficulty: 1, tut: 3,   notes: 'Neutral grip; pause and squeeze' },

  // ── TRAPS ──────────────────────────────────────────────────────────────────
  { id: 'shrugs',           name: 'Barbell Shrugs',           primary: 'traps', secondary: [], category: 'isolation', equipment: 'barbell',  pattern: 'isolation', difficulty: 1, tut: 2,   notes: 'Straight up; hold 1 s at top; no rolling' },
  { id: 'db_shrugs',        name: 'Dumbbell Shrugs',          primary: 'traps', secondary: [], category: 'isolation', equipment: 'dumbbell', pattern: 'isolation', difficulty: 1, tut: 2,   notes: 'Arms at sides; full ROM' },
  { id: 'cable_shrugs',     name: 'Cable Shrugs',             primary: 'traps', secondary: [], category: 'isolation', equipment: 'cable',    pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Constant tension at the bottom position' },

  // ── BICEPS ─────────────────────────────────────────────────────────────────
  { id: 'barbell_curl',     name: 'Barbell Curl',             primary: 'biceps', secondary: ['forearms'],  category: 'isolation', equipment: 'barbell',    pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Elbows pinned to sides; control eccentric' },
  { id: 'db_curl',          name: 'Dumbbell Curl',            primary: 'biceps', secondary: ['forearms'],  category: 'isolation', equipment: 'dumbbell',   pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Supinate at top for peak contraction' },
  { id: 'incline_curl',     name: 'Incline Dumbbell Curl',    primary: 'biceps', secondary: [],            category: 'isolation', equipment: 'dumbbell',   pattern: 'isolation', difficulty: 2, tut: 3,   notes: 'Extreme long-head stretch at the bottom' },
  { id: 'cable_curl',       name: 'Cable Curl',               primary: 'biceps', secondary: ['forearms'],  category: 'isolation', equipment: 'cable',      pattern: 'isolation', difficulty: 1, tut: 3,   notes: 'Constant tension; rope or bar attachment' },
  { id: 'preacher_curl',    name: 'Preacher Curl',            primary: 'biceps', secondary: [],            category: 'isolation', equipment: 'machine',    pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Locks elbows; focused peak bicep tension' },
  { id: 'conc_curl',        name: 'Concentration Curl',       primary: 'biceps', secondary: [],            category: 'isolation', equipment: 'dumbbell',   pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Elbow on inner thigh; full supination' },
  { id: 'ez_curl',          name: 'EZ-Bar Curl',              primary: 'biceps', secondary: ['forearms'],  category: 'isolation', equipment: 'barbell',    pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Easier on wrists than straight bar' },

  // ── FOREARMS ───────────────────────────────────────────────────────────────
  { id: 'hammer_curl',      name: 'Hammer Curl',              primary: 'forearms', secondary: ['biceps'],  category: 'isolation', equipment: 'dumbbell',   pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Neutral grip; hits brachialis & brachioradialis' },
  { id: 'reverse_curl',     name: 'Reverse Curl',             primary: 'forearms', secondary: ['biceps'],  category: 'isolation', equipment: 'barbell',    pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Pronated grip; great for extensors' },
  { id: 'wrist_curl',       name: 'Wrist Curl',               primary: 'forearms', secondary: [],          category: 'isolation', equipment: 'barbell',    pattern: 'isolation', difficulty: 1, tut: 2,   notes: 'Forearms on thighs; full ROM' },
  { id: 'farmers_walk',     name: "Farmer's Carry",           primary: 'forearms', secondary: ['traps','abs'], category: 'compound', equipment: 'dumbbell', pattern: 'isolation', difficulty: 1, tut: 1,   notes: 'Stand tall; walk 20 m for grip and trap gains' },

  // ── LOWER BACK ─────────────────────────────────────────────────────────────
  { id: 'hyperextension',   name: 'Back Extension',           primary: 'lower_back', secondary: ['glutes','hamstrings'], category: 'isolation', equipment: 'machine',    pattern: 'hinge', difficulty: 1, tut: 2.5, notes: 'Round bottom, extend to neutral only' },
  { id: 'good_morning',     name: 'Good Morning',             primary: 'lower_back', secondary: ['hamstrings','glutes'], category: 'compound', equipment: 'barbell',    pattern: 'hinge', difficulty: 3, tut: 3,   notes: 'Slight knee bend; hinge at hips' },
  { id: 'cable_pull_thru',  name: 'Cable Pull-Through',       primary: 'lower_back', secondary: ['glutes','hamstrings'], category: 'compound', equipment: 'cable',      pattern: 'hinge', difficulty: 1, tut: 3,   notes: 'Hip hinge with cable; great for beginners' },
  { id: 'bw_back_ext',      name: 'Bodyweight Back Extension',primary: 'lower_back', secondary: ['glutes'],              category: 'isolation', equipment: 'bodyweight', pattern: 'hinge', difficulty: 1, tut: 2,   notes: 'On floor or bench; squeeze glutes at top' },

  // ── HAMSTRINGS ─────────────────────────────────────────────────────────────
  { id: 'rdl',              name: 'Romanian Deadlift',        primary: 'hamstrings', secondary: ['glutes','lower_back'], category: 'compound',  equipment: 'barbell',    pattern: 'hinge',     difficulty: 2, tut: 3.5, notes: 'Hinge at hips; bar stays close to legs' },
  { id: 'db_rdl',           name: 'Dumbbell RDL',             primary: 'hamstrings', secondary: ['glutes','lower_back'], category: 'compound',  equipment: 'dumbbell',   pattern: 'hinge',     difficulty: 2, tut: 3,   notes: 'Same as barbell; easier to learn form' },
  { id: 'leg_curl',         name: 'Lying Leg Curl',           primary: 'hamstrings', secondary: [],                      category: 'isolation', equipment: 'machine',    pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Toes pointed; full ROM; control eccentric' },
  { id: 'seated_leg_curl',  name: 'Seated Leg Curl',          primary: 'hamstrings', secondary: [],                      category: 'isolation', equipment: 'machine',    pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Seated version gives better stretch' },
  { id: 'nordic_curl',      name: 'Nordic Hamstring Curl',    primary: 'hamstrings', secondary: ['lower_back'],          category: 'compound',  equipment: 'bodyweight', pattern: 'hinge',     difficulty: 3, tut: 4,   notes: 'Hardest BW hamstring exercise; use pad' },
  { id: 'swiss_ball_curl',  name: 'Swiss Ball Leg Curl',      primary: 'hamstrings', secondary: ['glutes'],              category: 'isolation', equipment: 'bodyweight', pattern: 'isolation', difficulty: 2, tut: 3,   notes: 'Keep hips high; pull heels to glutes' },
  { id: 'kb_swing',         name: 'Kettlebell Swing',         primary: 'hamstrings', secondary: ['glutes','lower_back'], category: 'compound',  equipment: 'kettlebell', pattern: 'hinge',     difficulty: 2, tut: 1.5, notes: 'Hip hinge power; do not squat it down' },

  // ── GLUTES ─────────────────────────────────────────────────────────────────
  { id: 'sumo_dl',          name: 'Sumo Deadlift',            primary: 'glutes', secondary: ['hamstrings','quads','lower_back'], category: 'compound',  equipment: 'barbell',    pattern: 'hinge',     difficulty: 3, tut: 4,   notes: 'Wide stance; toes out; drive floor apart' },
  { id: 'hip_thrust',       name: 'Barbell Hip Thrust',       primary: 'glutes', secondary: ['hamstrings'],                      category: 'compound',  equipment: 'barbell',    pattern: 'hinge',     difficulty: 2, tut: 2.5, notes: 'Full hip extension; squeeze hard at top' },
  { id: 'db_hip_thrust',    name: 'Dumbbell Hip Thrust',      primary: 'glutes', secondary: ['hamstrings'],                      category: 'compound',  equipment: 'dumbbell',   pattern: 'hinge',     difficulty: 1, tut: 2.5, notes: 'Great beginner version of hip thrust' },
  { id: 'glute_bridge',     name: 'Glute Bridge (BW)',        primary: 'glutes', secondary: ['hamstrings'],                      category: 'compound',  equipment: 'bodyweight', pattern: 'hinge',     difficulty: 1, tut: 2,   notes: 'Feet flat; drive hips to full extension' },
  { id: 'cable_kickback',   name: 'Cable Glute Kickback',     primary: 'glutes', secondary: [],                                  category: 'isolation', equipment: 'cable',      pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Hinge slightly forward; squeeze at peak' },
  { id: 'donkey_kickback',  name: 'Donkey Kickback (BW)',     primary: 'glutes', secondary: [],                                  category: 'isolation', equipment: 'bodyweight', pattern: 'isolation', difficulty: 1, tut: 2,   notes: 'All fours; drive heel to ceiling' },

  // ── QUADS ──────────────────────────────────────────────────────────────────
  { id: 'squat',            name: 'Barbell Back Squat',       primary: 'quads', secondary: ['glutes','hamstrings','lower_back'], category: 'compound',  equipment: 'barbell',    pattern: 'squat',     difficulty: 3, tut: 4,   notes: 'Hip-width stance; knees track toes' },
  { id: 'front_squat',      name: 'Front Squat',              primary: 'quads', secondary: ['glutes','abs'],                     category: 'compound',  equipment: 'barbell',    pattern: 'squat',     difficulty: 3, tut: 4,   notes: 'More upright torso; great for quad sweep' },
  { id: 'leg_press',        name: 'Leg Press',                primary: 'quads', secondary: ['glutes','hamstrings'],              category: 'compound',  equipment: 'machine',    pattern: 'squat',     difficulty: 1, tut: 3.5, notes: "Full ROM; knees don't cave inward" },
  { id: 'hack_squat',       name: 'Hack Squat',               primary: 'quads', secondary: ['glutes'],                           category: 'compound',  equipment: 'machine',    pattern: 'squat',     difficulty: 2, tut: 3.5, notes: 'Low foot placement maximises quad tension' },
  { id: 'leg_extension',    name: 'Leg Extension',            primary: 'quads', secondary: [],                                   category: 'isolation', equipment: 'machine',    pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Full extension; 1 s hold at top' },
  { id: 'goblet_squat',     name: 'Goblet Squat',             primary: 'quads', secondary: ['glutes'],                           category: 'compound',  equipment: 'dumbbell',   pattern: 'squat',     difficulty: 1, tut: 3,   notes: 'Dumbbell at chest; great for form builders' },
  { id: 'bss',              name: 'Bulgarian Split Squat',    primary: 'quads', secondary: ['glutes','hamstrings'],               category: 'compound',  equipment: 'dumbbell',   pattern: 'lunge',     difficulty: 3, tut: 3.5, notes: 'Rear foot elevated; front knee tracks toe' },
  { id: 'lunge',            name: 'Walking Lunge',            primary: 'quads', secondary: ['glutes','hamstrings'],               category: 'compound',  equipment: 'dumbbell',   pattern: 'lunge',     difficulty: 2, tut: 3,   notes: 'Long stride; back knee approaches floor' },
  { id: 'step_up',          name: 'Step-Up (DB)',             primary: 'quads', secondary: ['glutes'],                            category: 'compound',  equipment: 'dumbbell',   pattern: 'lunge',     difficulty: 1, tut: 2.5, notes: 'Drive through heel; keep torso upright' },
  { id: 'sissy_squat',      name: 'Sissy Squat',              primary: 'quads', secondary: [],                                   category: 'isolation', equipment: 'bodyweight', pattern: 'squat',     difficulty: 3, tut: 3,   notes: 'Heels elevated; extreme quad tension — advanced' },
  { id: 'wall_sit',         name: 'Wall Sit',                 primary: 'quads', secondary: [],                                   category: 'isolation', equipment: 'bodyweight', pattern: 'squat',     difficulty: 1, tut: 1,   notes: 'Isometric hold; 45–60 s per set' },

  // ── CALVES ─────────────────────────────────────────────────────────────────
  { id: 'calf_raise',       name: 'Standing Calf Raise',      primary: 'calves', secondary: [], category: 'isolation', equipment: 'machine',    pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Full stretch at bottom; 2 s hold at top' },
  { id: 'seated_calf',      name: 'Seated Calf Raise',        primary: 'calves', secondary: [], category: 'isolation', equipment: 'machine',    pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Targets soleus; slow controlled reps' },
  { id: 'bw_calf_raise',    name: 'Bodyweight Calf Raise',    primary: 'calves', secondary: [], category: 'isolation', equipment: 'bodyweight', pattern: 'isolation', difficulty: 1, tut: 2,   notes: 'Step edge for full ROM; single-leg for progression' },
  { id: 'db_calf_raise',    name: 'Dumbbell Calf Raise',      primary: 'calves', secondary: [], category: 'isolation', equipment: 'dumbbell',   pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Hold dumbbells; stand on step for stretch' },

  // ── ABS ────────────────────────────────────────────────────────────────────
  { id: 'plank',            name: 'Plank',                    primary: 'abs', secondary: ['lower_back'],   category: 'bodyweight', equipment: 'bodyweight', pattern: 'isolation', difficulty: 1, tut: 1,   notes: 'Neutral spine; squeeze glutes; 30–60 s holds' },
  { id: 'crunch',           name: 'Crunch',                   primary: 'abs', secondary: [],               category: 'bodyweight', equipment: 'bodyweight', pattern: 'isolation', difficulty: 1, tut: 2,   notes: "Hands behind head; don't pull neck" },
  { id: 'cable_crunch',     name: 'Cable Crunch',             primary: 'abs', secondary: [],               category: 'isolation',  equipment: 'cable',      pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Kneel; hips stay back; crunch toward knees' },
  { id: 'leg_raise',        name: 'Hanging Leg Raise',        primary: 'abs', secondary: ['forearms'],      category: 'bodyweight', equipment: 'bodyweight', pattern: 'isolation', difficulty: 3, tut: 3,   notes: 'Dead hang; slow raise to 90°' },
  { id: 'knee_raise',       name: 'Hanging Knee Raise',       primary: 'abs', secondary: ['forearms'],      category: 'bodyweight', equipment: 'bodyweight', pattern: 'isolation', difficulty: 2, tut: 2.5, notes: 'Easier version of leg raise; great starter' },
  { id: 'ab_wheel',         name: 'Ab Wheel Rollout',         primary: 'abs', secondary: ['lower_back','lats'], category: 'bodyweight', equipment: 'bodyweight', pattern: 'isolation', difficulty: 3, tut: 4, notes: 'Keep hips in line; start kneeling' },
  { id: 'russian_twist',    name: 'Russian Twist',            primary: 'abs', secondary: [],               category: 'bodyweight', equipment: 'dumbbell',   pattern: 'isolation', difficulty: 1, tut: 2,   notes: 'Feet off floor; rotate side to side' },
  { id: 'cable_woodchop',   name: 'Cable Woodchop',           primary: 'abs', secondary: [],               category: 'isolation',  equipment: 'cable',      pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Rotational core; keep hips square' },
  { id: 'dead_bug',         name: 'Dead Bug',                 primary: 'abs', secondary: ['lower_back'],   category: 'bodyweight', equipment: 'bodyweight', pattern: 'isolation', difficulty: 1, tut: 2,   notes: 'Lower back pressed to floor throughout' },

  // ── TRICEPS ────────────────────────────────────────────────────────────────
  { id: 'pushdown',         name: 'Cable Pushdown (Bar)',     primary: 'triceps', secondary: [], category: 'isolation', equipment: 'cable',      pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Elbows in; lock out fully each rep' },
  { id: 'rope_pushdown',    name: 'Rope Pushdown',            primary: 'triceps', secondary: [], category: 'isolation', equipment: 'cable',      pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Spread rope at bottom for lateral head' },
  { id: 'skull_crusher',    name: 'Skull Crusher (EZ Bar)',   primary: 'triceps', secondary: [], category: 'isolation', equipment: 'barbell',    pattern: 'isolation', difficulty: 2, tut: 2.5, notes: 'Lower to forehead; flare elbows slightly' },
  { id: 'overhead_ext',     name: 'Overhead Tricep Ext (DB)', primary: 'triceps', secondary: [], category: 'isolation', equipment: 'dumbbell',   pattern: 'isolation', difficulty: 1, tut: 2.5, notes: 'Full stretch at bottom targets long head' },
  { id: 'cable_overhead',   name: 'Cable Overhead Ext',       primary: 'triceps', secondary: [], category: 'isolation', equipment: 'cable',      pattern: 'isolation', difficulty: 1, tut: 3,   notes: 'Constant tension in lengthened position' },
  { id: 'close_grip_bench', name: 'Close Grip Bench Press',  primary: 'triceps', secondary: ['chest','front_delts'], category: 'compound', equipment: 'barbell', pattern: 'push_h', difficulty: 2, tut: 3, notes: 'Shoulder-width grip; elbows stay close' },
  { id: 'tricep_dip',       name: 'Tricep Bench Dip',         primary: 'triceps', secondary: [], category: 'compound',  equipment: 'bodyweight', pattern: 'push_h',    difficulty: 1, tut: 2,   notes: 'Feet out for more tricep; control depth' },
  { id: 'diamond_push_up',  name: 'Diamond Push-Up',          primary: 'triceps', secondary: ['chest'], category: 'compound', equipment: 'bodyweight', pattern: 'push_h', difficulty: 2, tut: 2, notes: 'Hands form diamond; lower slowly' },
]

export const EQUIPMENT_LABELS = {
  barbell:    'Barbell',
  dumbbell:   'Dumbbell',
  cable:      'Cable',
  machine:    'Machine',
  bodyweight: 'Bodyweight',
  bands:      'Bands',
  kettlebell: 'Kettlebell',
}

export const EQUIPMENT_EMOJI = {
  barbell:    '🏋️',
  dumbbell:   '🔵',
  cable:      '🔗',
  machine:    '⚙️',
  bodyweight: '🤸',
  bands:      '🎗️',
  kettlebell: '🫙',
}

export const EXERCISE_CATEGORIES = ['compound', 'isolation', 'bodyweight']

export function getExerciseById(id) {
  return EXERCISES.find(e => e.id === id)
}

export function getExercisesByMuscle(muscle) {
  return EXERCISES.filter(e => e.primary === muscle || e.secondary.includes(muscle))
}

export function searchExercises(query) {
  const q = query.toLowerCase()
  return EXERCISES.filter(e => e.name.toLowerCase().includes(q))
}
