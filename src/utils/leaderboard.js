// ── Leaderboard stat computation ──────────────────────────────────────────────
// All inputs are already in the user's chosen unit (kg or lbs).

const MS_DAY = 86_400_000

function daysAgo(n) {
  const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - n); return d
}

// Sessions in the last N days
function sessionsInLast(sessions, days) {
  const cutoff = daysAgo(days)
  return sessions.filter(s => new Date(s.date) >= cutoff).length
}

// Total volume (sets × reps × weight) for sessions in last N days
function volumeInLast(sessions, days) {
  const cutoff = daysAgo(days)
  return sessions
    .filter(s => new Date(s.date) >= cutoff)
    .reduce((total, session) => {
      const v = (session.exercises || []).reduce((t, ex) => {
        return t + (ex.sets || []).reduce((st, set) => {
          if (!set.completed && set.completed !== undefined) return st
          return st + (parseFloat(set.weight) || 0) * (parseFloat(set.reps) || 0)
        }, 0)
      }, 0)
      return total + v
    }, 0)
}

// Current streak (consecutive workout days up to today)
function calcStreak(sessions) {
  const today = new Date(); today.setHours(0,0,0,0)
  const dateset = new Set(sessions.map(s => {
    const d = new Date(s.date); d.setHours(0,0,0,0); return d.getTime()
  }))
  let streak = 0
  let check = new Date(today)
  for (let i = 0; i < 365; i++) {
    if (dateset.has(check.getTime())) {
      streak++
      check.setDate(check.getDate() - 1)
    } else if (i === 0) {
      check.setDate(check.getDate() - 1) // today with no session — don't break
    } else break
  }
  return streak
}

// Weight change over last N days from measurement history
function weightChange(measurementHistory, days) {
  const recs = measurementHistory
    .filter(r => r.metric === 'bodyweight')
    .sort((a, b) => a.date.localeCompare(b.date))
  if (recs.length < 2) return 0
  const cutoff = daysAgo(days).toISOString().slice(0, 10)
  const recent = recs[recs.length - 1].value
  const old = recs.find(r => r.date >= cutoff) || recs[0]
  const change = recent - old.value
  // cap absurd swings from bad data (±50 kg-equiv)
  return +Math.max(-110, Math.min(110, change)).toFixed(2)
}

// ── Main export ───────────────────────────────────────────────────────────────
// Anti-cheat sanity ceilings (well beyond world records, in kg-equivalent)
const CAP = { lift: 600, volumeWeek: 200000, sessionsWeek: 21, sessionsMonth: 90, streak: 366 }
const clamp = (v, max) => Math.max(0, Math.min(v || 0, max))

export function computeLeaderboardStats(profile, sessions, checkins, measurementHistory) {
  const liftMaxes = profile?.liftMaxes || {}
  const unit = profile?.unit || 'kg'
  const liftCap = unit === 'lbs' ? CAP.lift * 2.2046 : CAP.lift

  // Lift PRs: use profile value OR best checkin value (whichever is higher)
  const bestLift = (key) => {
    const base = liftMaxes[key] || 0
    const best = checkins.reduce((m, c) => Math.max(m, c.liftMaxes?.[key] || 0), 0)
    return clamp(Math.max(base, best), liftCap)
  }

  return {
    sessionsWeek:     clamp(sessionsInLast(sessions, 7), CAP.sessionsWeek),
    sessionsMonth:    clamp(sessionsInLast(sessions, 30), CAP.sessionsMonth),
    sessionsAllTime:  sessions.length,
    volumeWeek:       clamp(Math.round(volumeInLast(sessions, 7)), CAP.volumeWeek),
    streak:           clamp(calcStreak(sessions), CAP.streak),
    benchPR:          bestLift('bench'),
    squatPR:          bestLift('squat'),
    deadliftPR:       bestLift('deadlift'),
    bodyweight:       profile?.bodyweight || 0,
    weightChangeWeek: weightChange(measurementHistory, 7),
    weightChangeMonth: weightChange(measurementHistory, 30),
    unit,
  }
}

// ── Leaderboard categories definition ────────────────────────────────────────
export const LEADERBOARD_CATEGORIES = [
  {
    id: 'sessionsWeek',
    label: 'Most Active',
    emoji: '🔥',
    period: 'This Week',
    key: 'sessionsWeek',
    format: v => `${v} session${v !== 1 ? 's' : ''}`,
    hintFn: (diff) => `Log ${Math.ceil(diff)} more session${Math.ceil(diff) !== 1 ? 's' : ''} this week`,
    higherIsBetter: true,
  },
  {
    id: 'streak',
    label: 'Streak',
    emoji: '🏆',
    period: 'Consecutive Days',
    key: 'streak',
    format: v => `${v}d streak`,
    hintFn: (diff) => `Work out ${Math.ceil(diff)} more day${Math.ceil(diff) !== 1 ? 's' : ''} in a row`,
    higherIsBetter: true,
  },
  {
    id: 'volumeWeek',
    label: 'Volume King',
    emoji: '⚡',
    period: 'This Week',
    key: 'volumeWeek',
    format: v => v >= 1000 ? `${(v/1000).toFixed(1)}k kg` : `${Math.round(v)} kg`,
    hintFn: (diff, unit) => `Lift ${Math.round(diff)} more ${unit || 'kg'} volume`,
    higherIsBetter: true,
  },
  {
    id: 'benchPR',
    label: 'Bench Boss',
    emoji: '💪',
    period: 'All Time PR',
    key: 'benchPR',
    format: (v, unit) => `${v} ${unit || 'kg'}`,
    hintFn: (diff, unit) => `Hit a ${diff.toFixed(1)}${unit} heavier bench`,
    higherIsBetter: true,
  },
  {
    id: 'squatPR',
    label: 'Squat King',
    emoji: '🦵',
    period: 'All Time PR',
    key: 'squatPR',
    format: (v, unit) => `${v} ${unit || 'kg'}`,
    hintFn: (diff, unit) => `Hit a ${diff.toFixed(1)}${unit} heavier squat`,
    higherIsBetter: true,
  },
  {
    id: 'deadliftPR',
    label: 'Deadlift Legend',
    emoji: '🏋️',
    period: 'All Time PR',
    key: 'deadliftPR',
    format: (v, unit) => `${v} ${unit || 'kg'}`,
    hintFn: (diff, unit) => `Pull a ${diff.toFixed(1)}${unit} heavier deadlift`,
    higherIsBetter: true,
  },
  {
    id: 'sessionsMonth',
    label: 'Monthly Grind',
    emoji: '📅',
    period: 'This Month',
    key: 'sessionsMonth',
    format: v => `${v} sessions`,
    hintFn: (diff) => `Log ${Math.ceil(diff)} more session${Math.ceil(diff) !== 1 ? 's' : ''} this month`,
    higherIsBetter: true,
  },
]

// Rank hint for what the user needs to do to surpass the next rank
export function getClimbHint(sorted, myUserId, cat) {
  const myIdx = sorted.findIndex(r => r.user_id === myUserId)
  if (myIdx <= 0) return myIdx === 0 ? "🥇 You're leading!" : null
  const me    = sorted[myIdx]
  const above = sorted[myIdx - 1]
  const myVal   = me?.stats?.[cat.key]    || 0
  const aboveVal = above?.stats?.[cat.key] || 0
  const diff = aboveVal - myVal
  if (diff <= 0) return null
  const unit = me?.stats?.unit || 'kg'
  return cat.hintFn(diff + 0.01, unit)
}

export function getRankEmoji(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}
