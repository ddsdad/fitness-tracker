
// ─── DIETARY FILTERING ────────────────────────────────────────────────────────
const FISH_RE = /salmon|tuna|fish|sardine|mackerel|anchov|cod|tilapia|halibut|trout|bass|mahi|haddock|snapper|swordfish|herring|catfish|shrimp|crab|lobster|scallop|oyster|clam|mussel|octopus|calamari|prawn/i
const DAIRY_EGG_RE = /egg|yogurt|cheese|whey|casein|cottage|milk|protein powder|skyr|kefir|ricotta|paneer/i

function isFlesh(food) { // meat or fish (not dairy/eggs/plant)
  if (food.tags?.includes('vegan')) return false
  if (food.category === 'fast_food') return /chicken|beef|steak|burger|bacon|sausage|fish|shrimp|pork|turkey|meat|wing|nugget|tender/i.test(food.name)
  if (food.category !== 'protein') return false
  if (DAIRY_EGG_RE.test(food.name)) return false
  return true
}
function isAnimal(food) {
  if (food.tags?.includes('vegan')) return false
  if (['protein', 'dairy'].includes(food.category)) return true
  if (['butter', 'ghee', 'niter_kibbeh'].includes(food.id)) return true
  if (food.category === 'fast_food') return true
  return false
}
function isFish(food) { return FISH_RE.test(food.name) }

export function dietaryFilter(food, prefs = {}) {
  const { diet = 'none', clean = false, avoidFastFood = false } = prefs
  if (diet === 'vegan'        && isAnimal(food)) return false
  if (diet === 'vegetarian'   && isFlesh(food)) return false
  if (diet === 'pescatarian'  && isFlesh(food) && !isFish(food)) return false
  if (avoidFastFood && food.category === 'fast_food') return false
  if (clean) {
    if (food.category === 'fast_food' || food.category === 'snack') return false
    if (food.category === 'drink' && food.per100g.carbs > 3) return false // sugary drinks
  }
  return true
}

export const DIET_OPTIONS = [
  { id: 'none',        label: 'No restriction' },
  { id: 'vegetarian',  label: 'Vegetarian' },
  { id: 'vegan',       label: 'Vegan' },
  { id: 'pescatarian', label: 'Pescatarian' },
]

// ─── TDEE & MACRO TARGETS ────────────────────────────────────────────────────

// NEAT-only multipliers — represent daily life EXCLUDING logged workouts.
// (Logged sessions + extra activities are added on top, so the standard
//  exercise-inclusive multipliers would double-count training.)
const ACTIVITY_MULTS = {
  sedentary:   1.2,
  light:       1.3,
  moderate:    1.375,
  active:      1.45,
  very_active: 1.55,
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


// ─── PER-MEAL PROTEIN DISTRIBUTION ────────────────────────────────────────────
// Muscle protein synthesis is maximized by ~0.4 g/kg per meal (leucine threshold).
// Flags main meals that came in light so protein gets spread across the day.
export function mealProteinCheck(todayLog, bwKg, mealsMeta) {
  const target = +(bwKg * 0.4).toFixed(0)   // ideal protein per main meal
  if (target <= 0) return null
  const flagged = []
  for (const meal of mealsMeta) {
    if (meal.id === 'snacks') continue
    const entries = todayLog?.meals?.[meal.id] || []
    if (entries.length === 0) continue          // not eaten yet — don't nag
    const p = entries.reduce((s, e) => s + (e.macros?.protein || 0), 0)
    if (p < target * 0.6) flagged.push({ meal: meal.label, protein: Math.round(p) })
  }
  if (!flagged.length) return null
  return {
    target,
    flagged,
    message: `${flagged.map(f => `${f.meal} had ${f.protein}g`).join(', ')} — aim for ~${target}g protein per main meal to maximize muscle protein synthesis.`,
  }
}

// ─── ADAPTIVE TDEE ────────────────────────────────────────────────────────────
// The gold standard: your real maintenance = average intake − energy stored/lost
// as bodyweight, measured over a rolling window. Falls back to null until there's
// enough logged data (≥5 intake days + ≥2 weigh-ins spanning ≥7 days).
export function adaptiveTDEE(nutritionLogs = {}, measurementHistory = [], unit = 'kg', windowDays = 14) {
  const now = Date.now()
  const intakes = []
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(now - i * 86_400_000).toISOString().slice(0, 10)
    const log = nutritionLogs[d]
    if (!log) continue
    const kcal = Object.values(log.meals || {}).flat().reduce((s, e) => s + (e.macros?.kcal || 0), 0)
    if (kcal > 800) intakes.push(kcal)   // ignore near-empty (unlogged) days
  }
  const bw = measurementHistory.filter(r => r.metric === 'bodyweight').sort((a, b) => a.date.localeCompare(b.date))
  const cutoff = new Date(now - windowDays * 86_400_000).toISOString().slice(0, 10)
  const recentBw = bw.filter(r => r.date >= cutoff)
  if (intakes.length < 5 || recentBw.length < 2) return null

  const avgIntake = intakes.reduce((a, b) => a + b, 0) / intakes.length
  const first = recentBw[0], last = recentBw[recentBw.length - 1]
  const days = Math.max(1, (new Date(last.date) - new Date(first.date)) / 86_400_000)
  if (days < 7) return null
  const kcalPerUnit = unit === 'lbs' ? 3500 : 7700
  const changePerDay = (last.value - first.value) / days
  const tdee = Math.round(avgIntake - changePerDay * kcalPerUnit)
  const confidence = Math.min(1, intakes.length / 14)
  return {
    tdee: Math.max(1200, tdee),
    avgIntake: Math.round(avgIntake),
    changePerDay: +changePerDay.toFixed(3),
    daysLogged: intakes.length,
    confidence: +confidence.toFixed(2),
  }
}

// Blend Mifflin estimate with adaptive (weighted by how much data exists)
export function effectiveTDEE(estimate, adaptive) {
  if (!adaptive) return { value: estimate, source: 'estimate', confidence: 0 }
  const c = adaptive.confidence
  return { value: Math.round(estimate * (1 - c) + adaptive.tdee * c), source: c >= 0.7 ? 'adaptive' : 'blended', confidence: c, adaptive }
}

// ─── CALORIE AUTO-CALIBRATION ─────────────────────────────────────────────────
// Compares actual bodyweight trend vs the goal and suggests a kcal adjustment.
export function calorieCalibration(measurementHistory = [], targets, caloricMode = 'lean_bulk', unit = 'kg') {
  const bw = measurementHistory.filter(r => r.metric === 'bodyweight').sort((a, b) => a.date.localeCompare(b.date))
  if (bw.length < 2) return null
  const first = bw[0], last = bw[bw.length - 1]
  const days = Math.max(1, (new Date(last.date) - new Date(first.date)) / 86_400_000)
  if (days < 10) return null  // need ~1.5+ weeks of data
  const perWeek = (last.value - first.value) / (days / 7)
  const bwNow = last.value
  const pctWeek = perWeek / bwNow * 100

  // target weekly change by mode (% of bodyweight)
  const goalPct = { aggressive_bulk: 0.5, lean_bulk: 0.3, maintenance: 0, cut: -0.6 }[caloricMode] ?? 0.3
  const diff = pctWeek - goalPct  // + = gaining too fast, - = too slow
  const kcalPerUnit = unit === 'kg' ? 7700 : 3500
  // kcal adjustment ≈ (goal - actual)%/wk * bw * kcal/unit / 7 days
  const kcalAdj = Math.round(((goalPct - pctWeek) / 100 * bwNow * kcalPerUnit) / 7 / 50) * 50

  if (Math.abs(kcalAdj) < 75) return { onTrack: true, message: `On track — gaining ${perWeek > 0 ? '+' : ''}${perWeek.toFixed(2)}${unit}/wk, right where you want to be.`, perWeek: +perWeek.toFixed(2) }
  const dir = kcalAdj > 0 ? 'increase' : 'reduce'
  return {
    onTrack: false,
    perWeek: +perWeek.toFixed(2),
    kcalAdj,
    newTarget: targets ? Math.max(1200, targets.kcal + kcalAdj) : null,
    message: `You're trending ${perWeek > 0 ? '+' : ''}${perWeek.toFixed(2)}${unit}/wk (goal ≈ ${(goalPct/100*bwNow).toFixed(2)}${unit}/wk). ${dir === 'increase' ? 'Add' : 'Cut'} ~${Math.abs(kcalAdj)} kcal/day${targets ? ` → ${Math.max(1200, targets.kcal + kcalAdj)} kcal` : ''}.`,
  }
}
