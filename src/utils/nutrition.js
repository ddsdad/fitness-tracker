import { FOODS, getFoodMacros, searchFoods } from '../data/foods.js'

// ─── TDEE & MACRO TARGETS ────────────────────────────────────────────────────

const ACTIVITY_MULTS = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
}

// MET values for exercise types (kcal/kg/hour = MET)
const SESSION_METS = {
  quick:       4.5,   // light supersets
  standard:    5.0,   // straight sets
  performance: 6.0,   // heavy compound
  superset:    5.5,
  circuit:     7.5,   // circuit conditioning
  deload:      3.5,
  default:     5.0,
}

const EXTRA_ACTIVITY_METS = {
  run_easy:    8.0,
  run_moderate:10.0,
  run_hard:   12.5,
  walk:        3.5,
  cycling:     8.0,
  swimming:    7.0,
  soccer:      8.5,
  basketball:  8.0,
  tennis:      7.5,
  yoga:        3.0,
  hiit:        9.0,
}

export const EXTRA_ACTIVITIES = [
  { id: 'run_easy',    label: 'Easy Run',    emoji: '🏃', met: 8.0 },
  { id: 'run_moderate',label: 'Moderate Run',emoji: '🏃', met: 10.0 },
  { id: 'run_hard',    label: 'Hard Run',    emoji: '🏃', met: 12.5 },
  { id: 'walk',        label: 'Walk',        emoji: '🚶', met: 3.5 },
  { id: 'cycling',     label: 'Cycling',     emoji: '🚴', met: 8.0 },
  { id: 'swimming',    label: 'Swimming',    emoji: '🏊', met: 7.0 },
  { id: 'soccer',      label: 'Soccer',      emoji: '⚽', met: 8.5 },
  { id: 'basketball',  label: 'Basketball',  emoji: '🏀', met: 8.0 },
  { id: 'tennis',      label: 'Tennis',      emoji: '🎾', met: 7.5 },
  { id: 'yoga',        label: 'Yoga',        emoji: '🧘', met: 3.0 },
  { id: 'hiit',        label: 'HIIT',        emoji: '⚡', met: 9.0 },
]

/**
 * Mifflin-St Jeor BMR
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number} age (defaults to 25 if unknown)
 * @param {'male'|'female'} gender
 */
export function calculateBMR(weightKg, heightCm, age = 25, gender = 'male') {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(gender === 'female' ? base - 161 : base + 5)
}

/** Calculate calorie burn for a single workout session */
function sessionBurn(session, weightKg) {
  const met  = SESSION_METS[session.sessionType] ?? SESSION_METS.default
  const mins = session.duration || 45
  return Math.round(met * weightKg * (mins / 60))
}

/** Calculate calorie burn for a single extra activity */
export function activityBurn(activityId, durationMins, weightKg) {
  const met = EXTRA_ACTIVITY_METS[activityId] ?? 5.0
  return Math.round(met * weightKg * (durationMins / 60))
}

/**
 * Full TDEE for today, including:
 *  - Base: BMR × activity multiplier
 *  - Bonus: workout sessions today + extra activities today
 */
export function calculateTDEE(profile, todaySessions = [], todayExtraActivities = []) {
  const bwKg  = profile.unit === 'kg' ? profile.bodyweight : profile.bodyweight / 2.2046
  const htCm  = profile.unit === 'kg' ? profile.height    : profile.height    * 2.54
  const age   = profile.age   || 25
  const bmr   = calculateBMR(bwKg, htCm, age, profile.gender || 'male')
  const mult  = ACTIVITY_MULTS[profile.activityLevel] ?? 1.55
  const base  = Math.round(bmr * mult)

  const workoutBonus   = todaySessions.reduce((s, sess) => s + sessionBurn(sess, bwKg), 0)
  const extraBonus     = todayExtraActivities.reduce((s, a) => s + activityBurn(a.type, a.duration, bwKg), 0)

  return { base, workoutBonus, extraBonus, total: base + workoutBonus + extraBonus }
}

/** Macro split based on goal and bodyweight */
export function calculateMacroTargets(tdee, goal, bwKg, caloricMode = 'lean_bulk') {
  // Caloric adjustment
  const calAdj = { aggressive_bulk: 500, lean_bulk: 200, maintenance: 0, cut: -400 }
  const targetKcal = Math.round(tdee + (calAdj[caloricMode] ?? 0))

  // Protein: g/kg based on goal
  const proteinRatio = goal === 'fat_loss' ? 2.2 : goal === 'strength' ? 2.0 : 1.8
  const protein = Math.round(bwKg * proteinRatio)

  // Fat: 25–30% of target kcal
  const fatPct  = caloricMode === 'cut' ? 0.28 : 0.25
  const fat     = Math.round((targetKcal * fatPct) / 9)

  // Carbs: remainder
  const carbs   = Math.round((targetKcal - protein * 4 - fat * 9) / 4)

  return { kcal: targetKcal, protein, carbs: Math.max(carbs, 50), fat, fiber: Math.round(targetKcal / 1000 * 14) }
}

// ─── SMART FOOD RECOMMENDER ──────────────────────────────────────────────────

/**
 * Given remaining macro budget, score each food and return top N recommendations
 * with a suggested gram amount.
 */
export function getFoodRecommendations(remaining, n = 5) {
  const { kcal: remKcal, protein: remP, carbs: remC, fat: remF } = remaining

  if (remKcal <= 30) return []

  const candidates = []

  for (const food of FOODS) {
    // Skip drinks with 0 calories for recommender
    if (food.category === 'drink' && food.per100g.kcal === 0) continue

    // Find a serving size that fits within remaining calories
    // Try: full default serving, 75%, 50%
    const defaultG = food.serving.amount
    let grams = defaultG

    const macrosFull = getFoodMacros(food, grams)
    if (macrosFull.kcal > remKcal * 1.05) {
      grams = Math.floor((remKcal / macrosFull.kcal) * defaultG / 25) * 25  // round to nearest 25g
      if (grams < 20) continue
    }

    const macros = getFoodMacros(food, grams)
    if (macros.kcal === 0 || macros.kcal > remKcal * 1.1) continue

    // Score: weighted by how well it fills the most urgent deficit
    const proteinUrgency = remP > 0 ? (remP / Math.max(1, remC * 0.3 + remF * 0.2)) : 0
    const proteinFill = remP > 0 ? Math.min(macros.protein / remP, 1) * 40 * (1 + proteinUrgency * 0.5) : 0
    const calFill     = Math.min(macros.kcal / remKcal, 1) * 25
    const carbFill    = remC > 0 ? Math.min(macros.carbs / remC, 1) * 10 : 0
    const fatFill     = remF > 0 ? Math.min(macros.fat   / remF, 1) * 10 : 0
    const overshoot   = macros.kcal > remKcal ? -30 : 0  // penalize going over budget

    const score = proteinFill + calFill + carbFill + fatFill + overshoot

    candidates.push({ food, grams, macros, score })
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
}

// ─── MEAL PLAN GENERATOR ─────────────────────────────────────────────────────

// Foods suitable for each meal
const MEAL_PROTEIN_POOLS = {
  breakfast: ['eggs_whole','egg_whites','greek_yogurt_0','greek_yogurt_full','kirkland_greek_yog','cottage_cheese_2','whey_protein'],
  lunch:     ['chicken_breast','rotisserie_breast','kirkland_rotisserie','ground_beef_90','ground_turkey','kirkland_ground_turkey','salmon_atlantic','canned_tuna','tilapia','black_beans','chickpeas','tofu_firm'],
  dinner:    ['chicken_breast','chicken_thigh','salmon_atlantic','kirkland_salmon','sirloin','pork_tenderloin','ground_beef_90','tilapia','cod','tempeh'],
  snacks:    ['greek_yogurt_0','kirkland_greek_yog','cottage_cheese_2','string_cheese','whey_protein','quest_bar','kirkland_protein_bar','beef_jerky','edamame'],
}
const MEAL_CARB_POOLS = {
  breakfast: ['oatmeal','banana','whole_wheat_bread','english_muffin','granola','brown_rice'],
  lunch:     ['white_rice','brown_rice','sweet_potato','pasta_white','quinoa','tortilla_flour','wheat_bread'],
  dinner:    ['white_rice','brown_rice','sweet_potato','white_potato','quinoa','pasta_wholewheat','corn'],
  snacks:    ['apple','banana','rice_cakes','granola_bar','blueberries'],
}
const MEAL_VEG_POOLS = {
  breakfast: ['spinach','tomato'],
  lunch:     ['broccoli','spinach','mixed_greens','bell_pepper_red','cucumber','carrots','zucchini'],
  dinner:    ['broccoli','asparagus','spinach','green_beans','cauliflower','kale','zucchini','mushroom'],
  snacks:    [],
}
const MEAL_FAT_POOLS = {
  breakfast: ['almonds','peanut_butter','avocado'],
  lunch:     ['olive_oil','avocado','mixed_nuts'],
  dinner:    ['olive_oil','butter','avocado'],
  snacks:    ['almonds','peanut_butter','dark_chocolate'],
}

function pickFromPool(pool, usedIds = new Set()) {
  const available = pool.filter(id => !usedIds.has(id))
  if (!available.length) return pool[Math.floor(Math.random() * pool.length)]
  return available[Math.floor(Math.random() * available.length)]
}

function gramsToHit(food, targetKcal) {
  if (!food || food.per100g.kcal === 0) return 100
  return Math.max(30, Math.round((targetKcal / food.per100g.kcal) * 100 / 25) * 25)
}

export function generateMealPlan(targets) {
  // Split: breakfast 25%, lunch 35%, snacks 15%, dinner 25%
  const splits = { breakfast: 0.25, lunch: 0.35, dinner: 0.25, snacks: 0.15 }
  const usedProteins = new Set()

  const plan = {}

  for (const meal of ['breakfast','lunch','dinner','snacks']) {
    const pct      = splits[meal]
    const mealKcal = Math.round(targets.kcal * pct)
    const mealP    = Math.round(targets.protein * pct)
    let remaining  = mealKcal
    const items    = []

    // 1. Pick protein source
    const proteinId = pickFromPool(MEAL_PROTEIN_POOLS[meal] || [], usedProteins)
    const proteinFood = FOOD_INDEX_MAP.get(proteinId)
    if (proteinFood) {
      usedProteins.add(proteinId)
      const proteinKcalBudget = Math.round(mealKcal * (meal === 'snacks' ? 0.55 : 0.40))
      const g = Math.min(gramsToHit(proteinFood, proteinKcalBudget), meal === 'snacks' ? 200 : 350)
      const macros = getFoodMacros(proteinFood, g)
      items.push({ food: proteinFood, grams: g, macros })
      remaining -= macros.kcal
    }

    // 2. Pick carb source (not for snacks)
    if (meal !== 'snacks' && remaining > 80) {
      const carbId   = pickFromPool(MEAL_CARB_POOLS[meal] || [])
      const carbFood = FOOD_INDEX_MAP.get(carbId)
      if (carbFood) {
        const g = Math.min(gramsToHit(carbFood, remaining * 0.55), 300)
        const macros = getFoodMacros(carbFood, g)
        items.push({ food: carbFood, grams: g, macros })
        remaining -= macros.kcal
      }
    } else if (meal === 'snacks' && remaining > 50) {
      // Snack carb
      const carbId   = pickFromPool(MEAL_CARB_POOLS.snacks)
      const carbFood = FOOD_INDEX_MAP.get(carbId)
      if (carbFood) {
        const g = Math.min(gramsToHit(carbFood, remaining * 0.6), 200)
        const macros = getFoodMacros(carbFood, g)
        items.push({ food: carbFood, grams: g, macros })
        remaining -= macros.kcal
      }
    }

    // 3. Pick vegetable (not snacks)
    const vegPool = MEAL_VEG_POOLS[meal] || []
    if (meal !== 'snacks' && vegPool.length > 0 && remaining > 20) {
      const vegId   = pickFromPool(vegPool)
      const vegFood = FOOD_INDEX_MAP.get(vegId)
      if (vegFood) {
        const g = 100  // standard veg portion
        const macros = getFoodMacros(vegFood, g)
        items.push({ food: vegFood, grams: g, macros })
        remaining -= macros.kcal
      }
    }

    // 4. Add fat source if room remains
    if (remaining > 80) {
      const fatId   = pickFromPool(MEAL_FAT_POOLS[meal] || [])
      const fatFood = FOOD_INDEX_MAP.get(fatId)
      if (fatFood) {
        const g = Math.min(gramsToHit(fatFood, remaining * 0.7), 50)
        const macros = getFoodMacros(fatFood, g)
        items.push({ food: fatFood, grams: g, macros })
      }
    }

    // Aggregate totals
    const total = items.reduce((acc, { macros }) => ({
      kcal:    acc.kcal    + macros.kcal,
      protein: +(acc.protein + macros.protein).toFixed(1),
      carbs:   +(acc.carbs   + macros.carbs).toFixed(1),
      fat:     +(acc.fat     + macros.fat).toFixed(1),
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })

    plan[meal] = { items, total, targetKcal: mealKcal }
  }

  return plan
}

// Fast ID→food map (built once)
import { FOOD_INDEX } from '../data/foods.js'
const FOOD_INDEX_MAP = FOOD_INDEX

// ─── LOG MACRO TOTALS ────────────────────────────────────────────────────────

export function sumLogMacros(meals) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0, fiber = 0
  for (const entries of Object.values(meals)) {
    for (const entry of entries) {
      kcal    += entry.macros.kcal
      protein += entry.macros.protein
      carbs   += entry.macros.carbs
      fat     += entry.macros.fat
      fiber   += entry.macros.fiber ?? 0
    }
  }
  return { kcal: Math.round(kcal), protein: +protein.toFixed(1), carbs: +carbs.toFixed(1), fat: +fat.toFixed(1), fiber: +fiber.toFixed(1) }
}

export function macroRemaining(targets, consumed) {
  return {
    kcal:    Math.max(0, targets.kcal    - consumed.kcal),
    protein: Math.max(0, targets.protein - consumed.protein),
    carbs:   Math.max(0, targets.carbs   - consumed.carbs),
    fat:     Math.max(0, targets.fat     - consumed.fat),
  }
}

// ─── MACRO COACHING ───────────────────────────────────────────────────────────
// Generates a coach-style message + priority based on what's left in the budget.
export function getMacroCoaching(targets, consumed) {
  const rem = {
    kcal:    targets.kcal    - consumed.kcal,
    protein: targets.protein - consumed.protein,
    carbs:   targets.carbs   - consumed.carbs,
    fat:     targets.fat     - consumed.fat,
  }
  const proteinPct = targets.protein ? consumed.protein / targets.protein : 0
  const kcalPct    = targets.kcal    ? consumed.kcal    / targets.kcal    : 0

  // Over budget
  if (rem.kcal < -100) {
    return { tone: 'warn', priority: null,
      message: `You're ${Math.abs(Math.round(rem.kcal))} kcal over budget today. If you're bulking that's fine — if cutting, ease off or add a walk.` }
  }

  // Day essentially done
  if (kcalPct >= 0.92 && proteinPct >= 0.9) {
    return { tone: 'good', priority: null,
      message: `Dialed in — ${Math.round(consumed.protein)}g protein and ${Math.round(consumed.kcal)} kcal. Great day. 💪` }
  }

  // Protein lagging (most important driver of muscle gain)
  if (rem.protein > 25 && proteinPct < 0.7) {
    const proteinKcal = Math.round(rem.protein * 4)
    const fitsInBudget = rem.kcal >= proteinKcal
    return { tone: 'focus', priority: 'protein',
      message: `You're ${Math.round(rem.protein)}g protein short with ${Math.round(rem.kcal)} kcal left. ${
        fitsInBudget
          ? 'Prioritize lean, protein-dense foods (chicken, sardines, Greek yogurt, whey).'
          : 'Tight on calories — go very lean: egg whites, white fish, non-fat Greek yogurt, or a whey shake.'
      }` }
  }

  // Lots of calories left, protein ok
  if (rem.kcal > 400 && proteinPct >= 0.7) {
    return { tone: 'focus', priority: rem.carbs > rem.fat ? 'carbs' : 'fat',
      message: `Protein's on track. You have ${Math.round(rem.kcal)} kcal left — fill it with ${
        rem.carbs > rem.fat ? 'carbs to fuel training (rice, oats, fruit, injera).' : 'healthy fats (avocado, nuts, olive oil).'
      }` }
  }

  // Close to done, small gap
  if (rem.kcal > 0 && rem.kcal <= 400) {
    return { tone: 'focus', priority: rem.protein > 15 ? 'protein' : 'balanced',
      message: `Almost there — ${Math.round(rem.kcal)} kcal to go${rem.protein > 15 ? `, still need ${Math.round(rem.protein)}g protein.` : '. Finish with a balanced snack.'}` }
  }

  return { tone: 'neutral', priority: 'balanced',
    message: `Log your meals to get personalized macro coaching for the rest of the day.` }
}
