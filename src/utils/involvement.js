// ════════════════════════════════════════════════════════════════════════════
//  FRACTIONAL MUSCLE INVOLVEMENT — how much of a set each muscle really gets.
//
//  The old model was binary: primary = 1 set, every secondary = 0.5. But EMG
//  research (Schoenfeld; Contreras' EMG series; Martín-Fuentes et al. 2020 on
//  the deadlift; Vigotsky et al.) shows compound lifts distribute stimulus very
//  unevenly — a deadlift trains glutes/hams/erectors hard, quads moderately,
//  traps/forearms isometrically; a bench press gives triceps ~half the stimulus
//  of the pecs, etc.
//
//  Model: per-set fractional contributions in [0..1] ("effective sets").
//   1. Curated maps for the big compound families (matched by exercise id/name)
//   2. Otherwise: movement-pattern template anchored on the primary muscle
//   3. Declared secondaries guarantee a floor of 0.4
//   4. Unknown/custom exercises fall back to primary 1.0 + secondaries 0.5
// ════════════════════════════════════════════════════════════════════════════
import { EXERCISES } from '../data/exercises.js'

// ── Curated big-lift families (highest-accuracy tier) ─────────────────────────
// Matched by substring on exercise id or name (lowercased).
const FAMILIES = [
  { match: ['deadlift'], not: ['romanian', 'stiff', 'straight_leg', 'rdl'],
    f: { glutes: 0.9, hamstrings: 0.75, lower_back: 0.8, quads: 0.45, traps: 0.5, forearms: 0.5, lats: 0.35, abs: 0.3 } },
  { match: ['romanian', 'rdl', 'stiff_leg', 'straight_leg', 'good_morning'],
    f: { hamstrings: 1.0, glutes: 0.8, lower_back: 0.7, forearms: 0.35, traps: 0.3 } },
  { match: ['back_squat', 'front_squat', 'barbell_squat', 'goblet', 'hack_squat', 'leg_press'],
    f: { quads: 1.0, glutes: 0.7, lower_back: 0.35, hamstrings: 0.25, abs: 0.3, calves: 0.2 } },
  { match: ['bench_press', 'chest_press', 'push_up', 'pushup', 'dips', 'dip'],
    f: { chest: 1.0, triceps: 0.55, front_delts: 0.5 } },
  { match: ['incline'], not: ['curl', 'row'],
    f: { chest: 1.0, front_delts: 0.65, triceps: 0.5 } },
  { match: ['overhead_press', 'ohp', 'shoulder_press', 'military', 'arnold'],
    f: { front_delts: 1.0, side_delts: 0.5, triceps: 0.55, traps: 0.35, abs: 0.2 } },
  { match: ['pull_up', 'pullup', 'chin_up', 'chinup', 'pulldown', 'lat_pull'],
    f: { lats: 1.0, biceps: 0.55, rhomboids: 0.4, rear_delts: 0.3, forearms: 0.45, abs: 0.2 } },
  { match: ['row'], not: ['rear_delt'],
    f: { lats: 0.85, rhomboids: 0.6, traps: 0.5, rear_delts: 0.45, biceps: 0.45, forearms: 0.35, lower_back: 0.3 } },
  { match: ['hip_thrust', 'glute_bridge'],
    f: { glutes: 1.0, hamstrings: 0.45, quads: 0.2, lower_back: 0.2 } },
  { match: ['lunge', 'split_squat', 'step_up', 'bulgarian'],
    f: { quads: 0.9, glutes: 0.8, hamstrings: 0.35, calves: 0.25, abs: 0.25 } },
]

// ── Pattern templates (anchored on the exercise's primary muscle) ─────────────
const PATTERN_TEMPLATES = {
  push_h: { triceps: 0.5, front_delts: 0.45, chest: 0.5 },
  push_v: { triceps: 0.5, side_delts: 0.45, traps: 0.3, front_delts: 0.5 },
  pull_v: { biceps: 0.5, rhomboids: 0.35, rear_delts: 0.3, forearms: 0.4, lats: 0.5 },
  pull_h: { biceps: 0.45, rhomboids: 0.5, traps: 0.4, rear_delts: 0.4, forearms: 0.35, lats: 0.5 },
  hinge:  { glutes: 0.6, hamstrings: 0.6, lower_back: 0.55, forearms: 0.3, traps: 0.3 },
  squat:  { quads: 0.6, glutes: 0.55, lower_back: 0.3, abs: 0.25, hamstrings: 0.2 },
  lunge:  { quads: 0.6, glutes: 0.6, hamstrings: 0.3, calves: 0.2 },
}

const EX_BY_ID = new Map(EXERCISES.map(e => [e.id, e]))

const matches = (hay, parts) => parts.some(p => hay.includes(p))

/**
 * Fractional involvement map for one logged exercise.
 * @returns {Object} muscle → fraction of a set (primary always 1.0)
 */
export function getInvolvement(exerciseId, primary, secondaries = []) {
  const def = EX_BY_ID.get(exerciseId)
  const hay = `${exerciseId || ''} ${(def?.name || '')}`.toLowerCase().replace(/[\s-]+/g, '_')
  const prim = primary || def?.primary
  const secs = (secondaries?.length ? secondaries : def?.secondary) || []

  const out = {}
  if (prim) out[prim] = 1.0

  // Tier 1: curated family
  const fam = FAMILIES.find(F => matches(hay, F.match) && !(F.not && matches(hay, F.not)))
  if (fam) {
    for (const [m, v] of Object.entries(fam.f)) out[m] = Math.max(out[m] || 0, v)
    if (prim) out[prim] = 1.0                       // primary always full credit
    return out
  }

  // Tier 2: pattern template
  const tpl = def?.pattern && PATTERN_TEMPLATES[def.pattern]
  if (tpl) {
    for (const [m, v] of Object.entries(tpl)) {
      if (m === prim) continue
      out[m] = Math.max(out[m] || 0, v)
    }
  }

  // Tier 3: declared secondaries floor (also the full fallback for custom exercises)
  for (const s of secs) {
    if (s === prim) continue
    out[s] = Math.max(out[s] || 0, tpl || fam ? 0.4 : 0.5)
  }
  return out
}

/**
 * Effective working-set volume per muscle for a list of sessions, using
 * fractional involvement. Drop-in replacement for the old primary+0.5 logic.
 */
export function effectiveMuscleSets(sessions, muscleKeys) {
  const sets = {}
  muscleKeys.forEach(m => { sets[m] = 0 })
  for (const session of sessions) {
    for (const ex of session.exercises || []) {
      const n = (ex.sets || []).filter(s => !s.warmup).length
      if (!n) continue
      const inv = getInvolvement(ex.exerciseId, ex.primaryMuscle || ex.primary, ex.secondaryMuscles || ex.secondary)
      for (const [m, f] of Object.entries(inv)) {
        if (sets[m] !== undefined) sets[m] += n * f
      }
    }
  }
  return sets
}
