import { describe, it, expect } from 'vitest'
import {
  calculateBMR, calculateMacroTargets, calculateTDEE,
  dietaryFilter,
  adaptiveTDEE, effectiveTDEE, calorieCalibration, mealProteinCheck,
} from '../nutrition.js'
import { findClosestFoods, getSmartPicks, generateMealPlan } from '../mealPlanner.js'

describe('BMR & macro targets', () => {
  it('Mifflin-St Jeor for a male', () => {
    expect(calculateBMR(80, 180, 25, 'male')).toBe(Math.round(10*80 + 6.25*180 - 5*25 + 5))
  })
  it('protein scales with goal', () => {
    const cut = calculateMacroTargets(2500, 'fat_loss', 80, 'cut')
    const bulk = calculateMacroTargets(2500, 'muscle', 80, 'lean_bulk')
    expect(cut.protein).toBeGreaterThan(bulk.protein)   // 2.2 vs 1.8 g/kg
  })
  it('never returns negative carbs', () => {
    const t = calculateMacroTargets(1200, 'fat_loss', 120, 'cut')
    expect(t.carbs).toBeGreaterThanOrEqual(50)
  })
})

describe('TDEE does not double-count exercise', () => {
  it('NEAT base + logged training added on top', () => {
    const profile = { bodyweight: 80, height: 180, age: 25, gender: 'male', unit: 'kg', activityLevel: 'moderate' }
    const base = calculateTDEE(profile, [], [])
    const withWorkout = calculateTDEE(profile, [{ sessionType: 'standard', duration: 60 }], [])
    expect(withWorkout.total).toBeGreaterThan(base.total)
    expect(withWorkout.workoutBonus).toBeGreaterThan(0)
    // moderate NEAT multiplier should be modest (≤1.4), leaving room for added training
    expect(base.base / calculateBMR(80, 180, 25, 'male')).toBeLessThanOrEqual(1.45)
  })
})

describe('dietary filter', () => {
  const chicken = { name: 'Chicken Breast', category: 'protein', tags: ['high-protein'], per100g: {} }
  const tofu = { name: 'Tofu (firm)', category: 'protein', tags: ['vegan'], per100g: {} }
  const salmon = { name: 'Atlantic Salmon', category: 'protein', tags: [], per100g: {} }
  const bigmac = { name: 'Big Mac', category: 'fast_food', tags: [], per100g: { carbs: 40 } }
  it('vegan excludes animal foods', () => {
    expect(dietaryFilter(chicken, { diet: 'vegan' })).toBe(false)
    expect(dietaryFilter(tofu, { diet: 'vegan' })).toBe(true)
  })
  it('pescatarian allows fish but not meat', () => {
    expect(dietaryFilter(salmon, { diet: 'pescatarian' })).toBe(true)
    expect(dietaryFilter(chicken, { diet: 'pescatarian' })).toBe(false)
  })
  it('eat-clean excludes fast food', () => {
    expect(dietaryFilter(bigmac, { clean: true })).toBe(false)
    expect(dietaryFilter(chicken, { clean: true })).toBe(true)
  })
})

describe('macro finder (least-squares)', () => {
  it('returns foods that approximately match the target', () => {
    const res = findClosestFoods({ protein: 40, carbs: 60, fat: 10 }, {}, 5)
    expect(res.length).toBeGreaterThan(0)
    expect(res[0].err).toBeLessThan(res[res.length - 1].err + 0.01)  // sorted by error
    expect(res[0].grams).toBeGreaterThan(0)
  })
  it('respects dietary prefs', () => {
    const res = findClosestFoods({ protein: 30, carbs: 30, fat: 10 }, { diet: 'vegan' }, 5)
    res.forEach(r => expect(dietaryFilter(r.food, { diet: 'vegan' })).toBe(true))
  })
})

describe('smart picks', () => {
  it('returns nothing when no calories left', () => {
    expect(getSmartPicks({ kcal: 10, protein: 5, carbs: 0, fat: 0 })).toEqual([])
  })
  it('returns ranked picks within budget', () => {
    const picks = getSmartPicks({ kcal: 500, protein: 40, carbs: 30, fat: 15 }, {}, {}, 5)
    expect(picks.length).toBeGreaterThan(0)
    picks.forEach(p => expect(p.macros.kcal).toBeLessThanOrEqual(500 * 1.12))
  })
})

describe('adaptive TDEE', () => {
  it('needs enough data, else null', () => {
    expect(adaptiveTDEE({}, [], 'kg')).toBeNull()
  })
  it('computes maintenance below intake when gaining', () => {
    const now = Date.now(), logs = {}
    for (let i = 0; i < 12; i++) logs[new Date(now - i*86400000).toISOString().slice(0,10)] = { meals: { l: [{ macros: { kcal: 2800 } }] } }
    const mh = [
      { metric: 'bodyweight', date: new Date(now - 12*86400000).toISOString().slice(0,10), value: 80 },
      { metric: 'bodyweight', date: new Date(now).toISOString().slice(0,10), value: 80.6 },
    ]
    const a = adaptiveTDEE(logs, mh, 'kg')
    expect(a.tdee).toBeLessThan(a.avgIntake)   // gaining → real TDEE below intake
    expect(a.confidence).toBeGreaterThan(0.5)
  })
  it('effectiveTDEE blends by confidence', () => {
    expect(effectiveTDEE(2600, null).source).toBe('estimate')
    const blended = effectiveTDEE(2600, { tdee: 2400, confidence: 0.86 })
    expect(blended.value).toBeGreaterThan(2400)
    expect(blended.value).toBeLessThan(2600)
  })
})

describe('per-meal protein check', () => {
  it('flags a protein-light main meal', () => {
    const log = { meals: { breakfast: [{ macros: { protein: 8 } }], lunch: [{ macros: { protein: 45 } }], dinner: [], snacks: [] } }
    const r = mealProteinCheck(log, 82, [{ id: 'breakfast', label: 'Breakfast' }, { id: 'lunch', label: 'Lunch' }, { id: 'dinner', label: 'Dinner' }, { id: 'snacks', label: 'Snacks' }])
    expect(r.flagged.some(f => f.meal === 'Breakfast')).toBe(true)
    expect(r.flagged.some(f => f.meal === 'Lunch')).toBe(false)
  })
})

describe('meal plan generator', () => {
  it('populates every meal with valid items', () => {
    const plan = generateMealPlan({ kcal: 2800, protein: 180, carbs: 300, fat: 80, fiber: 38 })
    for (const meal of ['breakfast', 'lunch', 'dinner', 'snacks']) {
      expect(plan[meal].items.length).toBeGreaterThan(0)
    }
  })
})
