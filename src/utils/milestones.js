import { caseyButtCeiling, monthlyGainPotential, navyBF, lbmAndFat, epley1RM, recoveryModifier } from './calculations.js'

// ─── Training level detection ─────────────────────────────────────────────────
// Uses average lift-to-bodyweight ratio to classify experience
export function detectTrainingLevel(liftMaxes = {}, bodyweight_kg = 80) {
  const bw = Math.max(bodyweight_kg, 1)
  const sq  = (liftMaxes?.squat    || 0) / bw
  const bp  = (liftMaxes?.bench    || 0) / bw
  const dl  = (liftMaxes?.deadlift || 0) / bw

  // Score each lift (how far toward intermediate standard)
  const sqScore  = sq  / 1.5   // 1.5×BW squat = solid intermediate
  const bpScore  = bp  / 1.0   // 1.0×BW bench  = intermediate
  const dlScore  = dl  / 2.0   // 2.0×BW deadlift = intermediate

  const known = [sq > 0 && sqScore, bp > 0 && bpScore, dl > 0 && dlScore].filter(Boolean)
  const avg   = known.length ? known.reduce((a,b) => a+b, 0) / known.length : 0

  if (avg === 0 || avg < 0.30) return 'untrained'    // < ~30% of intermediate standard
  if (avg < 0.60)               return 'novice'       // 30–60% of intermediate
  if (avg < 0.90)               return 'intermediate' // 60–90% of intermediate
  return 'advanced'
}

export const TRAINING_LEVEL_META = {
  untrained:    { label: 'Untrained',    color: 'var(--red)',    note: 'Newbie gains — expect rapid early progress' },
  novice:       { label: 'Novice',       color: 'var(--yellow)', note: 'Fast gains — consistency compounds quickly' },
  intermediate: { label: 'Intermediate', color: 'var(--green)',  note: 'Steady gains — programming matters more now' },
  advanced:     { label: 'Advanced',     color: 'var(--blue)',   note: 'Slow gains — details make the difference' },
}

// Multipliers on base gain rates.  Beginners respond 2–3× faster than intermediates.
// decay: gains slow this fraction each month (realistic S-curve behaviour)
const LEVEL_MULT = {
  untrained:    { lift: 3.5, lbm: 2.5, measure: 2.0, decayPerMonth: 0.88 },
  novice:       { lift: 2.0, lbm: 1.6, measure: 1.5, decayPerMonth: 0.93 },
  intermediate: { lift: 1.0, lbm: 1.0, measure: 1.0, decayPerMonth: 0.98 },
  advanced:     { lift: 0.5, lbm: 0.6, measure: 0.7, decayPerMonth: 1.00 },
}

// ─── Week-by-week milestone generation ──────────────────────────────────────
export function generateMilestones(profile) {
  const {
    targetWeeks, bodyweight, height, wrist, ankle, neck, measurements = {},
    liftMaxes = {}, physiqueGoal, unit, age = 25, gender = 'male',
  } = profile

  // Derive BF%
  let bf_pct = 18
  if (neck > 0 && height > 0 && measurements?.waist > 0) {
    const waist_cm = unit === 'kg' ? measurements.waist : measurements.waist * 2.54
    const neck_cm  = unit === 'kg' ? neck  : neck  * 2.54
    const ht_cm    = unit === 'kg' ? height : height * 2.54
    const hips_cm  = unit === 'kg' ? (measurements?.hips || 0) : (measurements?.hips || 0) * 2.54
    try { bf_pct = navyBF(waist_cm, neck_cm, ht_cm, gender, hips_cm) } catch {}
  }

  const bw_kg    = unit === 'kg' ? bodyweight : bodyweight / 2.2046
  const ht_cm    = unit === 'kg' ? height     : height * 2.54
  const wrist_cm = wrist > 0 ? (unit === 'kg' ? wrist : wrist * 2.54) : 17
  const ankle_cm = ankle > 0 ? (unit === 'kg' ? ankle : ankle * 2.54) : 22

  const { lbm: currentLBM_kg } = lbmAndFat(bw_kg, bf_pct)
  const { maxLBM_kg }           = caseyButtCeiling(ht_cm, wrist_cm, ankle_cm, 0.05)

  // Detect training level from lift maxes
  const level    = detectTrainingLevel(liftMaxes, bw_kg)
  const mult     = LEVEL_MULT[level]
  const recov    = typeof recoveryModifier === 'function' ? recoveryModifier(age) : 1.0

  // Caloric mode multiplier (affects LBM & BW gain speed)
  const CALORIC_MULT = { aggressive_bulk: 1.4, lean_bulk: 1.0, maintenance: 0.5, cut: 0.2 }
  const caloricMult  = CALORIC_MULT[profile.caloricMode] ?? 1.0

  // Base monthly LBM gain (from ceiling proximity) × caloric mode
  const baseLBMMonth = monthlyGainPotential(currentLBM_kg, maxLBM_kg, age) // kg/month
  const lbmPerWeek   = (baseLBMMonth * mult.lbm * caloricMult) / 4

  // Bodyweight trajectory (cut = negative, bulk = positive)
  const bwPerWeek = profile.caloricMode === 'cut'
    ? -0.35
    : physiqueGoal === 'lean_athletic'
      ? -0.20
      : lbmPerWeek * (profile.caloricMode === 'aggressive_bulk' ? 1.4 : 1.12)

  // Base lift rates (kg/week for intermediate) × level multiplier × recovery
  const baseLiftRates = {
    squat:    physiqueGoal === 'stronger_legs'   ? 1.2 : 0.9,
    bench:    physiqueGoal === 'bigger_chest'    ? 0.7 : 0.55,
    deadlift: 1.0,
    row:      0.55,
    ohp:      physiqueGoal === 'wider_shoulders' ? 0.55 : 0.40,
  }

  // Base measurement rates (cm/week for intermediate)
  const baseMeasureRates = {
    chest:     physiqueGoal === 'bigger_chest'    ? 0.030 : 0.015,
    shoulders: physiqueGoal === 'wider_shoulders' ? 0.028 : 0.013,
    arms:      physiqueGoal === 'bigger_arms'     ? 0.022 : 0.010,
    waist:     physiqueGoal === 'lean_athletic'   ? -0.025 : 0.004,
    hips:      0.007,
    thighs:    physiqueGoal === 'stronger_legs'   ? 0.025 : 0.010,
    calves:    0.008,
  }

  const toUnit  = (kg) => unit === 'kg' ? kg : +(kg * 2.2046).toFixed(1)
  const mScale  = unit === 'kg' ? 1 : 1 / 2.54

  const milestones = []
  for (let w = 1; w <= targetWeeks; w++) {
    // Decay factor: gains slow each 4-week block (realistic S-curve)
    const month       = Math.floor((w - 1) / 4)
    const decayFactor = mult.decayPerMonth ** month

    // Cumulative gains up to this week using a sum that accounts for decay
    // Simple approach: sum weekly gains each of which has decayed
    let cumBW = 0, cumLift = {}, cumMeas = {}
    for (let ww = 1; ww <= w; ww++) {
      const mo      = Math.floor((ww - 1) / 4)
      const df      = mult.decayPerMonth ** mo
      cumBW        += bwPerWeek * df
      Object.entries(baseLiftRates).forEach(([k, r]) => {
        cumLift[k] = (cumLift[k] || 0) + toUnit(r * mult.lift * recov * df)
      })
      Object.entries(baseMeasureRates).forEach(([k, r]) => {
        cumMeas[k] = (cumMeas[k] || 0) + r * mult.measure * mScale * df
      })
    }

    milestones.push({
      week:       w,
      level,   // expose training level on each milestone
      bodyweight: +(bodyweight + cumBW).toFixed(1),
      measurements: Object.fromEntries(
        Object.entries(measurements).map(([k, v]) => [
          k, v > 0 ? +(v + (cumMeas[k] || 0)).toFixed(1) : 0
        ])
      ),
      liftMaxes: Object.fromEntries(
        Object.entries(liftMaxes).map(([k, v]) => [
          k, v > 0 ? +(v + (cumLift[k] || 0)).toFixed(1) : 0
        ])
      ),
    })
  }

  return milestones
}

// ─── Current week since program start ───────────────────────────────────────
export function getCurrentWeek(startDate) {
  const start = new Date(startDate)
  const now   = new Date()
  const diffMs = now - start
  return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)))
}

// ─── Compare actual vs target ────────────────────────────────────────────────
export function getProgressStatus(actual, target, isLoss = false) {
  if (actual == null || target == null || target === 0) return null
  const diff = actual - target
  const pct  = Math.abs(diff) / Math.abs(target) * 100
  if (isLoss) {
    if (diff <= 0 && pct <= 5) return 'on_track'
    if (diff > 0) return 'behind'
    return 'ahead'
  }
  if (Math.abs(pct) <= 5) return 'on_track'
  if (diff < 0) return 'behind'
  return 'ahead'
}

export function getStatusLabel(status) {
  if (status === 'on_track') return { label: 'On Track', cls: 'badge-green' }
  if (status === 'ahead')    return { label: 'Ahead',    cls: 'badge-blue'  }
  if (status === 'behind')   return { label: 'Behind',   cls: 'badge-red'   }
  return { label: 'No Data', cls: '' }
}

export function getStatusMessage(metric, status) {
  if (status === 'on_track') return `${metric} is progressing on schedule.`
  if (status === 'behind')   return `${metric} is behind target — consider adding volume or frequency.`
  if (status === 'ahead')    return `${metric} is ahead of target — great progress!`
  return ''
}
