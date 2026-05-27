// ════════════════════════════════════════════════════════════════════════════
//  Smart Session Rebuild engine
//  — exercise variations, muscle-region emphasis, weekly-volume deltas,
//    complementary suggestions, and auto rep/set re-prescription.
// ════════════════════════════════════════════════════════════════════════════
import { EXERCISES } from '../data/exercises.js'
import { MUSCLE_GROUPS } from '../data/muscles.js'

// ── Sub-region inference ──────────────────────────────────────────────────────
// Muscle groups don't model sub-regions, so we infer from name/pattern.
// This lets us spot "3 upper-chest moves, 0 lower" type imbalances.
export function getRegion(ex) {
  const n = ex.name.toLowerCase()
  const m = ex.primary

  if (m === 'chest') {
    if (/incline/.test(n))            return 'Upper Chest'
    if (/decline|dip/.test(n))        return 'Lower Chest'
    if (/fly|pec deck|svend/.test(n)) return 'Inner / Stretch'
    return 'Mid Chest'
  }
  if (m === 'lats') {
    if (ex.pattern === 'pull_v' || /pulldown|pull-up|pull up|chin/.test(n)) return 'Lat Width'
    if (ex.pattern === 'hinge')       return 'Lower / Hinge'
    return 'Back Thickness'
  }
  if (m === 'biceps') {
    if (/incline/.test(n))            return 'Long Head (stretch)'
    if (/preacher|concentration|spider/.test(n)) return 'Short Head (peak)'
    if (/hammer/.test(n))             return 'Brachialis'
    return 'Overall'
  }
  if (m === 'triceps') {
    if (/overhead|skull|french/.test(n)) return 'Long Head'
    if (/pushdown|press.?down|kickback/.test(n)) return 'Lateral Head'
    return 'Overall'
  }
  if (m === 'quads') {
    if (/hack|sissy|leg extension/.test(n)) return 'Rectus / Sweep'
    if (/front squat|high bar/.test(n))     return 'Quad-Dominant'
    return 'Overall'
  }
  if (m === 'hamstrings') {
    if (/curl/.test(n))               return 'Knee Flexion'
    if (/rdl|romanian|stiff|good ?morning/.test(n)) return 'Hip Hinge'
    return 'Overall'
  }
  if (m === 'side_delts')  return 'Lateral'
  if (m === 'front_delts') return 'Anterior'
  if (m === 'rear_delts')  return 'Posterior'
  return MUSCLE_GROUPS[m]?.label || 'Overall'
}

// ── Muscle emphasis profile (matches heatmap weighting) ───────────────────────
// primary = 1.0, each secondary = 0.5
export function getEmphasis(ex) {
  const out = { [ex.primary]: 1.0 }
  ;(ex.secondary || []).forEach(s => { out[s] = 0.5 })
  return out
}

// ── Auto rep/set re-prescription when category changes ────────────────────────
// Keeps the session coherent: heavy compounds = low reps/long rest,
// isolation = higher reps/short rest.
const SCHEME = {
  strength:    { compound:{reps:'3–5', rest:'4–5 min', rir:'3 RIR', sets:4}, isolation:{reps:'6–8',  rest:'2–3 min', rir:'2 RIR', sets:3} },
  hypertrophy: { compound:{reps:'6–10',rest:'2–3 min', rir:'2 RIR', sets:4}, isolation:{reps:'10–15',rest:'60–90 s', rir:'1 RIR', sets:3} },
  endurance:   { compound:{reps:'12–15',rest:'45 s',   rir:'1 RIR', sets:3}, isolation:{reps:'15–20',rest:'30 s',   rir:'0 RIR', sets:3} },
  deload:      { compound:{reps:'10–12',rest:'90 s',   rir:'4 RIR', sets:2}, isolation:{reps:'12–15',rest:'60 s',   rir:'3 RIR', sets:2} },
}

export function represcribe(newEx, repScheme = 'hypertrophy', keepSets) {
  const s = SCHEME[repScheme] || SCHEME.hypertrophy
  const band = newEx.category === 'compound' ? s.compound : s.isolation
  return {
    sets: keepSets ?? band.sets,
    reps: band.reps,
    rest: band.rest,
    rir:  band.rir,
  }
}

// ── Weekly-volume delta from a swap ───────────────────────────────────────────
// Returns [{ muscle, label, delta }] — how the week's set count shifts.
export function weeklyDelta(oldEx, newEx, sets = 3) {
  const before = getEmphasis(oldEx)
  const after  = getEmphasis(newEx)
  const muscles = new Set([...Object.keys(before), ...Object.keys(after)])
  const out = []
  muscles.forEach(m => {
    const d = +(((after[m] || 0) - (before[m] || 0)) * sets).toFixed(1)
    if (d !== 0) out.push({ muscle: m, label: MUSCLE_GROUPS[m]?.label || m, delta: d })
  })
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

// ── Grouped alternatives for the swap modal ───────────────────────────────────
// Groups: same region (closest match), different emphasis (same muscle),
// then ranked within each by category match + difficulty proximity.
export function groupedAlternatives(ex, equipmentTypes, userLevel = 2) {
  const region = getRegion(ex)
  const pool = EXERCISES.filter(e =>
    e.id !== ex.id &&
    e.primary === ex.primary &&
    (!equipmentTypes || equipmentTypes.has(e.equipment))
  )
  const rank = (a, b) => {
    // same category first, then closeness in difficulty to user
    if ((a.category === ex.category) !== (b.category === ex.category))
      return a.category === ex.category ? -1 : 1
    return Math.abs(a.difficulty - userLevel) - Math.abs(b.difficulty - userLevel)
  }
  const sameRegion = pool.filter(e => getRegion(e) === region).sort(rank)
  const diffRegion = pool.filter(e => getRegion(e) !== region).sort(rank)
  return { region, sameRegion, diffRegion }
}

// ── Session coverage analysis ─────────────────────────────────────────────────
// Detects redundancy (same region trained 2+×) and uncovered regions.
export function analyzeCoverage(exercises) {
  const byMuscle = {}
  exercises.forEach(ex => {
    const m = ex.primary
    const r = getRegion(ex)
    byMuscle[m] = byMuscle[m] || {}
    byMuscle[m][r] = (byMuscle[m][r] || 0) + 1
  })
  const redundant = []
  Object.entries(byMuscle).forEach(([m, regions]) => {
    Object.entries(regions).forEach(([r, count]) => {
      if (count >= 2) redundant.push({ muscle: m, region: r, count })
    })
  })
  return { byMuscle, redundant }
}

// Known region sets per muscle — used to find gaps
const MUSCLE_REGIONS = {
  chest: ['Upper Chest', 'Mid Chest', 'Lower Chest'],
  lats:  ['Lat Width', 'Back Thickness'],
  biceps:['Long Head (stretch)', 'Short Head (peak)'],
  triceps:['Long Head', 'Lateral Head'],
}

// ── Complementary suggestions after a swap ────────────────────────────────────
// Given the current session exercises and the focus muscle, find regions of that
// muscle NOT yet covered and return up to `n` exercises that fill the gaps.
export function suggestComplementary(exercises, focusMuscle, equipmentTypes, repScheme = 'hypertrophy', n = 3) {
  const covered = new Set(
    exercises.filter(e => e.primary === focusMuscle).map(e => getRegion(e))
  )
  const allRegions = MUSCLE_REGIONS[focusMuscle] || []
  const gaps = allRegions.filter(r => !covered.has(r))
  const usedIds = new Set(exercises.map(e => e.id))

  const suggestions = []
  for (const gap of gaps) {
    const candidate = EXERCISES
      .filter(e =>
        e.primary === focusMuscle &&
        getRegion(e) === gap &&
        !usedIds.has(e.id) &&
        (!equipmentTypes || equipmentTypes.has(e.equipment))
      )
      .sort((a, b) => (a.category === 'compound' ? -1 : 1))[0]
    if (candidate) {
      suggestions.push({
        ...candidate,
        ...represcribe(candidate, repScheme),
        _reason: `Fills the ${gap} gap — your session didn't hit it`,
        _region: gap,
      })
    }
    if (suggestions.length >= n) break
  }
  return suggestions
}
