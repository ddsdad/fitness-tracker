import { MUSCLE_GROUPS } from '../data/muscles.js'

// Push muscles vs pull muscles for ratio calculation
const PUSH_MUSCLES = ['chest', 'front_delts', 'side_delts', 'triceps']
const PULL_MUSCLES = ['lats', 'rhomboids', 'rear_delts', 'traps', 'biceps']
const QUAD_MUSCLES = ['quads']
const HINGE_MUSCLES = ['hamstrings', 'glutes']

// ─── Push:Pull Ratio ────────────────────────────────────────────────────────
export function pushPullRatio(weeklyVolume) {
  const pushSets = PUSH_MUSCLES.reduce((s, m) => s + (weeklyVolume[m] || 0), 0)
  const pullSets = PULL_MUSCLES.reduce((s, m) => s + (weeklyVolume[m] || 0), 0)
  if (pullSets === 0) return { ratio: null, pushSets, pullSets, status: 'no_data' }
  const ratio = +(pushSets / pullSets).toFixed(2)
  let status, message
  if (ratio > 1.4) {
    status = 'push_heavy'
    message = `Push:Pull is ${ratio}:1 — too much pressing. Risk: shoulder impingement, rounded posture. Add rows and face pulls.`
  } else if (ratio < 0.7) {
    status = 'pull_heavy'
    message = `Push:Pull is ${ratio}:1 — underdeveloped chest/shoulders. Add pressing volume.`
  } else {
    status = 'balanced'
    message = `Push:Pull ratio ${ratio}:1 — well balanced.`
  }
  return { ratio, pushSets, pullSets, status, message }
}

// ─── Quad:Hamstring Balance ─────────────────────────────────────────────────
// Uses estimated 1RM from liftMaxes if available, else falls back to volume ratio
export function quadHamRatio(liftMaxes, weeklyVolume) {
  // Prefer strength-based ratio (leg press / RDL) — use squat vs deadlift as proxy
  const squat = liftMaxes?.squat
  const dead  = liftMaxes?.deadlift
  let ratio = null
  let source = 'volume'

  if (squat && dead) {
    // Approx: hamstrings tested via RDL ≈ 75-85% of deadlift
    const approxRDL = dead * 0.80
    ratio = +(approxRDL / squat).toFixed(2)
    source = 'strength'
  } else {
    const quadSets = QUAD_MUSCLES.reduce((s, m) => s + (weeklyVolume[m] || 0), 0)
    const hingeSets = HINGE_MUSCLES.reduce((s, m) => s + (weeklyVolume[m] || 0), 0)
    if (quadSets > 0) { ratio = +(hingeSets / quadSets).toFixed(2); source = 'volume' }
  }

  if (ratio === null) return { ratio: null, status: 'no_data' }

  let status, message
  // Optimal strength ratio: hamstrings 60-75% of quad strength
  const target = source === 'strength' ? [0.6, 0.75] : [0.6, 1.2]
  if (ratio < target[0]) {
    status = 'quad_dominant'
    message = `Quad:Hamstring ratio ${ratio} — hamstrings undertrained. High ACL injury risk. Prioritize RDLs and leg curls.`
  } else if (ratio > (source === 'strength' ? 1.0 : 1.5)) {
    status = 'ham_dominant'
    message = `Quad:Hamstring ratio ${ratio} — add more quad volume (squats, leg press).`
  } else {
    status = 'balanced'
    message = `Quad:Hamstring balance looks good (ratio ${ratio}).`
  }
  return { ratio, status, message, source }
}

// ─── Rotator Cuff Health ────────────────────────────────────────────────────
// Rule: for every 3 press sets, minimum 2 rear delt / face pull sets
export function rotatorCuffRatio(weeklyVolume) {
  const pressSets = (weeklyVolume.chest || 0) + (weeklyVolume.front_delts || 0) + (weeklyVolume.triceps || 0)
  const rearSets  = (weeklyVolume.rear_delts || 0) + (weeklyVolume.rhomboids || 0)
  const required  = Math.ceil((pressSets / 3) * 2)

  if (pressSets === 0) return { status: 'no_data', pressSets, rearSets, required }
  const ratio = rearSets / pressSets

  let status, message
  if (ratio < 0.5) {
    status = 'at_risk'
    message = `Rotator cuff at risk — ${pressSets} press sets vs only ${rearSets} rear delt sets. Add ${required - rearSets} more sets of face pulls / rear delt flies.`
  } else if (ratio < 0.67) {
    status = 'warning'
    message = `Press:Rear delt ratio borderline — aim for at least 2 rear delt sets per 3 press sets.`
  } else {
    status = 'healthy'
    message = `Rotator cuff ratio healthy — good shoulder balance.`
  }
  return { ratio: +ratio.toFixed(2), status, message, pressSets, rearSets, required }
}

// ─── Proportional Imbalance Flags ──────────────────────────────────────────
// Known dangerous muscle combinations
const IMBALANCE_RULES = [
  {
    id: 'chest_rear',
    label: 'Chest » Rear Delts',
    check: (v) => (v.chest || 0) > 8 && (v.rear_delts || 0) < 6,
    problem: 'Rounded shoulders, internal rotation, impingement risk',
    fix: 'Add 4+ sets of face pulls / band pull-aparts every session',
    risk: 'high',
  },
  {
    id: 'quad_ham',
    label: 'Quads » Hamstrings',
    check: (v) => (v.quads || 0) > 8 && (v.hamstrings || 0) < 5,
    problem: 'Anterior pelvic tilt, ACL stress, lower back pain',
    fix: 'Add RDLs or leg curls — aim for at least 6 hamstring sets/week',
    risk: 'high',
  },
  {
    id: 'traps_lower_traps',
    label: 'Upper Traps » Rear Delts',
    check: (v) => (v.traps || 0) > 8 && (v.rear_delts || 0) < 4,
    problem: 'Neck pain, shoulder elevation, poor posture',
    fix: 'Add Y/T raises and face pulls to build lower trap strength',
    risk: 'medium',
  },
  {
    id: 'lat_lower_back',
    label: 'Lats » Lower Back',
    check: (v) => (v.lats || 0) > 10 && (v.lower_back || 0) < 4,
    problem: 'Lower back instability, SI joint stress',
    fix: 'Add back extensions and good mornings',
    risk: 'medium',
  },
  {
    id: 'bicep_forearm',
    label: 'Biceps » Forearms',
    check: (v) => (v.biceps || 0) > 8 && (v.forearms || 0) < 4,
    problem: 'Elbow tendon stress (lateral epicondylitis risk)',
    fix: 'Add hammer curls and reverse curls',
    risk: 'medium',
  },
  {
    id: 'chest_abs',
    label: 'Pressing » Core',
    check: (v) => ((v.chest || 0) + (v.front_delts || 0)) > 10 && (v.abs || 0) < 4,
    problem: 'Core instability under heavy press — increased injury risk',
    fix: 'Add 2-3 core exercises per week (planks, cable crunches)',
    risk: 'medium',
  },
]

export function detectImbalances(weeklyVolume) {
  return IMBALANCE_RULES.filter(rule => rule.check(weeklyVolume))
}

// ─── Overall Structural Risk Score ─────────────────────────────────────────
// Returns 0-30+ score; lower is better
export function structuralRiskScore(weeklyVolume, liftMaxes) {
  const pp   = pushPullRatio(weeklyVolume)
  const qh   = quadHamRatio(liftMaxes, weeklyVolume)
  const rc   = rotatorCuffRatio(weeklyVolume)
  const imb  = detectImbalances(weeklyVolume)

  let score = 0

  // Push:Pull deviation
  if (pp.status === 'push_heavy') score += Math.min(10, (pp.ratio - 1.0) * 10)
  if (pp.status === 'pull_heavy') score += Math.min(6, (1.0 - pp.ratio) * 8)

  // Quad:Ham deviation
  if (qh.status === 'quad_dominant' && qh.ratio !== null) score += Math.min(10, (0.6 - qh.ratio) * 20)

  // Rotator cuff
  if (rc.status === 'at_risk')  score += 8
  if (rc.status === 'warning')  score += 4

  // Imbalances
  imb.forEach(i => { score += i.risk === 'high' ? 4 : 2 })

  const level = score <= 5 ? 'Low' : score <= 12 ? 'Moderate' : score <= 20 ? 'High' : 'Critical'
  const color = score <= 5 ? '#22c55e' : score <= 12 ? '#eab308' : '#ef4444'

  return { score: +score.toFixed(1), level, color, pp, qh, rc, imbalances: imb }
}
