// ════════════════════════════════════════════════════════════════════════════
//  EFFECTIVE LOAD — what the muscle actually feels, not the stack number.
//
//  A "75 lb" cable stack routed through a single movable pulley delivers ~half
//  that at the handle (2:1 mechanical advantage). A leg-press sled loses load to
//  the sled angle. A Smith bar is partly counterbalanced. Comparing a cable
//  fly's "75" to a dumbbell fly's "30" as if equal corrupts e1RM, PRs, and the
//  Shadow Duel. This maps stack/displayed load → effective load at the muscle.
//
//  Factors are practical engineering estimates (not lab-exact), and the user can
//  override per machine via calibration (profile.machineCal[exerciseId]).
// ════════════════════════════════════════════════════════════════════════════

// Equipment-level default multipliers (applied when no exercise-specific rule).
const EQUIP_FACTOR = {
  barbell: 1.0,
  dumbbell: 1.0,
  bodyweight: 1.0,
  bands: 0.9,        // band tension is roughly its marked load near mid-range
  cable: 0.85,       // many stations have some pulley advantage / friction
  machine: 0.9,      // cam/lever machines vary; slight discount by default
  kettlebell: 1.0,
}

// Exercise-pattern keywords → factor. Most specific wins (checked in order).
// Sourced from common gym mechanics: single movable pulley = 0.5, leg press
// sled angle ≈ sin(angle), counterbalanced Smith ≈ -7-9 kg of the bar, etc.
const RULES = [
  // Pure single-pulley cable movements (handle moves 2× the stack travel)
  { match: ['pushdown', 'pull_down', 'pulldown', 'lat_pull', 'cable_fly', 'cable_crossover', 'face_pull', 'cable_curl', 'cable_lateral', 'tricep_rope', 'rope_'], factor: 0.5 },
  // Leg press (sled on an incline ~ 45°): effective ≈ sin(45) of the plate load
  { match: ['leg_press', 'hack_squat'], factor: 0.7 },
  // Smith machine — counterbalanced, slightly lighter than the plates suggest
  { match: ['smith'], factor: 0.92 },
  // Selectorized machines with good cams generally track close to displayed
  { match: ['machine_'], factor: 0.95 },
]

const lc = (s) => (s || '').toLowerCase().replace(/[\s-]+/g, '_')

/**
 * Effective-load multiplier for an exercise.
 * @param ex  exercise def OR { id, name, equipment }
 * @param machineCal  optional { [exerciseId]: factor } user calibration override
 */
export function loadFactor(ex, machineCal = null) {
  if (!ex) return 1
  const id = ex.exerciseId || ex.id
  if (machineCal && machineCal[id] != null) return machineCal[id]

  const hay = `${lc(id)} ${lc(ex.name)}`
  for (const r of RULES) if (r.match.some(m => hay.includes(m))) return r.factor

  return EQUIP_FACTOR[ex.equipment] ?? 1
}

// Convert a displayed/stack weight to effective load at the muscle.
export function effectiveWeight(displayed, ex, machineCal = null) {
  return +(displayed * loadFactor(ex, machineCal)).toFixed(1)
}

// Is this exercise's displayed weight meaningfully different from effective?
export function hasLoadOffset(ex, machineCal = null) {
  return loadFactor(ex, machineCal) < 0.98
}
