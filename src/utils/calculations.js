// ─── Unit helpers ───────────────────────────────────────────────────────────
export const cmToIn = (cm) => cm / 2.54
export const kgToLbs = (kg) => kg * 2.2046
export const lbsToKg = (lbs) => lbs / 2.2046
export const inToCm = (in_) => in_ * 2.54

// ─── Estimated 1RM (blended) ──────────────────────────────────────────────────
// Averages Epley, Brzycki and Lombardi for better accuracy across rep ranges.
// Reps are capped at 12 — beyond that, 1RM estimates are unreliable for any formula.
export function epley1RM(weight, reps) {
  if (!weight || !reps || reps < 1) return 0
  if (reps === 1) return weight
  const r = Math.min(reps, 12)
  const epley    = weight * (1 + r / 30)
  const brzycki  = weight * (36 / (37 - r))
  const lombardi = weight * Math.pow(r, 0.10)
  return (epley + brzycki + lombardi) / 3
}

// ─── US Navy Body Fat % ─────────────────────────────────────────────────────
// Inputs: waist, neck, height all in cm; gender: 'male'|'female'
// hips only needed for female
export function navyBF(waist_cm, neck_cm, height_cm, gender = 'male', hips_cm = 0) {
  const waist = cmToIn(waist_cm)
  const neck  = cmToIn(neck_cm)
  const height = cmToIn(height_cm)
  if (gender === 'male') {
    const val = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450
    return Math.max(3, Math.min(50, +val.toFixed(1)))
  } else {
    const hips = cmToIn(hips_cm)
    const val = 495 / (1.29579 - 0.35004 * Math.log10(waist + hips - neck) + 0.22100 * Math.log10(height)) - 450
    return Math.max(10, Math.min(55, +val.toFixed(1)))
  }
}

// ─── Lean Body Mass & Fat Mass ──────────────────────────────────────────────
export function lbmAndFat(bodyweight_kg, bf_pct) {
  const fat = +(bodyweight_kg * (bf_pct / 100)).toFixed(1)
  const lbm = +(bodyweight_kg - fat).toFixed(1)
  return { lbm, fat }
}

// ─── FFMI ───────────────────────────────────────────────────────────────────
// Fat Free Mass Index — best single physique benchmark
// lbm in kg, height in cm
export function ffmi(lbm_kg, height_cm) {
  const h = height_cm / 100
  const raw = +(lbm_kg / (h * h)).toFixed(2)
  const normalized = +(raw + 6.1 * (1.8 - h)).toFixed(2)
  let rating
  if (normalized < 17)      rating = 'Below Average'
  else if (normalized < 18) rating = 'Average'
  else if (normalized < 20) rating = 'Athletic'
  else if (normalized < 22) rating = 'Very Athletic'
  else if (normalized < 23) rating = 'Muscular'
  else if (normalized < 25) rating = 'Very Muscular'
  else                       rating = 'Elite / Near Ceiling'
  return { raw, normalized, rating }
}

// ─── Casey Butt Genetic Ceiling ─────────────────────────────────────────────
// Max achievable LBM (lbs) for a natural athlete
// wrist & ankle in cm, height in cm, bf_target as decimal (e.g. 0.05)
export function caseyButtCeiling(height_cm, wrist_cm, ankle_cm, bf_target = 0.05) {
  const h_in = cmToIn(height_cm)
  const w_in = cmToIn(wrist_cm)
  const a_in = cmToIn(ankle_cm)
  // Casey Butt formula: max bodyweight at peak conditioning, then extract LBM
  const maxBW_lbs  = h_in ** 0.5 * (w_in ** 0.75 + a_in ** 0.25) * 3.64
  const maxLBM_lbs = maxBW_lbs * (1 - bf_target)
  const maxLBM_kg  = lbsToKg(maxLBM_lbs)
  const maxBW_kg   = +(maxLBM_kg / (1 - bf_target)).toFixed(1)
  return { maxLBM_kg: +maxLBM_kg.toFixed(1), maxBW_kg, maxLBM_lbs: +maxLBM_lbs.toFixed(1) }
}

// ─── Muscle Growth Rate Personalization ─────────────────────────────────────
// How far from ceiling determines monthly gain potential
// Returns kg/month
export function monthlyGainPotential(currentLBM_kg, maxLBM_kg, age = 25) {
  const headroom = Math.max(0, maxLBM_kg - currentLBM_kg)
  const pctRemaining = headroom / maxLBM_kg
  const ageFactor = age < 25 ? 1.0 : age < 35 ? 0.95 : 0.90
  const base = pctRemaining > 0.5 ? 0.9 : pctRemaining > 0.3 ? 0.6 : 0.35
  return +(base * ageFactor).toFixed(2)
}

// ─── BMR & TDEE (Mifflin-St Jeor) ──────────────────────────────────────────
export function bmr(weight_kg, height_cm, age, gender = 'male') {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age
  return gender === 'male' ? base + 5 : base - 161
}

export const ACTIVITY_MULTIPLIERS = {
  sedentary:  { label: 'Sedentary (desk job, no exercise)', mult: 1.2 },
  light:      { label: 'Light (1-3 days/week)', mult: 1.375 },
  moderate:   { label: 'Moderate (3-5 days/week)', mult: 1.55 },
  active:     { label: 'Very Active (6-7 days hard)', mult: 1.725 },
}

export function tdee(weight_kg, height_cm, age, gender, activityKey = 'moderate') {
  const b = bmr(weight_kg, height_cm, age, gender)
  const mult = ACTIVITY_MULTIPLIERS[activityKey]?.mult ?? 1.55
  return Math.round(b * mult)
}

// Macro targets for lean bulk
export function macros(weight_kg, tdeeVal, goal = 'bulk') {
  const lbs = kgToLbs(weight_kg)
  const calAdjust = goal === 'bulk' ? 200 : goal === 'cut' ? -400 : 0
  const targetCals = tdeeVal + calAdjust
  const protein_g  = Math.round(lbs * 1.0)           // 1g per lb
  const fat_g      = Math.round(lbs * 0.35)           // 0.35g per lb
  const carbCals   = targetCals - protein_g * 4 - fat_g * 9
  const carbs_g    = Math.max(0, Math.round(carbCals / 4))
  return { targetCals, protein_g, fat_g, carbs_g }
}

// ─── Steve Reeves Ideal Proportions ─────────────────────────────────────────
// All measurements in cm, based on wrist size
export function reevesIdeals(wrist_cm, ankle_cm) {
  return {
    arm:       +(wrist_cm * 2.52).toFixed(1),   // flexed
    calf:      +(ankle_cm * 1.92).toFixed(1),
    neck:      +(wrist_cm * 2.14).toFixed(1),
    chest:     +(wrist_cm * 6.5).toFixed(1),
    waist:     +(wrist_cm * 4.6).toFixed(1),    // leanness target
    thigh:     +(wrist_cm * 3.3).toFixed(1),    // circumference × π roughly
    shoulder:  +(wrist_cm * 8.0).toFixed(1),    // circumference
  }
}

// Gap to ideal as percentage (negative = below ideal, positive = above)
export function idealGaps(current, ideals) {
  const gaps = {}
  Object.keys(ideals).forEach(k => {
    if (current[k] != null && current[k] > 0) {
      gaps[k] = +(((current[k] - ideals[k]) / ideals[k]) * 100).toFixed(1)
    }
  })
  return gaps
}

// Weakness score: % below ideal (0 = at ideal, 100 = completely untrained)
export function weaknessScores(current, ideals) {
  const scores = {}
  Object.keys(ideals).forEach(k => {
    if (current[k] != null && current[k] > 0) {
      scores[k] = Math.max(0, +((ideals[k] - current[k]) / ideals[k] * 100).toFixed(1))
    } else {
      scores[k] = 100 // unknown = assume max weakness
    }
  })
  return scores
}

// ─── Shoulder-to-Waist Ratio ────────────────────────────────────────────────
export function shoulderWaistRatio(shoulder_cm, waist_cm) {
  if (!shoulder_cm || !waist_cm) return null
  const ratio = +(shoulder_cm / waist_cm).toFixed(2)
  let rating
  if (ratio >= 1.6)      rating = 'Very Aesthetic'
  else if (ratio >= 1.5) rating = 'Athletic'
  else if (ratio >= 1.4) rating = 'Good'
  else if (ratio >= 1.3) rating = 'Average'
  else                   rating = 'Needs Work'
  return { ratio, rating }
}

// ─── Frame Size (from wrist) ────────────────────────────────────────────────
export function frameSize(wrist_cm, gender = 'male') {
  // Standard frame size thresholds
  if (gender === 'male') {
    if (wrist_cm < 16.5) return 'Small'
    if (wrist_cm < 19.0) return 'Medium'
    return 'Large'
  } else {
    if (wrist_cm < 14.0) return 'Small'
    if (wrist_cm < 16.0) return 'Medium'
    return 'Large'
  }
}

// ─── Strength Standards (Symmetric Strength style) ─────────────────────────
// Returns ratio to bodyweight, plus tier label
export function strengthTier(oneRM_kg, bodyweight_kg) {
  if (!oneRM_kg || !bodyweight_kg) return null
  const ratio = +(oneRM_kg / bodyweight_kg).toFixed(2)
  let tier
  if (ratio < 0.5)       tier = 'Untrained'
  else if (ratio < 0.75) tier = 'Novice'
  else if (ratio < 1.0)  tier = 'Intermediate'
  else if (ratio < 1.5)  tier = 'Advanced'
  else if (ratio < 2.0)  tier = 'Elite'
  else                   tier = 'World Class'
  return { ratio, tier }
}

export function strengthTierForLift(lift, oneRM_kg, bodyweight_kg) {
  const t = strengthTier(oneRM_kg, bodyweight_kg)
  if (!t) return null
  // Per-lift multiplier adjustments (deadlift naturally higher ratio)
  const adj = { squat: 1.0, bench: 0.7, deadlift: 1.2, row: 0.7, ohp: 0.5 }
  const mult = adj[lift] || 1.0
  const adjusted = +(oneRM_kg / (bodyweight_kg * mult)).toFixed(2)
  let tier
  if (adjusted < 0.5)       tier = 'Untrained'
  else if (adjusted < 0.75) tier = 'Novice'
  else if (adjusted < 1.0)  tier = 'Intermediate'
  else if (adjusted < 1.5)  tier = 'Advanced'
  else if (adjusted < 2.0)  tier = 'Elite'
  else                       tier = 'World Class'
  return { ratio: t.ratio, adjustedRatio: adjusted, tier }
}

// ─── Leverage Analysis ──────────────────────────────────────────────────────
export function leverageProfile(femur_cm, torso_cm, arm_cm) {
  const profile = {}
  if (femur_cm && torso_cm) {
    const ratio = +(femur_cm / torso_cm).toFixed(2)
    profile.femurTorso = ratio
    if (ratio > 1.0) {
      profile.squat = 'Mechanically disadvantaged — prefer trap bar / sumo deadlift, goblet squat'
      profile.deadlift = 'Advantaged — longer lever = better pull'
    } else {
      profile.squat = 'Advantaged — shorter femurs favor high bar back squat'
      profile.deadlift = 'Standard mechanics'
    }
  }
  if (arm_cm && torso_cm) {
    const ratio = +(arm_cm / torso_cm).toFixed(2)
    profile.armTorso = ratio
    if (ratio > 1.1) {
      profile.bench = 'Long arms = longer ROM — consider closer grip, dumbbells, or board presses'
      profile.row = 'Advantaged — long arms = great for rows and deadlifts'
    } else {
      profile.bench = 'Standard mechanics'
      profile.row = 'Standard mechanics'
    }
  }
  return profile
}

// ─── Volume-to-Measurement Correlation ─────────────────────────────────────
// Rough estimate: cumulative bicep volume (kg total) → arm growth (cm)
export function projectedMeasurementGain(cumulativeVolume_kg, muscleGroup) {
  // Coefficients: cm gained per 1000 kg of volume
  const coeff = {
    biceps:    0.003,  // arm circumference
    triceps:   0.003,
    chest:     0.008,
    lats:      0.006,
    quads:     0.010,
    hamstrings:0.007,
    glutes:    0.007,
    calves:    0.004,
  }
  const c = coeff[muscleGroup] || 0.004
  return +(cumulativeVolume_kg * c / 1000).toFixed(2)
}

// ─── Recovery modifier ──────────────────────────────────────────────────────
export function recoveryModifier(age) {
  if (age < 25) return 1.0
  if (age < 35) return 0.95
  return 0.90
}
