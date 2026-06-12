import { MUSCLE_GROUPS, RP_VOLUME, GOAL_MUSCLE_WEIGHTS } from '../data/muscles.js'
import { effectiveMuscleSets } from './involvement.js'

// Backwards compat
export { RP_VOLUME as OPTIMAL_SETS }

// Effective sets per muscle over sessions in the given time window.
// Uses EMG-informed fractional involvement (see utils/involvement.js) instead
// of the old binary primary=1 / secondary=0.5 rule.
export function getMuscleVolume(sessions, daysBack = 7) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)
  return effectiveMuscleSets(
    sessions.filter(s => new Date(s.date) >= cutoff),
    Object.keys(MUSCLE_GROUPS)
  )
}

// Compute adjusted MEV/MAV/MRV for a muscle based on goal weight multiplier
function getThresholds(muscle, weights) {
  const rp = RP_VOLUME[muscle] || { MEV: 8, MAV: 14, MRV: 20 }
  const w  = (weights?.[muscle] ?? 1)
  return {
    MEV: Math.max(0, rp.MEV * w),
    MAV: rp.MAV * w,
    MRV: rp.MRV * w,
  }
}

// Heat map color using RP MEV/MAV/MRV thresholds
// Below MEV = red | MEV→MAV = yellow | MAV→MRV = green | >MRV = orange-red
export function getHeatColor(muscle, volume, goalId = 'overall_size', customWeights = null) {
  const weights = customWeights ?? GOAL_MUSCLE_WEIGHTS[goalId] ?? GOAL_MUSCLE_WEIGHTS.overall_size
  const { MEV, MAV, MRV } = getThresholds(muscle, weights)

  if (volume === 0)         return 'rgba(70,70,70,0.55)'          // untrained
  if (volume < MEV * 0.5)   return 'rgba(239,68,68,0.90)'         // neglected
  if (volume < MEV)         return 'rgba(239,120,68,0.85)'         // below MEV
  if (volume < MAV)         return 'rgba(234,179,8,0.85)'          // MEV→MAV working
  if (volume <= MRV)        return 'rgba(34,197,94,0.90)'          // MAV→MRV optimal
  return 'rgba(239,68,68,0.80)'                                    // above MRV overtrained
}

// Status label using RP thresholds
export function getMuscleStatus(muscle, volume, goalId = 'overall_size', customWeights = null) {
  const weights = customWeights ?? GOAL_MUSCLE_WEIGHTS[goalId] ?? GOAL_MUSCLE_WEIGHTS.overall_size
  const { MEV, MAV, MRV } = getThresholds(muscle, weights)

  if (volume === 0)        return { label: 'Untrained',  cls: 'badge-red',    pct: 0,   zone: 'none' }
  if (volume < MEV * 0.5)  return { label: 'Neglected',  cls: 'badge-red',    pct: Math.round(volume / Math.max(1,MEV) * 100), zone: 'below_mev' }
  if (volume < MEV)        return { label: 'Below MEV',  cls: 'badge-red',    pct: Math.round(volume / Math.max(1,MEV) * 100), zone: 'below_mev' }
  if (volume < MAV)        return { label: 'Working',    cls: 'badge-yellow', pct: Math.round((volume - MEV) / Math.max(1, MAV - MEV) * 100), zone: 'mev_mav' }
  if (volume <= MRV)       return { label: 'Optimal',    cls: 'badge-green',  pct: 100, zone: 'mav_mrv' }
  return                          { label: 'Overtrained',cls: 'badge-red',    pct: 100, zone: 'above_mrv' }
}

// Full zone detail for tooltip/popover
export function getMuscleDetail(muscle, volume, goalId = 'overall_size', customWeights = null) {
  const weights = customWeights ?? GOAL_MUSCLE_WEIGHTS[goalId] ?? GOAL_MUSCLE_WEIGHTS.overall_size
  const { MEV, MAV, MRV } = getThresholds(muscle, weights)
  const status = getMuscleStatus(muscle, volume, goalId, customWeights)
  return { ...status, volume: +volume.toFixed(1), MEV: +MEV.toFixed(1), MAV: +MAV.toFixed(1), MRV: +MRV.toFixed(1) }
}

export function normalizeVolume(volume, maxExpected = 25) {
  return Math.min(1, volume / maxExpected)
}
