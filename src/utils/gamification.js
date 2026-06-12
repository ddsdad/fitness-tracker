// ════════════════════════════════════════════════════════════════════════════
//  Gamification — coins, XP, levels, daily quests, and the shop.
//  Earnings are DERIVED from logged data (cheat-resistant, recomputable),
//  plus a small action-based bucket for completed quests.
// ════════════════════════════════════════════════════════════════════════════
import { epley1RM } from './calculations.js'
import { computeAchievements } from './achievements.js'

// Coin value per earned achievement (by id; default 40)
const ACHIEVEMENT_COINS = {
  first_workout: 20, ten_sessions: 40, fifty_sessions: 100, hundred_sessions: 250, twohundred_sessions: 500,
  streak_7: 60, streak_30: 200, streak_100: 600,
  five_week: 50,
  bench_bw: 75, bench_1_5: 200, squat_1_5: 100, squat_2: 250, deadlift_2: 120, deadlift_3: 400, ohp_bw: 150,
  first_checkin: 15, pr_machine: 50,
  volume_week: 80, protein_streak: 50, protein_week: 100,
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

// (old random dailyQuests removed — superseded by utils/system.js generateSystemQuests)

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
  { id: 'title_machine', kind: 'title', title: 'The Machine', name: 'Title: "The Machine"', emoji: '🤖', price: 250 },
  { id: 'title_savage',  kind: 'title', title: 'Savage',      name: 'Title: "Savage"',      emoji: '😤', price: 250 },
]

