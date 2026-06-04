// ════════════════════════════════════════════════════════════════════════════
//  Rest-of-week planner — a science-based volume allocator.
//
//  Models the rest of the current PROGRAM WEEK as a constrained optimization:
//    • Each muscle has a weekly volume TARGET (from RP MEV→MRV landmarks,
//      scaled by the user's goal priority and fiber-type response profile).
//    • DEBT = target − sets already logged this week.
//    • Spread the remaining debt across the days left, one session per day,
//      choosing the split that pays down the most weighted debt among muscles
//      that are RECOVERED (≥48 h since last trained, planned days included).
//    • Per-session and per-week assignments are capped at the recoverable
//      ceiling (MRV) so we never prescribe junk/injurious volume.
//    • Recomputes from scratch every call → miss a day and the remaining days
//      automatically re-optimize; log a heavy chest day and chest debt drops.
// ════════════════════════════════════════════════════════════════════════════
import { MUSCLE_GROUPS, RP_VOLUME, GOAL_MUSCLE_WEIGHTS } from '../data/muscles.js'
import { EXERCISES } from '../data/exercises.js'
import { getCurrentWeek, getWeekRange, sessionsInWeek, muscleVolumeForSessions } from './weekly.js'
import { getMuscleWeeklyTarget } from './recommendations.js'

const MS_DAY = 86_400_000

// ── Fiber-type / training-response presets ───────────────────────────────────
// Frames adjustability by how a person RESPONDS to training (volume tolerance),
// not by ethnicity. Slow-twitch-dominant athletes generally tolerate & need
// more volume; fast-twitch-dominant respond more to heavier, lower-rep work.
export const FIBER_PROFILES = {
  endurance: {
    id: 'endurance', label: 'Endurance (Type I)', emoji: '🔋',
    volumeMult: 1.2, restMult: 0.85, repBias: 'high',
    desc: 'More volume, higher reps, shorter rest — for high work capacity / slow-twitch dominance.',
  },
  balanced: {
    id: 'balanced', label: 'Balanced', emoji: '⚖️',
    volumeMult: 1.0, restMult: 1.0, repBias: 'mid',
    desc: 'Standard volume and rep ranges — a good default if unsure.',
  },
  power: {
    id: 'power', label: 'Power (Type II)', emoji: '⚡',
    volumeMult: 0.85, restMult: 1.2, repBias: 'low',
    desc: 'Heavier loads, lower reps, longer rest, slightly less total volume — for fast-twitch dominance.',
  },
}
export function getFiberProfile(id) { return FIBER_PROFILES[id] || FIBER_PROFILES.balanced }

// Candidate splits the planner can schedule on a given day.
const PLANNER_SPLITS = {
  push:       { label: 'Push',          emoji: '💪', muscles: ['chest','front_delts','side_delts','triceps'] },
  pull:       { label: 'Pull',          emoji: '🔙', muscles: ['lats','rhomboids','traps','rear_delts','biceps'] },
  legs:       { label: 'Legs',          emoji: '🦵', muscles: ['quads','hamstrings','glutes','calves','lower_back'] },
  upper:      { label: 'Upper',         emoji: '⬆️', muscles: ['chest','lats','front_delts','side_delts','biceps','triceps'] },
  lower:      { label: 'Lower',         emoji: '⬇️', muscles: ['quads','hamstrings','glutes','calves','abs'] },
  full_body:  { label: 'Full Body',     emoji: '🏋️', muscles: ['chest','lats','quads','hamstrings','front_delts','biceps','triceps'] },
  arms:       { label: 'Arms',          emoji: '💥', muscles: ['biceps','triceps','forearms'] },
  chest_tris: { label: 'Chest & Tris',  emoji: '🤜', muscles: ['chest','front_delts','triceps'] },
  back_bis:   { label: 'Back & Bis',    emoji: '🦅', muscles: ['lats','rhomboids','traps','rear_delts','biceps'] },
}

const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x }

// ── Main: plan the remaining days of the current program week ──────────────────
export function planRestOfWeek(sessions, profile, customWeights = null, today = new Date()) {
  if (!profile?.startDate) return null
  const goalId = profile.physiqueGoal || 'overall_size'
  const goalWeights = customWeights || GOAL_MUSCLE_WEIGHTS[goalId] || GOAL_MUSCLE_WEIGHTS.overall_size
  const fiber = getFiberProfile(profile.fiberType)

  const week = getCurrentWeek(profile.startDate)
  const { start } = getWeekRange(profile.startDate, week)
  const weekSessions = sessionsInWeek(sessions, profile.startDate, week)
  const done = muscleVolumeForSessions(weekSessions)   // working sets per muscle so far

  const totalDays = 7
  const todayIdx = Math.min(totalDays - 1, Math.max(0, Math.round((startOfDay(today) - start) / MS_DAY)))
  const daysLeft = totalDays - todayIdx                 // including today
  const cram = daysLeft <= 2                            // crunch mode → allow higher per-session volume

  // Per-muscle targets, recovery ceilings, and current debt
  const muscles = Object.keys(MUSCLE_GROUPS)
  const target = {}, mrvCap = {}, debt = {}, planned = {}, goalW = {}
  for (const m of muscles) {
    const sliderW = goalWeights[m] ?? 1.0
    goalW[m] = sliderW
    const rp = RP_VOLUME[m] || { MEV: 8, MAV: 14, MRV: 20 }
    const t = Math.min(
      Math.round(rp.MRV * fiber.volumeMult),
      Math.round(getMuscleWeeklyTarget(m, sliderW) * fiber.volumeMult)
    )
    target[m] = t
    mrvCap[m] = Math.round(rp.MRV * fiber.volumeMult)
    debt[m]   = Math.max(0, t - (done[m] || 0))
    planned[m] = 0
  }

  // Last day-index each muscle was trained (logged), for the 48 h recovery rule
  const lastDay = {}
  for (const s of weekSessions) {
    const idx = Math.round((startOfDay(s.date) - start) / MS_DAY)
    for (const ex of s.exercises || []) {
      const m = ex.primaryMuscle || ex.primary
      if (m) lastDay[m] = Math.max(lastDay[m] ?? -99, idx)
    }
  }

  const recovered = (m, d) => (lastDay[m] === undefined) || (d - lastDay[m] >= 2)
  const headroom  = (m) => Math.max(0, mrvCap[m] - (done[m] || 0) - planned[m])

  // Per-MUSCLE cap for a single session: ~half of MAV normally (a muscle can't
  // productively absorb its whole weekly volume in one day), raised toward full
  // MAV in cram mode. Hard ceiling of 8 sets/muscle/session (junk-volume guard).
  const perMuscleSessionCap = (m) => {
    const rp = RP_VOLUME[m] || { MAV: 14 }
    const mav = rp.MAV * fiber.volumeMult
    const normal = Math.max(3, Math.round(mav / 2))
    return Math.min(8, cram ? Math.max(normal, Math.round(mav * 0.75)) : normal)
  }
  // Per-SESSION total-sets budget — a real workout is ~16-24 working sets, a bit
  // higher in cram mode. Prevents a "full body" day ballooning to 70+ sets.
  const sessionSetBudget = cram ? 28 : 22

  // Greedy day-by-day allocation
  const days = []
  for (let d = todayIdx; d < totalDays; d++) {
    // Score each split by weighted debt of its recovered, still-in-debt muscles
    let best = null, bestScore = 0
    for (const [id, split] of Object.entries(PLANNER_SPLITS)) {
      let score = 0
      for (const m of split.muscles) {
        if (debt[m] > 0 && headroom(m) > 0 && recovered(m, d)) score += debt[m] * goalW[m]
      }
      if (score > bestScore) { bestScore = score; best = { id, ...split } }
    }

    const date = new Date(start.getTime() + d * MS_DAY)
    const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short' })

    if (!best || bestScore <= 0) {
      days.push({ dayIndex: d, dateLabel, isToday: d === todayIdx, split: 'rest', label: 'Rest', emoji: '😴', muscles: [], totalSets: 0 })
      continue
    }

    // Allocate within the session budget, highest weighted-debt muscle first.
    const ranked = best.muscles
      .filter(m => debt[m] > 0 && headroom(m) > 0 && recovered(m, d))
      .sort((a, b) => (debt[b] * goalW[b]) - (debt[a] * goalW[a]))

    const assigned = []
    let budget = sessionSetBudget
    for (const m of ranked) {
      if (budget < 2) break
      const sets = Math.min(debt[m], perMuscleSessionCap(m), headroom(m), budget)
      if (sets >= 2) {
        assigned.push({ muscle: m, label: MUSCLE_GROUPS[m]?.label || m, sets })
        planned[m] += sets
        debt[m]    -= sets
        lastDay[m]  = d
        budget     -= sets
      }
    }

    days.push({
      dayIndex: d, dateLabel, isToday: d === todayIdx,
      split: best.id, label: best.label, emoji: best.emoji,
      muscles: assigned,
      totalSets: assigned.reduce((s, x) => s + x.sets, 0),
    })
  }

  // Per-muscle projection (done + planned vs target)
  const perMuscle = muscles.map(m => {
    const proj = (done[m] || 0) + planned[m]
    return {
      muscle: m, label: MUSCLE_GROUPS[m]?.label || m,
      done: +(done[m] || 0).toFixed(1), target: target[m],
      scheduled: planned[m], projected: +proj.toFixed(1),
      projectedPct: target[m] > 0 ? Math.round(proj / target[m] * 100) : 0,
      goalW: goalW[m],
    }
  }).filter(x => x.goalW > 0.4 && (x.target > 0))
    .sort((a, b) => a.projectedPct - b.projectedPct)

  const debtBefore  = muscles.reduce((s, m) => s + Math.max(0, target[m] - (done[m] || 0)), 0)
  const scheduledSets = Object.values(planned).reduce((s, v) => s + v, 0)
  const debtRemaining = muscles.reduce((s, m) => s + debt[m], 0)
  const coveragePct = debtBefore > 0 ? Math.round((debtBefore - debtRemaining) / debtBefore * 100) : 100

  // Highest-value muscles still short after the plan (couldn't fully fit)
  const stillShort = perMuscle
    .filter(x => x.projectedPct < 85)
    .slice(0, 3)
    .map(x => x.label)

  return {
    week, daysLeft, cram, fiber: fiber.id, fiberLabel: fiber.label,
    trainingDays: days.filter(d => d.split !== 'rest').length,
    days, perMuscle,
    totals: { scheduledSets, debtBefore: Math.round(debtBefore), coveragePct },
    stillShort,
  }
}

// ── Turn a planned day's muscle allocation into concrete exercises ─────────────
// For each muscle, pick the best-fit exercises (compound first) and split the
// allocated sets across 1-2 movements, ~3-4 sets each. Returns plan-exercise
// objects ready for planExercisesToSession().
export function buildDayWorkout(planDay, profile) {
  if (!planDay || !planDay.muscles?.length) return []
  const fiber = getFiberProfile(profile?.fiberType)
  const reps = fiber.repBias === 'high' ? '12–15' : fiber.repBias === 'low' ? '5–8' : '8–12'
  const out = []
  const usedIds = new Set()

  for (const { muscle, sets } of planDay.muscles) {
    const pool = EXERCISES.filter(e => e.primary === muscle && !usedIds.has(e.id))
    if (!pool.length) continue
    const compounds  = pool.filter(e => e.category === 'compound').sort((a, b) => a.difficulty - b.difficulty)
    const isolations = pool.filter(e => e.category !== 'compound').sort((a, b) => a.difficulty - b.difficulty)

    // 1 movement for ≤4 sets, 2 movements when more volume is allocated
    const movements = sets > 4 ? 2 : 1
    const picks = []
    if (compounds[0]) picks.push(compounds[0])
    if (movements === 2) picks.push(isolations[0] || compounds[1] || compounds[0])
    else if (!picks.length && isolations[0]) picks.push(isolations[0])

    const per = Math.max(2, Math.round(sets / picks.length))
    for (const ex of picks.filter(Boolean)) {
      if (usedIds.has(ex.id)) continue
      usedIds.add(ex.id)
      out.push({
        id: ex.id, name: ex.name, primary: ex.primary, secondary: ex.secondary || [],
        category: ex.category, equipment: ex.equipment, sets: Math.min(5, per), reps,
      })
    }
  }
  return out
}
