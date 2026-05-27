// ════════════════════════════════════════════════════════════════════════════
//  Progress analytics — 1RM trend, rate-of-gain, best/worst weeks,
//  plateau detection, and strength projection.
// ════════════════════════════════════════════════════════════════════════════
import { epley1RM } from './calculations.js'

const MS_WEEK = 7 * 86_400_000

// Best Epley 1RM across an exercise's sets
function bestE1RM(sets = []) {
  let best = 0
  for (const s of sets) {
    if (s.weight > 0 && s.reps > 0 && !s.warmup) {
      const e = epley1RM(s.weight, s.reps)
      if (e > best) best = e
    }
  }
  return best > 0 ? +best.toFixed(1) : 0
}

// ── Estimated 1RM trend for a given exercise across all sessions ──────────────
export function e1rmTrend(sessions, exerciseId) {
  const pts = []
  ;[...sessions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(s => {
      const ex = s.exercises?.find(e => e.exerciseId === exerciseId)
      if (!ex) return
      const e = bestE1RM(ex.sets)
      if (e > 0) pts.push({ date: s.date.slice(5, 10), full: s.date, e1rm: e })
    })
  return pts
}

// Which exercises have the most logged data (for the trend selector)
export function topTrackedExercises(sessions, n = 6) {
  const counts = {}
  sessions.forEach(s => s.exercises?.forEach(ex => {
    if (ex.sets?.some(st => st.weight > 0 && st.reps > 0)) {
      counts[ex.exerciseId] = counts[ex.exerciseId] || { id: ex.exerciseId, name: ex.name, count: 0 }
      counts[ex.exerciseId].count++
    }
  }))
  return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, n)
}

// ── Plateau detection for an exercise ─────────────────────────────────────────
// Flags a stall if the best e1RM in the last ~3 weeks hasn't beaten the prior best.
export function detectPlateau(sessions, exerciseId) {
  const trend = e1rmTrend(sessions, exerciseId)
  if (trend.length < 4) return null
  const now = Date.now()
  const recent = trend.filter(p => now - new Date(p.full) <= 3 * MS_WEEK)
  const older  = trend.filter(p => now - new Date(p.full) >  3 * MS_WEEK)
  if (recent.length < 2 || older.length < 1) return null
  const recentBest = Math.max(...recent.map(p => p.e1rm))
  const olderBest  = Math.max(...older.map(p => p.e1rm))
  if (recentBest <= olderBest) {
    return {
      exerciseId,
      stalledAt: recentBest,
      weeks: 3,
      suggestion: 'Try a deload then a 5-rep progression, switch the variation, or add 1–2 back-off sets.',
    }
  }
  return null
}

// ── Volume per ISO week (Mon-anchored) ────────────────────────────────────────
function weekKey(dateStr) {
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7 // Mon=0
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

export function weeklyVolumeSeries(sessions) {
  const map = {}
  sessions.forEach(s => {
    const vol = (s.exercises || []).reduce((t, ex) =>
      t + (ex.sets || []).reduce((st, set) => st + (set.warmup ? 0 : (set.weight || 0) * (set.reps || 0)), 0), 0)
    const k = weekKey(s.date)
    map[k] = (map[k] || 0) + vol
  })
  return Object.entries(map)
    .map(([week, volume]) => ({ week, label: week.slice(5), volume: Math.round(volume) }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

// Best & worst training weeks by volume
export function bestWorstWeeks(sessions) {
  const series = weeklyVolumeSeries(sessions).filter(w => w.volume > 0)
  if (series.length < 2) return null
  const best  = series.reduce((m, w) => w.volume > m.volume ? w : m, series[0])
  const worst = series.reduce((m, w) => w.volume < m.volume ? w : m, series[0])
  const avg   = Math.round(series.reduce((s, w) => s + w.volume, 0) / series.length)
  return { best, worst, avg, weeks: series.length }
}

// ── Rate of gain (bodyweight / lean mass) from measurement history or checkins ─
export function gainRate(measurementHistory = [], unit = 'kg') {
  const bw = measurementHistory
    .filter(r => r.metric === 'bodyweight')
    .sort((a, b) => a.date.localeCompare(b.date))
  if (bw.length < 2) return null
  const first = bw[0], last = bw[bw.length - 1]
  const days = Math.max(1, (new Date(last.date) - new Date(first.date)) / 86_400_000)
  const totalChange = +(last.value - first.value).toFixed(1)
  const perWeek = +(totalChange / (days / 7)).toFixed(2)
  return { totalChange, perWeek, weeks: +(days / 7).toFixed(1), unit, from: first.value, to: last.value }
}

// ── Personal records across all exercises ────────────────────────────────────
function exVolume(ex) {
  return (ex.sets || []).reduce((t, s) => t + (s.warmup ? 0 : (s.weight || 0) * (s.reps || 0)), 0)
}

export function computePRs(sessions) {
  const byEx = {}   // exerciseId -> record
  const feed = []   // chronological new-1RM-PR events
  const running = {} // exerciseId -> best e1rm so far (for feed)

  ;[...sessions].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(s => {
    (s.exercises || []).forEach(ex => {
      const rec = byEx[ex.exerciseId] || (byEx[ex.exerciseId] = {
        exerciseId: ex.exerciseId, name: ex.name,
        best1RM: { value: 0, date: null },
        bestSet: { weight: 0, reps: 0, date: null },
        bestVolumeDay: { volume: 0, date: null },
      })
      const e = bestE1RM(ex.sets)
      if (e > rec.best1RM.value) rec.best1RM = { value: e, date: s.date }
      // best single working set by weight (tiebreak reps)
      ;(ex.sets || []).forEach(set => {
        if (set.warmup || !set.weight || !set.reps) return
        if (set.weight > rec.bestSet.weight || (set.weight === rec.bestSet.weight && set.reps > rec.bestSet.reps)) {
          rec.bestSet = { weight: set.weight, reps: set.reps, date: s.date }
        }
      })
      const vol = exVolume(ex)
      if (vol > rec.bestVolumeDay.volume) rec.bestVolumeDay = { volume: Math.round(vol), date: s.date }
      // feed: new all-time e1rm
      if (e > 0 && e > (running[ex.exerciseId] || 0) + 0.5) {
        const prev = running[ex.exerciseId] || 0
        feed.push({ date: s.date, name: ex.name, exerciseId: ex.exerciseId, e1rm: e, delta: prev ? +(e - prev).toFixed(1) : null, first: !prev })
        running[ex.exerciseId] = e
      }
    })
  })

  const records = Object.values(byEx).sort((a, b) => b.best1RM.value - a.best1RM.value)
  feed.reverse() // newest first
  return { records, feed }
}

// ── Per-exercise drill-down ───────────────────────────────────────────────────
export function exerciseDetail(sessions, exerciseId) {
  const rows = []
  ;[...sessions].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(s => {
    const ex = s.exercises?.find(e => e.exerciseId === exerciseId)
    if (!ex) return
    const working = (ex.sets || []).filter(st => !st.warmup && st.weight > 0 && st.reps > 0)
    if (!working.length) return
    const top = working.reduce((m, st) => (st.weight > m.weight ? st : m), working[0])
    rows.push({
      date: s.date,
      name: ex.name,
      sets: working.length,
      topSet: { weight: top.weight, reps: top.reps },
      volume: Math.round(exVolume(ex)),
      e1rm: bestE1RM(ex.sets),
    })
  })
  return rows
}

// ── Strength projection — linear fit over an e1RM trend ───────────────────────
export function projectStrength(trend, weeksAhead = 8) {
  if (!trend || trend.length < 3) return null
  // x = days since first point, y = e1rm
  const t0 = new Date(trend[0].full).getTime()
  const xs = trend.map(p => (new Date(p.full).getTime() - t0) / 86_400_000)
  const ys = trend.map(p => p.e1rm)
  const n = xs.length
  const sx = xs.reduce((a, b) => a + b, 0)
  const sy = ys.reduce((a, b) => a + b, 0)
  const sxx = xs.reduce((a, b) => a + b * b, 0)
  const sxy = xs.reduce((a, b, i) => a + b * ys[i], 0)
  const denom = n * sxx - sx * sx
  if (denom === 0) return null
  const slope = (n * sxy - sx * sy) / denom        // per day
  const intercept = (sy - slope * sx) / n
  const lastX = xs[xs.length - 1]
  const projected = +(intercept + slope * (lastX + weeksAhead * 7)).toFixed(1)
  const current = ys[ys.length - 1]
  return {
    current,
    projected: Math.max(current, projected),
    perWeek: +(slope * 7).toFixed(2),
    weeksAhead,
    trending: slope > 0.05 ? 'up' : slope < -0.05 ? 'down' : 'flat',
  }
}
