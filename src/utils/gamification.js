// ════════════════════════════════════════════════════════════════════════════
//  Gamification — coins, XP, levels, daily quests, and the shop.
//  Earnings are DERIVED from logged data (cheat-resistant, recomputable),
//  plus a small action-based bucket for completed quests.
// ════════════════════════════════════════════════════════════════════════════
import { FOOD_INDEX, getFoodMacros } from '../data/foods.js'
import { epley1RM } from './calculations.js'
import { computeAchievements } from './achievements.js'

// Coin value per earned achievement (by id; default 40)
const ACHIEVEMENT_COINS = {
  first_workout: 20, ten_sessions: 40, fifty_sessions: 100, hundred_sessions: 250,
  streak_7: 60, streak_30: 200, bench_bw: 75, squat_1_5: 100, deadlift_2: 120,
  pr_machine: 50, volume_week: 80, protein_streak: 50,
}

// ── Level curve & titles ──────────────────────────────────────────────────────
export function levelFromXp(xp) { return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1 }
export function xpForLevel(level) { return (level - 1) ** 2 * 100 }   // cumulative XP needed to reach `level`

const TITLES = [
  { min: 1,  title: 'Rookie',       emoji: '🐣' },
  { min: 3,  title: 'Novice',       emoji: '🔰' },
  { min: 5,  title: 'Lifter',       emoji: '💪' },
  { min: 8,  title: 'Intermediate', emoji: '🔥' },
  { min: 12, title: 'Advanced',     emoji: '⚡' },
  { min: 16, title: 'Elite',        emoji: '🏆' },
  { min: 21, title: 'Beast',        emoji: '🦍' },
  { min: 27, title: 'Legend',       emoji: '👑' },
]
export function levelTitle(level) {
  let t = TITLES[0]
  for (const x of TITLES) if (level >= x.min) t = x
  return t
}

// ── Best Epley 1RM helper ─────────────────────────────────────────────────────
function bestE1RM(sets = []) {
  let b = 0
  for (const s of sets) if (s.weight > 0 && s.reps > 0 && !s.warmup) b = Math.max(b, epley1RM(s.weight, s.reps))
  return b
}

// ── Derive lifetime coins/XP from logged data (deterministic) ─────────────────
export function deriveEarned(profile, sessions = [], measurementHistory = [], nutritionLogs = {}) {
  let coins = 0
  const bd = { workouts: 0, prs: 0, milestones: 0, protein: 0, weighins: 0, volume: 0 }

  // Workouts: 10 base + 2/working set (cap 40)
  let totalVolume = 0
  const running = {}
  ;[...sessions].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(s => {
    let working = 0
    ;(s.exercises || []).forEach(ex => {
      ;(ex.sets || []).forEach(st => {
        if (!st.warmup && st.weight > 0 && st.reps > 0) { working++; totalVolume += st.weight * st.reps }
      })
      // PR coins: each new all-time e1RM improvement = 25
      const e = bestE1RM(ex.sets)
      if (e > (running[ex.exerciseId] || 0) + 0.5) {
        if (running[ex.exerciseId]) bd.prs += 25
        running[ex.exerciseId] = e
      }
    })
    bd.workouts += 10 + Math.min(40, working * 2)
  })

  // Strength milestone bounties (one-time, bodyweight-relative)
  const bw = profile?.bodyweight || 0
  const lm = profile?.liftMaxes || {}
  const bounty = (lift, ratio, reward) => { if (bw > 0 && (lm[lift] || 0) >= bw * ratio) bd.milestones += reward }
  bounty('bench', 1.0, 75);  bounty('bench', 1.5, 200)
  bounty('squat', 1.5, 100); bounty('squat', 2.0, 250)
  bounty('deadlift', 2.0, 120); bounty('deadlift', 2.5, 300)
  bounty('ohp', 0.66, 60)

  // Protein-goal days (≥1.6 g/kg bodyweight) = 5 each
  const bwKg = (profile?.unit === 'kg' ? bw : bw / 2.2046) || 70
  const proteinTarget = bwKg * 1.6
  Object.values(nutritionLogs).forEach(log => {
    const p = Object.values(log.meals || {}).flat().reduce((t, e) => t + (e.macros?.protein || 0), 0)
    if (p >= proteinTarget) bd.protein += 5
  })

  // Weigh-in days = 2 each
  bd.weighins = measurementHistory.filter(r => r.metric === 'bodyweight').length * 2

  // Lifetime volume milestones: every 50,000 (kg-equiv) = 50
  const volUnit = profile?.unit === 'lbs' ? totalVolume / 2.2046 : totalVolume
  bd.volume = Math.floor(volUnit / 50000) * 50

  // Achievement bounties (ties the badge system to the economy)
  bd.achievements = computeAchievements({ sessions, profile, measurementHistory, nutritionLogs })
    .filter(a => a.earned)
    .reduce((s, a) => s + (ACHIEVEMENT_COINS[a.id] || 40), 0)

  coins = bd.workouts + bd.prs + bd.milestones + bd.protein + bd.weighins + bd.volume + bd.achievements
  return { coins: Math.round(coins), breakdown: bd }
}

// ── Full game stats (combines derived + quest bucket − spent) ─────────────────
export function gameStats(profile, sessions, measurementHistory, nutritionLogs) {
  const game = profile?.game || {}
  const { coins: derived, breakdown } = deriveEarned(profile, sessions, measurementHistory, nutritionLogs)
  const earned = derived + (game.questCoins || 0)
  const xp = earned                       // XP = lifetime earned (never spent)
  const level = levelFromXp(xp)
  const title = levelTitle(level)
  const balance = Math.max(0, earned - (game.spent || 0))
  const curBase = xpForLevel(level), nextBase = xpForLevel(level + 1)
  return {
    coins: balance, xp, level, title, breakdown,
    levelProgress: Math.min(1, (xp - curBase) / Math.max(1, nextBase - curBase)),
    xpIntoLevel: xp - curBase, xpForNext: nextBase - curBase,
  }
}

// ── Daily quests (seeded by date, readiness-aware) ────────────────────────────
const QUEST_POOL = [
  { id: 'log_workout',  icon: '🏋️', text: 'Log a workout today',                 reward: 25, hard: true },
  { id: 'protein',      icon: '🥩', text: 'Hit your protein target today',        reward: 20 },
  { id: 'protein_plus', icon: '💥', text: 'Overload: hit 1.2× your protein',      reward: 30, hard: true },
  { id: 'cardio',       icon: '🏃', text: '20-minute cardio (run/bike/row)',      reward: 25, hard: true },
  { id: 'finisher',     icon: '🔥', text: 'Bonus finisher: 100 push-ups',         reward: 30, hard: true },
  { id: 'weighin',      icon: '⚖️', text: 'Log your morning weigh-in',            reward: 10 },
  { id: 'beat_set',     icon: '📈', text: 'Beat a previous set on any lift',      reward: 35, hard: true },
  { id: 'veg',          icon: '🥦', text: 'Eat 2+ servings of veg today',         reward: 15 },
]
const RECOVERY_POOL = [
  { id: 'walk',     icon: '🚶', text: '15-minute easy walk',         reward: 15 },
  { id: 'stretch',  icon: '🧘', text: '10-minute mobility / stretch', reward: 15 },
  { id: 'sleep',    icon: '😴', text: 'Get 8 hours of sleep tonight', reward: 20 },
  { id: 'hydrate',  icon: '💧', text: 'Drink 3L of water today',      reward: 10 },
  { id: 'weighin',  icon: '⚖️', text: 'Log your morning weigh-in',    reward: 10 },
  { id: 'protein',  icon: '🥩', text: 'Hit your protein target today', reward: 20 },
]
function seededShuffle(arr, seed) {
  const a = [...arr]; let s = seed
  for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}
export function dailyQuests(dateStr, readinessScore = null) {
  const seed = [...dateStr].reduce((h, c) => h + c.charCodeAt(0), 0)
  // Low readiness → recovery-focused quests (fair to recovery state)
  const pool = (readinessScore != null && readinessScore < 45) ? RECOVERY_POOL : QUEST_POOL
  return seededShuffle(pool, seed).slice(0, 3)
}

// ── Mystery box (variable reward) ─────────────────────────────────────────────
export function openMysteryBox() {
  const roll = Math.random()
  if (roll < 0.55) return { type: 'coins', amount: 50 + Math.floor(Math.random() * 100), label: 'coins' }       // common
  if (roll < 0.85) return { type: 'coins', amount: 150 + Math.floor(Math.random() * 150), label: 'coins' }      // rare
  if (roll < 0.97) return { type: 'coins', amount: 350, label: 'coins (big!)' }                                  // epic
  return { type: 'jackpot', amount: 750, label: 'JACKPOT 🎉' }                                                    // legendary
}

// ── Shop catalog ──────────────────────────────────────────────────────────────
// Themes set the global accent color (re-skins the whole app).
export const THEMES = {
  green:   { name: 'Classic Green', color: '#22c55e', dim: '#16a34a', price: 0 },
  ocean:   { name: 'Ocean Blue',    color: '#3b82f6', dim: '#2563eb', price: 250 },
  violet:  { name: 'Violet',        color: '#a78bfa', dim: '#8b5cf6', price: 300 },
  crimson: { name: 'Crimson',       color: '#ef4444', dim: '#dc2626', price: 300 },
  gold:    { name: 'Champion Gold', color: '#eab308', dim: '#ca8a04', price: 400 },
  neon:    { name: 'Neon Mint',     color: '#14f195', dim: '#0ea66a', price: 500 },
  sunset:  { name: 'Sunset Orange', color: '#fb923c', dim: '#f97316', price: 450 },
}

export const SHOP = [
  { id: 'theme_ocean',   kind: 'theme', themeId: 'ocean',   name: 'Ocean Blue theme',    emoji: '🌊', price: 250 },
  { id: 'theme_violet',  kind: 'theme', themeId: 'violet',  name: 'Violet theme',        emoji: '🔮', price: 300 },
  { id: 'theme_crimson', kind: 'theme', themeId: 'crimson', name: 'Crimson theme',       emoji: '🔴', price: 300 },
  { id: 'theme_gold',    kind: 'theme', themeId: 'gold',    name: 'Champion Gold theme', emoji: '🥇', price: 400 },
  { id: 'theme_sunset',  kind: 'theme', themeId: 'sunset',  name: 'Sunset Orange theme', emoji: '🌅', price: 450 },
  { id: 'theme_neon',    kind: 'theme', themeId: 'neon',    name: 'Neon Mint theme',     emoji: '💚', price: 500 },
  { id: 'streak_shield', kind: 'shield', name: 'Streak Shield', emoji: '🛡️', price: 150, repeatable: true, desc: 'Protects your streak for one missed day' },
  { id: 'mystery',       kind: 'mystery', name: 'Mystery Box', emoji: '🎁', price: 150, repeatable: true, desc: 'Random reward — could be a jackpot!' },
  { id: 'cookbook_bulk', kind: 'cookbook', pack: 'bulk',  name: 'High-Protein Bulk Cookbook', emoji: '📗', price: 500, desc: '4 calorie-dense muscle-building recipes' },
  { id: 'cookbook_cut',  kind: 'cookbook', pack: 'cut',   name: 'Lean & Shredded Cookbook',   emoji: '📕', price: 500, desc: '4 high-volume low-cal recipes' },
  { id: 'cookbook_hab',  kind: 'cookbook', pack: 'habesha',name: 'Habesha Gains Cookbook',    emoji: '📙', price: 600, desc: '3 high-protein habesha-inspired meals' },
  { id: 'title_machine', kind: 'title', title: 'The Machine', name: 'Title: "The Machine"', emoji: '🤖', price: 250 },
  { id: 'title_savage',  kind: 'title', title: 'Savage',      name: 'Title: "Savage"',      emoji: '😤', price: 250 },
]

// ── Cookbook recipe definitions (built into real recipes on purchase) ─────────
const COOKBOOKS = {
  bulk: [
    { name: 'Mass Gainer Oats', emoji: '🥣', servings: 1, ing: [['oatmeal', 100], ['banana', 120], ['peanut_butter', 32], ['whey_protein', 31]] },
    { name: 'Steak & Rice Bowl', emoji: '🥩', servings: 1, ing: [['sirloin', 200], ['white_rice', 250], ['broccoli', 100], ['olive_oil', 10]] },
    { name: 'Chicken Pasta', emoji: '🍝', servings: 2, ing: [['chicken_breast', 300], ['pasta_white', 300], ['olive_oil', 20], ['parmesan', 30]] },
    { name: 'Salmon Power Plate', emoji: '🐟', servings: 1, ing: [['salmon_atlantic', 200], ['sweet_potato', 250], ['asparagus', 100]] },
  ],
  cut: [
    { name: 'Lean Chicken & Greens', emoji: '🥗', servings: 1, ing: [['chicken_breast', 200], ['broccoli', 200], ['mixed_greens', 100]] },
    { name: 'Egg White Scramble', emoji: '🍳', servings: 1, ing: [['egg_whites', 250], ['spinach', 100], ['mushrooms', 80]] },
    { name: 'Tuna Volume Bowl', emoji: '🐟', servings: 1, ing: [['canned_tuna', 150], ['cucumber', 150], ['tomato', 100]] },
    { name: 'Cod & Veg', emoji: '🐟', servings: 1, ing: [['cod', 220], ['cauliflower', 200], ['green_beans', 100]] },
  ],
  habesha: [
    { name: 'Shiro & Injera Gains', emoji: '🥘', servings: 1, ing: [['shiro', 200], ['injera', 120]] },
    { name: 'Tibs Protein Plate', emoji: '🍖', servings: 1, ing: [['tibs', 200], ['gomen', 120]] },
    { name: 'Doro Wat Bowl', emoji: '🍲', servings: 1, ing: [['doro_wat', 200], ['injera', 120]] },
  ],
}
export function buildCookbookRecipes(pack) {
  const defs = COOKBOOKS[pack] || []
  return defs.map(def => {
    const ingredients = def.ing
      .map(([foodId, grams]) => { const f = FOOD_INDEX.get(foodId); return f ? { foodId, name: f.name, emoji: f.emoji, grams, macros: getFoodMacros(f, grams) } : null })
      .filter(Boolean)
    const t = ingredients.reduce((a, i) => ({ kcal: a.kcal + i.macros.kcal, protein: a.protein + i.macros.protein, carbs: a.carbs + i.macros.carbs, fat: a.fat + i.macros.fat, fiber: a.fiber + (i.macros.fiber || 0) }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
    const s = Math.max(1, def.servings)
    return {
      id: 'cookbook_' + Math.random().toString(36).slice(2, 9),
      name: def.name, emoji: def.emoji, servings: s, ingredients,
      totals: { kcal: Math.round(t.kcal), protein: +t.protein.toFixed(1), carbs: +t.carbs.toFixed(1), fat: +t.fat.toFixed(1), fiber: +t.fiber.toFixed(1) },
      perServing: { kcal: Math.round(t.kcal / s), protein: +(t.protein / s).toFixed(1), carbs: +(t.carbs / s).toFixed(1), fat: +(t.fat / s).toFixed(1), fiber: +(t.fiber / s).toFixed(1) },
    }
  })
}
