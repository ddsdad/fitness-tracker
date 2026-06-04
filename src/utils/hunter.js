// ════════════════════════════════════════════════════════════════════════════
//  HUNTER STATUS — an RPG character sheet derived entirely from REAL training
//  data. Six attributes, a Power Level, and an 8-tier rank ladder (E→Monarch).
//  Nothing here is cosmetic-only: every stat traces back to a measurable metric.
//
//   STR  Strength   — DOTS (bodyweight-adjusted big-3 strength coefficient)
//   PWR  Power      — peak bodyweight-relative single lifts (explosive ceiling)
//   END  Endurance  — weekly working-set volume / work capacity
//   VIT  Vitality   — recovery & load management (ACWR sweet-spot adherence)
//   TEC  Technique  — exercise variety × training experience (movement mastery)
//   FOC  Focus      — consistency: streak + sessions/week discipline
// ════════════════════════════════════════════════════════════════════════════
import { dotsScore, bigThreeTotalKg, acwr } from './strength.js'
import { getCurrentWeek, sessionsInWeek, muscleVolumeForSessions } from './weekly.js'

const MS_DAY = 86_400_000
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))

// Smooth saturating curve: maps an open-ended metric into 0..100 with diminishing
// returns (k = value at which you hit ~63 of the cap). Feels like XP gain.
const sat = (x, k) => clamp(Math.round(100 * (1 - Math.exp(-Math.max(0, x) / k))))

function bwKgOf(profile) {
  const bw = profile?.bodyweight || 0
  return profile?.unit === 'kg' ? bw : bw / 2.2046
}

// ── Individual attribute calculators ──────────────────────────────────────────
function strScore(profile) {
  const dots = dotsScore(bigThreeTotalKg(profile), bwKgOf(profile), profile?.gender || 'male')
  // DOTS ~200 beginner, ~500 elite → scale across that band
  return clamp(Math.round((dots / 500) * 100))
}

function pwrScore(profile) {
  const bw = bwKgOf(profile)
  if (bw <= 0) return 0
  const lm = profile?.liftMaxes || {}
  const toKg = (v) => (profile?.unit === 'lbs' ? (v || 0) / 2.2046 : (v || 0))
  // Best bodyweight-ratio across the main lifts vs strong benchmarks
  const ratios = [
    toKg(lm.bench) / bw / 1.5,      // 1.5× bw bench = strong
    toKg(lm.squat) / bw / 2.0,      // 2× bw squat
    toKg(lm.deadlift) / bw / 2.5,   // 2.5× bw deadlift
    toKg(lm.ohp) / bw / 1.0,        // 1× bw press
  ].filter(r => r > 0)
  if (!ratios.length) return 0
  const peak = Math.max(...ratios)
  return clamp(Math.round(peak * 100))
}

function endScore(sessions, profile) {
  // Average weekly working-set volume over the last 4 weeks
  const now = Date.now()
  const recent = sessions.filter(s => now - new Date(s.date) <= 28 * MS_DAY)
  let sets = 0
  for (const s of recent) for (const ex of s.exercises || [])
    sets += (ex.sets || []).filter(x => !x.warmup && x.weight > 0 && x.reps > 0).length
  const perWeek = sets / 4
  return sat(perWeek, 60)   // ~60 sets/wk → ~63; 120+/wk → ~85+
}

function vitScore(sessions) {
  const a = acwr(sessions)
  if (!a) return sessions.length > 0 ? 45 : 0
  // Reward staying in the 0.8–1.3 optimal band; penalize spikes/detraining.
  const r = a.ratio
  if (r >= 0.8 && r <= 1.3) return clamp(Math.round(80 + (1 - Math.abs(1.05 - r) / 0.25) * 20))
  if (r > 1.3) return clamp(Math.round(70 - (r - 1.3) * 60))     // overreaching
  return clamp(Math.round(55 - (0.8 - r) * 50))                  // detraining
}

function tecScore(sessions, profile) {
  const distinct = new Set()
  for (const s of sessions) for (const ex of s.exercises || []) if (ex.exerciseId) distinct.add(ex.exerciseId)
  const variety = sat(distinct.size, 25)                 // movement library mastered
  // Experience: weeks since program start (or first session)
  let weeks = 0
  if (profile?.startDate) weeks = getCurrentWeek(profile.startDate)
  else if (sessions.length) weeks = Math.max(1, (Date.now() - Math.min(...sessions.map(s => new Date(s.date)))) / (7 * MS_DAY))
  const experience = sat(weeks, 16)
  return clamp(Math.round(variety * 0.6 + experience * 0.4))
}

function focScore(sessions, profile) {
  // Current streak of days with a session (look back up to 60 days)
  const dayset = new Set(sessions.map(s => { const d = new Date(s.date); d.setHours(0,0,0,0); return d.getTime() }))
  const shields = new Set((profile?.game?.shieldDates || []).map(ds => { const d = new Date(ds + 'T00:00:00'); d.setHours(0,0,0,0); return d.getTime() }))
  let streak = 0
  const check = new Date(); check.setHours(0,0,0,0)
  for (let i = 0; i < 60; i++) {
    const t = check.getTime()
    if (dayset.has(t) || shields.has(t)) streak++
    else if (i === 0) { /* today not trained yet — don't break */ }
    else break
    check.setDate(check.getDate() - 1)
  }
  // Sessions/week consistency over last 4 weeks
  const now = Date.now()
  const sess4 = sessions.filter(s => now - new Date(s.date) <= 28 * MS_DAY).length
  const perWeek = sess4 / 4
  const streakScore = sat(streak, 10)
  const freqScore = clamp(Math.round((perWeek / 5) * 100))  // 5 sessions/wk = max
  return clamp(Math.round(streakScore * 0.5 + freqScore * 0.5))
}

// ── Attribute metadata (order = hexagon order) ────────────────────────────────
export const ATTRS = [
  { key: 'STR', name: 'Strength',  icon: '🗡️', color: '#ef4444', desc: 'Bodyweight-adjusted big-3 strength (DOTS)' },
  { key: 'PWR', name: 'Power',     icon: '⚡', color: '#f59e0b', desc: 'Peak bodyweight-relative single lifts' },
  { key: 'END', name: 'Endurance', icon: '🔋', color: '#22c55e', desc: 'Weekly working-set volume / work capacity' },
  { key: 'VIT', name: 'Vitality',  icon: '❤️', color: '#ec4899', desc: 'Recovery & load management (ACWR)' },
  { key: 'TEC', name: 'Technique', icon: '🎯', color: '#3b82f6', desc: 'Movement variety × training experience' },
  { key: 'FOC', name: 'Focus',     icon: '🧠', color: '#a78bfa', desc: 'Streak & training consistency' },
]

// ── 8-tier rank ladder ────────────────────────────────────────────────────────
// Power Level = weighted blend of the six attributes (STR/PWR weighted highest).
export const RANKS = [
  { tier: 'E', min: 0,   name: 'E-Rank',  title: 'Awakened',     color: '#9ca3af', glow: 'rgba(156,163,175,0.5)' },
  { tier: 'D', min: 22,  name: 'D-Rank',  title: 'Hunter',       color: '#22c55e', glow: 'rgba(34,197,94,0.5)' },
  { tier: 'C', min: 36,  name: 'C-Rank',  title: 'Skilled',      color: '#06b6d4', glow: 'rgba(6,182,212,0.5)' },
  { tier: 'B', min: 50,  name: 'B-Rank',  title: 'Elite',        color: '#3b82f6', glow: 'rgba(59,130,246,0.55)' },
  { tier: 'A', min: 64,  name: 'A-Rank',  title: 'Ace',          color: '#a78bfa', glow: 'rgba(167,139,250,0.6)' },
  { tier: 'S', min: 77,  name: 'S-Rank',  title: 'Sovereign',    color: '#f59e0b', glow: 'rgba(245,158,11,0.65)' },
  { tier: 'SS',min: 88,  name: 'SS-Rank', title: 'National Level',color: '#fb7185', glow: 'rgba(251,113,133,0.7)' },
  { tier: 'M', min: 96,  name: 'MONARCH', title: 'Shadow Monarch',color: '#c084fc', glow: 'rgba(192,132,252,0.85)' },
]

export function rankForPower(power) {
  let r = RANKS[0]
  for (const x of RANKS) if (power >= x.min) r = x
  return r
}
export function nextRank(power) {
  return RANKS.find(x => x.min > power) || null
}

// ── Master computation ────────────────────────────────────────────────────────
export function computeHunter(profile, sessions = []) {
  const stats = {
    STR: strScore(profile),
    PWR: pwrScore(profile),
    END: endScore(sessions, profile),
    VIT: vitScore(sessions),
    TEC: tecScore(sessions, profile),
    FOC: focScore(sessions, profile),
  }
  // Weighted Power Level — strength-biased, but every attribute matters.
  const W = { STR: 0.24, PWR: 0.22, END: 0.16, VIT: 0.13, TEC: 0.13, FOC: 0.12 }
  const power = Math.round(Object.keys(W).reduce((s, k) => s + stats[k] * W[k], 0))
  const rank = rankForPower(power)
  const next = nextRank(power)
  const progressToNext = next
    ? clamp(Math.round((power - rank.min) / (next.min - rank.min) * 100))
    : 100

  // Highest & lowest attribute → "class" flavor + a coaching nudge
  const ordered = ATTRS.map(a => ({ ...a, value: stats[a.key] })).sort((x, y) => y.value - x.value)
  const strongest = ordered[0]
  const weakest = ordered[ordered.length - 1]

  return {
    stats, power, rank, next, progressToNext,
    strongest, weakest,
    className: classFor(ordered),
    // numeric "Power Level" display (RPG-style, scaled up from 0..100)
    powerLevel: power * 47 + Object.values(stats).reduce((s, v) => s + v, 0) * 3,
  }
}

// Flavor class based on dominant attributes (pure cosmetic label from real stats)
function classFor(ordered) {
  const top = ordered[0].key, second = ordered[1].key
  const set = new Set([top, second])
  if (set.has('STR') && set.has('PWR')) return { name: 'Berserker', emoji: '🪓' }
  if (set.has('STR') && set.has('TEC')) return { name: 'Weapon Master', emoji: '⚔️' }
  if (set.has('END') && set.has('FOC')) return { name: 'Iron Marathoner', emoji: '🛡️' }
  if (set.has('VIT') && set.has('FOC')) return { name: 'Healer', emoji: '🧬' }
  if (set.has('PWR') && set.has('END')) return { name: 'Juggernaut', emoji: '🐗' }
  if (set.has('TEC') && set.has('FOC')) return { name: 'Tactician', emoji: '🧠' }
  return { name: 'All-Rounder', emoji: '🌟' }
}
