// ════════════════════════════════════════════════════════════════════════════
//  Meal planning & food recommendation — everything that needs the full food DB.
//  Split out of nutrition.js so the 1,300-item database loads only with the
//  Nutrition tab, keeping the app's initial bundle small.
// ════════════════════════════════════════════════════════════════════════════
import { FOODS, FOOD_INDEX, getFoodMacros } from '../data/foods.js'
import { dietaryFilter } from './nutrition.js'

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
  // only consider IDs that actually exist in the food DB (guards against stale pool entries)
  const valid = pool.filter(id => FOOD_INDEX.has(id))
  if (!valid.length) return null
  const available = valid.filter(id => !usedIds.has(id))
  const choices = available.length ? available : valid
  return choices[Math.floor(Math.random() * choices.length)]
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
    const proteinFood = FOOD_INDEX.get(proteinId)
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
      const carbFood = FOOD_INDEX.get(carbId)
      if (carbFood) {
        const g = Math.min(gramsToHit(carbFood, remaining * 0.55), 300)
        const macros = getFoodMacros(carbFood, g)
        items.push({ food: carbFood, grams: g, macros })
        remaining -= macros.kcal
      }
    } else if (meal === 'snacks' && remaining > 50) {
      // Snack carb
      const carbId   = pickFromPool(MEAL_CARB_POOLS.snacks)
      const carbFood = FOOD_INDEX.get(carbId)
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
      const vegFood = FOOD_INDEX.get(vegId)
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
      const fatFood = FOOD_INDEX.get(fatId)
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

// ─── SMARTER FOOD RECOMMENDER ─────────────────────────────────────────────────
// Considers: dietary prefs, protein urgency, calorie fit, macro balance,
// "eat clean" boost, and penalizes foods you've leaned on a lot this week.
export function getSmartPicks(remaining, prefs = {}, recentCounts = {}, n = 6) {
  const { kcal: remK, protein: remP, carbs: remC, fat: remF } = remaining
  if (remK <= 40) return []
  const proteinUrgent = remP > 25  // big protein gap → bias protein-dense foods
  const picks = []

  for (const food of FOODS) {
    if (food.category === 'drink' && food.per100g.kcal === 0) continue
    if (!dietaryFilter(food, prefs)) continue

    // grams that fit the remaining calories (cap at default serving or fit)
    const defaultG = food.serving.amount
    let grams = defaultG
    const full = getFoodMacros(food, grams)
    if (full.kcal > remK * 1.05) grams = Math.max(20, Math.floor((remK / full.kcal) * defaultG / 10) * 10)
    const m = getFoodMacros(food, grams)
    if (m.kcal === 0 || m.kcal > remK * 1.12) continue

    const proteinDensity = food.per100g.kcal ? food.per100g.protein / food.per100g.kcal * 100 : 0
    const proteinFill = remP > 0 ? Math.min(m.protein / remP, 1) : 0
    const calFill     = Math.min(m.kcal / remK, 1)
    const carbFill    = remC > 0 ? Math.min(m.carbs / remC, 1) : 0
    const fatFill     = remF > 0 ? Math.min(m.fat / remF, 1) : 0

    let score = 0
    score += proteinFill * (proteinUrgent ? 55 : 35)
    score += proteinDensity * (proteinUrgent ? 1.5 : 0.6)   // reward protein-per-calorie
    score += calFill * 22
    score += carbFill * 9 + fatFill * 8
    if (m.kcal > remK) score -= 35                          // overshoot penalty
    if (food.tags?.includes('whole-food')) score += 8       // clean bonus
    if (food.tags?.includes('high-protein')) score += 6
    const used = recentCounts[food.id] || 0
    score -= used * 6                                        // variety: penalize repeats
    if (food.category === 'fast_food') score -= 4

    picks.push({ food, grams, macros: m, score })
  }
  return picks.sort((a, b) => b.score - a.score).slice(0, n)
}

// ─── 3-MACRO FINDER (least-squares match) ─────────────────────────────────────
// Given desired grams of protein/carbs/fat, find foods + serving sizes that best match.
export function findClosestFoods(target, prefs = {}, n = 6) {
  const { protein: P = 0, carbs: C = 0, fat: F = 0 } = target
  if (P + C + F <= 0) return []
  const out = []
  for (const food of FOODS) {
    if (!dietaryFilter(food, prefs)) continue
    const p = food.per100g.protein / 100, c = food.per100g.carbs / 100, f = food.per100g.fat / 100
    const denom = p * p + c * c + f * f
    if (denom < 1e-6) continue
    // least-squares optimal grams projecting target onto this food's macro vector
    let g = (P * p + C * c + F * f) / denom
    if (g < 10) continue
    g = Math.min(Math.round(g / 5) * 5, 700)
    const m = getFoodMacros(food, g)
    const err = Math.sqrt((m.protein - P) ** 2 + (m.carbs - C) ** 2 + (m.fat - F) ** 2)
    out.push({ food, grams: g, macros: m, err: +err.toFixed(1) })
  }
  return out.sort((a, b) => a.err - b.err).slice(0, n)
}

// ─── FOOD PATTERN DETECTION (last 7 days) ─────────────────────────────────────
export function detectFoodPatterns(nutritionLogs = {}) {
  const now = Date.now()
  const catCount = {}, foodCount = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(now - i * 86_400_000).toISOString().slice(0, 10)
    const log = nutritionLogs[d]
    if (!log) continue
    Object.values(log.meals || {}).flat().forEach(e => {
      foodCount[e.foodId] = (foodCount[e.foodId] || 0) + 1
      const f = FOOD_INDEX.get(e.foodId)
      if (f) catCount[f.category] = (catCount[f.category] || 0) + 1
    })
  }
  const insights = []
  if ((catCount.fast_food || 0) >= 4)
    insights.push({ icon: '🍔', text: `You've logged fast food ${catCount.fast_food}× this week. Try swapping one for a home-cooked high-protein meal — your waistline and recovery will thank you.` })
  const repeated = Object.entries(foodCount).filter(([, c]) => c >= 5)
  if (repeated.length) {
    const f = FOOD_INDEX.get(repeated[0][0])
    if (f) insights.push({ icon: '🔁', text: `${f.name} ${repeated[0][1]}× this week — great consistency, but rotate in other foods for a wider micronutrient spread.` })
  }
  const veg = (catCount.vegetable || 0) + (catCount.fruit || 0)
  if (Object.keys(catCount).length > 0 && veg < 4)
    insights.push({ icon: '🥦', text: `Only ${veg} fruit/veg servings logged this week. Add more for fiber, micros and digestion.` })
  return insights
}
