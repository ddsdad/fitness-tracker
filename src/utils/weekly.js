// ════════════════════════════════════════════════════════════════════════════
//  Weekly engine — turns the endless session pile into discrete program weeks.
//  Week boundaries anchor to the user's start date, so "day 1 = Monday" (or any
//  weekday they began on) is automatically respected. Each completed week gets a
//  high-level recap that is auto-archived for history + future pattern learning.
// ════════════════════════════════════════════════════════════════════════════
import { MUSCLE_GROUPS, RP_VOLUME } from '../data/muscles.js'
import { epley1RM } from './calculations.js'

const MS_DAY = 86_400_000
const MS_WEEK = 7 * MS_DAY

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

// Which program week a given date falls in (1-indexed), anchored to startDate.
export function weekNumberFor(startDate, date = new Date()) {
  const start = startOfDay(startDate)
  const diff = startOfDay(date) - start
  return Math.max(1, Math.floor(diff / MS_WEEK) + 1)
}

export function getCurrentWeek(startDate) {
  return weekNumberFor(startDate, new Date())
}

// [start, end) date range for program week N.
export function getWeekRange(startDate, weekNo) {
  const start = startOfDay(startDate)
  const wStart = new Date(start.getTime() + (weekNo - 1) * MS_WEEK)
  const wEnd = new Date(wStart.getTime() + MS_WEEK)
  return { start: wStart, end: wEnd }
}

// Human label like "Mar 3 – Mar 9"
export function weekRangeLabel(startDate, weekNo) {
  const { start, end } = getWeekRange(startDate, weekNo)
  const last = new Date(end.getTime() - MS_DAY) // inclusive last day
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(last)}`
}

// Sessions that fall inside a given week range.
export function sessionsInWeek(sessions, startDate, weekNo) {
  const { start, end } = getWeekRange(startDate, weekNo)
  return sessions.filter(s => {
    const t = new Date(s.date)
    return t >= start && t < end
  })
}

// Working-set volume per muscle for an explicit set of sessions (range-agnostic).
export function muscleVolumeForSessions(sessions) {
  const sets = {}
  Object.keys(MUSCLE_GROUPS).forEach(m => { sets[m] = 0 })
  sessions.forEach(session => {
    (session.exercises || []).forEach(ex => {
      const count = (ex.sets || []).filter(s => !s.warmup).length
      if (sets[ex.primaryMuscle] !== undefined) sets[ex.primaryMuscle] += count
      ex.secondaryMuscles?.forEach(sm => { if (sets[sm] !== undefined) sets[sm] += count * 0.5 })
    })
  })
  return sets
}

function bestE1RM(sets = []) {
  let best = 0
  for (const s of sets) if (s.weight > 0 && s.reps > 0 && !s.warmup) best = Math.max(best, epley1RM(s.weight, s.reps))
  return best
}

function totalVolume(sessions) {
  return Math.round(sessions.reduce((t, s) => t + (s.exercises || []).reduce((st, ex) =>
    st + (ex.sets || []).reduce((v, set) => v + (set.warmup ? 0 : (set.weight || 0) * (set.reps || 0)), 0), 0), 0))
}

// ── Build a medium-depth recap for one completed program week ──────────────────
export function buildWeekSummary(weekNo, allSessions, nutritionLogs, profile) {
  const startDate = profile?.startDate
  const unit = profile?.unit || 'kg'
  const week = sessionsInWeek(allSessions, startDate, weekNo)
  const prevWeek = weekNo > 1 ? sessionsInWeek(allSessions, startDate, weekNo - 1) : []
  const { start, end } = getWeekRange(startDate, weekNo)

  const sessionCount = week.length
  const volume = totalVolume(week)
  const prevVolume = totalVolume(prevWeek)
  const volChange = prevVolume > 0 ? Math.round((volume - prevVolume) / prevVolume * 100) : null

  // PRs achieved during this week (best e1RM this week vs best ever before week start)
  const priorSessions = allSessions.filter(s => new Date(s.date) < start)
  const prs = []
  for (const s of week) {
    for (const ex of s.exercises || []) {
      const cur = bestE1RM(ex.sets)
      if (cur <= 0) continue
      let priorBest = 0
      for (const ps of priorSessions) {
        const pex = ps.exercises?.find(e => e.exerciseId === ex.exerciseId)
        if (pex) priorBest = Math.max(priorBest, bestE1RM(pex.sets))
      }
      if (priorBest > 0 && cur > priorBest + 0.5) {
        const existing = prs.find(p => p.exerciseId === ex.exerciseId)
        if (!existing || cur > existing.value) {
          if (existing) { existing.value = +cur.toFixed(1); existing.gain = +(cur - priorBest).toFixed(1) }
          else prs.push({ exerciseId: ex.exerciseId, name: ex.name, value: +cur.toFixed(1), gain: +(cur - priorBest).toFixed(1) })
        }
      }
    }
  }

  // Per-muscle coverage vs weekly MEV
  const vol = muscleVolumeForSessions(week)
  const onTrack = [], behind = []
  Object.entries(vol).forEach(([m, v]) => {
    const mev = RP_VOLUME[m]?.MEV ?? 0
    if (mev <= 0) return
    if (v >= mev) onTrack.push(MUSCLE_GROUPS[m]?.label || m)
    else if (v > 0) behind.push(MUSCLE_GROUPS[m]?.label || m)
  })

  // Nutrition adherence within the week (days with >50g protein logged)
  let proteinDays = 0, daysLogged = 0
  for (let d = new Date(start); d < end; d = new Date(d.getTime() + MS_DAY)) {
    const key = d.toISOString().slice(0, 10)
    const log = nutritionLogs?.[key]
    if (log) {
      daysLogged++
      const p = Object.values(log.meals || {}).flat().reduce((s, e) => s + (e.macros?.protein || 0), 0)
      if (p > 50) proteinDays++
    }
  }

  // High-level headline + focus
  let headline, focus
  if (sessionCount === 0) {
    headline = 'Rest week — no sessions logged'
    focus = 'Get one session in to restart momentum.'
  } else if (sessionCount >= 5) {
    headline = `Strong week — ${sessionCount} sessions${prs.length ? `, ${prs.length} PR${prs.length > 1 ? 's' : ''}` : ''}`
    focus = behind.length ? `Bring up: ${behind.slice(0, 3).join(', ')}.` : 'Great coverage — keep progressing the load.'
  } else if (sessionCount >= 3) {
    headline = `Solid week — ${sessionCount} sessions${prs.length ? `, ${prs.length} PR${prs.length > 1 ? 's' : ''}` : ''}`
    focus = behind.length ? `Add a session for: ${behind.slice(0, 3).join(', ')}.` : 'Good week — push for one more session.'
  } else {
    headline = `Light week — ${sessionCount} session${sessionCount > 1 ? 's' : ''}`
    focus = 'Aim for 4+ sessions next week to drive growth.'
  }

  return {
    week: weekNo,
    label: weekRangeLabel(startDate, weekNo),
    dateStart: start.toISOString().slice(0, 10),
    sessionCount,
    volume,
    volChange,
    prs,
    onTrack,
    behind,
    proteinDays,
    daysLogged,
    headline,
    focus,
    unit,
    archivedAt: Date.now(),
  }
}

// ── Auto-archive: build summaries for every COMPLETED week not yet stored ──────
// Returns a new array of summaries (existing + any newly completed weeks).
// Only archives weeks that contain at least one session (skips pre-app emptiness).
export function archiveCompletedWeeks(profile, sessions, nutritionLogs, existing = []) {
  if (!profile?.startDate) return existing
  const currentWeek = getCurrentWeek(profile.startDate)
  const have = new Set(existing.map(s => s.week))
  const out = [...existing]
  let added = false
  for (let w = 1; w < currentWeek; w++) {
    if (have.has(w)) continue
    const weekSessions = sessionsInWeek(sessions, profile.startDate, w)
    if (weekSessions.length === 0) continue // don't archive empty pre-start weeks
    out.push(buildWeekSummary(w, sessions, nutritionLogs, profile))
    added = true
  }
  if (!added) return existing // keep referential identity when nothing changed
  return out.sort((a, b) => b.week - a.week) // newest first
}
