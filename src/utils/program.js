// ════════════════════════════════════════════════════════════════════════════
//  3-Month Program engine — periodized 6-day PPL with weekly progression,
//  built-in deloads, daily readiness adjustment, and per-day workout generation.
// ════════════════════════════════════════════════════════════════════════════
import { EXERCISES } from '../data/exercises.js'

// 6-day Push/Pull/Legs, Mon→Sun (index 0 = first day of the program week)
export const PPL_SCHEDULE = ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'rest']

export const SPLIT_META = {
  push: { label: 'Push Day',  emoji: '💪', muscles: ['chest', 'front_delts', 'side_delts', 'triceps'] },
  pull: { label: 'Pull Day',  emoji: '🔙', muscles: ['lats', 'rhomboids', 'rear_delts', 'biceps'] },
  legs: { label: 'Leg Day',   emoji: '🦵', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  rest: { label: 'Rest Day',  emoji: '😴', muscles: [] },
}

// ── 12-week periodization ─────────────────────────────────────────────────────
export function generateProgram(profile, startDate = new Date().toISOString().slice(0, 10)) {
  const weeks = []
  for (let w = 1; w <= 12; w++) {
    let phase, intensityPct, rir, deload = false, focus
    if (w === 5 || w === 10) {
      deload = true; phase = 'Deload'; intensityPct = 0.60; rir = '4–5'
      focus = 'Recovery week — 60% loads, half the sets. Let everything heal.'
    } else if (w <= 4) {
      phase = 'Foundation'; intensityPct = +(0.70 + (w - 1) * 0.025).toFixed(2); rir = '2–3'
      focus = 'Newbie gains — add weight or reps every single session.'
    } else if (w <= 9) {
      phase = 'Volume'; intensityPct = +(0.75 + (w - 6) * 0.02).toFixed(2); rir = '1–2'
      focus = 'Push volume — more sets, train close to failure.'
    } else {
      phase = 'Intensity'; intensityPct = +(0.82 + (w - 11) * 0.03).toFixed(2); rir = '0–1'
      focus = 'Heaviest loads of the block — maximize then test.'
    }
    weeks.push({ week: w, phase, intensityPct, rir, deload, focus })
  }
  return { startDate, totalWeeks: 12, schedule: PPL_SCHEDULE, weeks, kind: 'ppl_6day' }
}

// ── Where am I in the program right now? ──────────────────────────────────────
export function getProgramStatus(program, today = new Date()) {
  const start = new Date(program.startDate); start.setHours(0, 0, 0, 0)
  const now = new Date(today); now.setHours(0, 0, 0, 0)
  const dayDiff = Math.floor((now - start) / 86_400_000)

  if (dayDiff < 0) return { notStarted: true, daysUntil: -dayDiff }

  const weekIdx   = Math.floor(dayDiff / 7)
  const dayInWeek = dayDiff % 7
  const finished  = weekIdx >= program.totalWeeks

  const week      = Math.min(program.totalWeeks, weekIdx + 1)
  const weekPlan  = program.weeks[week - 1]
  const split     = program.schedule[dayInWeek]

  return { notStarted: false, finished, week, dayInWeek, split, weekPlan }
}

// ── Daily readiness ───────────────────────────────────────────────────────────
// sleep: hours slept (0–10) · soreness: 1 (none) – 5 (very sore) · energy: 1–5
export function readinessScore({ sleep = 7, soreness = 2, energy = 3 }) {
  const sleepScore  = Math.min(1, sleep / 8) * 40
  const soreScore   = ((5 - soreness) / 4) * 30
  const energyScore = ((energy - 1) / 4) * 30
  return Math.max(0, Math.min(100, Math.round(sleepScore + soreScore + energyScore)))
}

export function readinessAdjustment(score) {
  if (score >= 80) return { loadPct: 1.0, setsDelta: 0,  skipFinisher: false, label: 'Primed',   color: 'var(--green)',  message: 'Fully recovered — hit your numbers and chase a PR.' }
  if (score >= 55) return { loadPct: 1.0, setsDelta: 0,  skipFinisher: false, label: 'Ready',    color: 'var(--green)',  message: 'Good to train as planned.' }
  if (score >= 35) return { loadPct: 0.9, setsDelta: -1, skipFinisher: false, label: 'Moderate', color: 'var(--yellow)', message: 'A bit run-down — drop ~10% load and a set if needed.' }
  return                  { loadPct: 0.8, setsDelta: -1, skipFinisher: true,  label: 'Low',      color: 'var(--red)',    message: 'Under-recovered — 80% loads, cut a set, skip the finisher. Recovery beats grinding.' }
}

// ── Generate today's workout for a split + week phase ─────────────────────────
// variant 0 = first occurrence of the split that week (A), 1 = second (B)
function phasePrescription(weekPlan) {
  if (weekPlan.deload)              return { sets: 2, reps: '10–12', rest: '90 s' }
  if (weekPlan.phase === 'Intensity') return { sets: 4, reps: '4–6',  rest: '3–4 min' }
  if (weekPlan.phase === 'Volume')    return { sets: 4, reps: '8–12', rest: '2 min' }
  return                               { sets: 3, reps: '6–10', rest: '2–3 min' }  // Foundation
}

export function generateProgramWorkout(split, weekPlan, variant = 0, readinessAdj = null) {
  const meta = SPLIT_META[split]
  if (!meta || !meta.muscles.length) return []
  const base = phasePrescription(weekPlan)
  const sets = Math.max(1, base.sets + (readinessAdj?.setsDelta || 0))

  const out = []
  const usedIds = new Set()

  meta.muscles.forEach((m, mi) => {
    const pool = EXERCISES.filter(e => e.primary === m && !usedIds.has(e.id))
    const compounds  = pool.filter(e => e.category === 'compound')
    const isolations = pool.filter(e => e.category !== 'compound')

    // Primary muscles (first 2) get a compound; rotate by variant for A/B variety
    const comp = compounds.length ? compounds[variant % compounds.length] : pool[0]
    if (comp) {
      out.push(mkEx(comp, sets, base))
      usedIds.add(comp.id)
    }
    // First two muscles also get an isolation for extra volume
    if (mi < 2 && isolations.length) {
      const iso = isolations[variant % isolations.length]
      if (iso && !usedIds.has(iso.id)) { out.push(mkEx(iso, Math.max(2, sets - 1), base)); usedIds.add(iso.id) }
    }
  })

  // Cap to 6 exercises; drop finisher (last isolation) if readiness says so
  let result = out.slice(0, 6)
  if (readinessAdj?.skipFinisher && result.length > 3) {
    const lastIso = [...result].reverse().find(e => e.category !== 'compound')
    if (lastIso) result = result.filter(e => e.id !== lastIso.id)
  }
  return result
}

function mkEx(ex, sets, base) {
  return {
    id: ex.id, name: ex.name, primary: ex.primary, secondary: ex.secondary || [],
    category: ex.category, equipment: ex.equipment,
    sets, reps: base.reps, rest: base.rest, notes: ex.notes,
  }
}

// Which occurrence (A=0/B=1) is this split on the given day index of the week?
export function splitVariant(schedule, dayInWeek) {
  const split = schedule[dayInWeek]
  let count = 0
  for (let i = 0; i < dayInWeek; i++) if (schedule[i] === split) count++
  return count
}
