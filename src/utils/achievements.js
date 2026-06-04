// ════════════════════════════════════════════════════════════════════════════
//  Achievements / badges — computed client-side from the user's own data.
// ════════════════════════════════════════════════════════════════════════════

function currentStreak(sessions) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dateset = new Set(sessions.map(s => { const d = new Date(s.date); d.setHours(0,0,0,0); return d.getTime() }))
  let streak = 0, check = new Date(today)
  for (let i = 0; i < 400; i++) {
    if (dateset.has(check.getTime())) { streak++; check.setDate(check.getDate() - 1) }
    else if (i === 0) check.setDate(check.getDate() - 1)
    else break
  }
  return streak
}

// best lift relative to bodyweight (uses profile.liftMaxes, already in user's unit)
function liftRatio(profile, key) {
  const bw = profile?.bodyweight || 1
  return (profile?.liftMaxes?.[key] || 0) / bw
}

// ── Achievement definitions ───────────────────────────────────────────────────
// Each: progress(ctx) → { current, target }. Earned when current >= target.
const DEFS = [
  // Workout milestones
  { id: 'first_workout',    emoji: '🌱', label: 'First Steps',       desc: 'Log your first workout',
    progress: c => ({ current: Math.min(c.sessions.length, 1), target: 1 }) },
  { id: 'ten_sessions',     emoji: '📿', label: 'Getting Serious',   desc: 'Log 10 workouts',
    progress: c => ({ current: c.sessions.length, target: 10 }) },
  { id: 'fifty_sessions',   emoji: '🏗️', label: 'Built Different',   desc: 'Log 50 workouts',
    progress: c => ({ current: c.sessions.length, target: 50 }) },
  { id: 'hundred_sessions', emoji: '🏛️', label: 'Iron Veteran',      desc: 'Log 100 workouts',
    progress: c => ({ current: c.sessions.length, target: 100 }) },
  { id: 'twohundred_sessions', emoji: '🗿', label: 'Stone Cold',     desc: 'Log 200 workouts',
    progress: c => ({ current: c.sessions.length, target: 200 }) },

  // Streaks
  { id: 'streak_7',         emoji: '🔥', label: 'On Fire',           desc: '7-day workout streak',
    progress: c => ({ current: c.streak, target: 7 }) },
  { id: 'streak_30',        emoji: '⚡', label: 'Unstoppable',       desc: '30-day workout streak',
    progress: c => ({ current: c.streak, target: 30 }) },
  { id: 'streak_100',       emoji: '💎', label: 'Diamond Grind',     desc: '100-day workout streak',
    progress: c => ({ current: c.streak, target: 100 }) },

  // Weekly volume
  { id: 'five_week',        emoji: '📅', label: 'Weekly Warrior',    desc: '5 workouts in a single week',
    progress: c => ({ current: c.bestWeekSessions, target: 5 }) },

  // Strength milestones
  { id: 'bench_bw',         emoji: '🏋️', label: 'Bench Bodyweight',  desc: 'Bench press your bodyweight',
    progress: c => ({ current: +liftRatio(c.profile, 'bench').toFixed(2), target: 1 }) },
  { id: 'bench_1_5',        emoji: '🔩', label: 'Bench King',        desc: 'Bench 1.5× bodyweight',
    progress: c => ({ current: +liftRatio(c.profile, 'bench').toFixed(2), target: 1.5 }) },
  { id: 'squat_1_5',        emoji: '🦵', label: '1.5× Squat',        desc: 'Squat 1.5× bodyweight',
    progress: c => ({ current: +liftRatio(c.profile, 'squat').toFixed(2), target: 1.5 }) },
  { id: 'squat_2',          emoji: '🏔️', label: 'Squat Mountain',    desc: 'Squat 2× bodyweight',
    progress: c => ({ current: +liftRatio(c.profile, 'squat').toFixed(2), target: 2 }) },
  { id: 'deadlift_2',       emoji: '💀', label: 'Double Pull',       desc: 'Deadlift 2× bodyweight',
    progress: c => ({ current: +liftRatio(c.profile, 'deadlift').toFixed(2), target: 2 }) },
  { id: 'deadlift_3',       emoji: '🦣', label: 'Mammoth Pull',      desc: 'Deadlift 3× bodyweight',
    progress: c => ({ current: +liftRatio(c.profile, 'deadlift').toFixed(2), target: 3 }) },
  { id: 'ohp_bw',           emoji: '🌩️', label: 'Press Overhead',    desc: 'Overhead press your bodyweight',
    progress: c => ({ current: +liftRatio(c.profile, 'ohp').toFixed(2), target: 1 }) },

  // Tracking milestones
  { id: 'first_checkin',    emoji: '📸', label: 'Check-In',          desc: 'Log your first body measurement',
    progress: c => ({ current: Math.min(c.measurementHistory.length, 1), target: 1 }) },
  { id: 'pr_machine',       emoji: '🏆', label: 'PR Machine',        desc: 'Record 10 measurement updates',
    progress: c => ({ current: c.measurementHistory.length, target: 10 }) },

  // Volume & nutrition
  { id: 'volume_week',      emoji: '🐘', label: 'Volume Beast',      desc: 'Hit 20k kg in a week',
    progress: c => ({ current: c.bestWeekVolume, target: 20000 }) },
  { id: 'protein_streak',   emoji: '🥩', label: 'Protein Locked',    desc: '5 protein-goal days in a week',
    progress: c => ({ current: c.proteinDays, target: 5 }) },
  { id: 'protein_week',     emoji: '🍗', label: 'Protein Week',      desc: '7 consecutive protein-goal days',
    progress: c => ({ current: c.proteinDays, target: 7 }) },
]

function bestWeekVolume(sessions) {
  const map = {}
  sessions.forEach(s => {
    const d = new Date(s.date); d.setHours(0,0,0,0); d.setDate(d.getDate() - ((d.getDay()+6)%7))
    const k = d.toISOString().slice(0,10)
    const v = (s.exercises||[]).reduce((t,ex)=>t+(ex.sets||[]).reduce((st,set)=>st+(set.warmup?0:(set.weight||0)*(set.reps||0)),0),0)
    map[k] = (map[k]||0) + v
  })
  return Math.round(Math.max(0, ...Object.values(map)))
}

function bestWeekSessions(sessions) {
  const map = {}
  sessions.forEach(s => {
    const d = new Date(s.date); d.setHours(0,0,0,0); d.setDate(d.getDate() - ((d.getDay()+6)%7))
    const k = d.toISOString().slice(0,10)
    map[k] = (map[k] || 0) + 1
  })
  return Math.max(0, ...Object.values(map))
}

function proteinDaysThisWeek(nutritionLogs) {
  const now = Date.now(); let n = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(now - i*86400000).toISOString().slice(0,10)
    const log = nutritionLogs[d]
    if (log) { const p = Object.values(log.meals||{}).flat().reduce((s,e)=>s+(e.macros?.protein||0),0); if (p > 100) n++ }
  }
  return n
}

export function computeAchievements({ sessions = [], profile = {}, measurementHistory = [], nutritionLogs = {} }) {
  const ctx = {
    sessions, profile, measurementHistory,
    streak: currentStreak(sessions),
    bestWeekVolume: bestWeekVolume(sessions),
    bestWeekSessions: bestWeekSessions(sessions),
    proteinDays: proteinDaysThisWeek(nutritionLogs),
  }
  return DEFS.map(d => {
    const { current, target } = d.progress(ctx)
    const earned = current >= target
    return { ...d, current, target, earned, pct: Math.min(100, Math.round(current / target * 100)) }
  }).sort((a, b) => (b.earned - a.earned) || (b.pct - a.pct))
}

export function achievementSummary(achievements) {
  const earned = achievements.filter(a => a.earned).length
  return { earned, total: achievements.length }
}
