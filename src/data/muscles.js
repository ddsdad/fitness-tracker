export const MUSCLE_GROUPS = {
  chest:      { label: 'Chest',      side: 'front', color: '#ef4444' },
  front_delts:{ label: 'Front Delts',side: 'front', color: '#f97316' },
  side_delts: { label: 'Side Delts', side: 'front', color: '#f97316' },
  biceps:     { label: 'Biceps',     side: 'front', color: '#eab308' },
  forearms:   { label: 'Forearms',   side: 'front', color: '#84cc16' },
  abs:        { label: 'Abs',        side: 'front', color: '#22c55e' },
  quads:      { label: 'Quads',      side: 'front', color: '#06b6d4' },
  rear_delts: { label: 'Rear Delts', side: 'back',  color: '#f97316' },
  traps:      { label: 'Traps',      side: 'back',  color: '#a78bfa' },
  lats:       { label: 'Lats',       side: 'back',  color: '#3b82f6' },
  rhomboids:  { label: 'Rhomboids',  side: 'back',  color: '#60a5fa' },
  triceps:    { label: 'Triceps',    side: 'back',  color: '#eab308' },
  lower_back: { label: 'Lower Back', side: 'back',  color: '#fb923c' },
  glutes:     { label: 'Glutes',     side: 'back',  color: '#e879f9' },
  hamstrings: { label: 'Hamstrings', side: 'back',  color: '#34d399' },
  calves:     { label: 'Calves',     side: 'back',  color: '#67e8f9' },
}

// RP (Renaissance Periodization) Volume Landmarks — sets/week
// MEV = Minimum Effective Volume (below = red/neglected)
// MAV = Maximum Adaptive Volume start (MEV→MAV = yellow/working)
// MRV = Maximum Recoverable Volume (MAV→MRV = green/optimal, above = overtrained)
export const RP_VOLUME = {
  chest:      { MEV: 8,  MAV: 12, MRV: 22 },
  front_delts:{ MEV: 0,  MAV: 6,  MRV: 16 }, // gets lots of indirect work from pressing
  side_delts: { MEV: 8,  MAV: 16, MRV: 26 },
  biceps:     { MEV: 6,  MAV: 14, MRV: 20 },
  forearms:   { MEV: 4,  MAV: 8,  MRV: 16 },
  abs:        { MEV: 0,  MAV: 10, MRV: 25 },
  quads:      { MEV: 8,  MAV: 12, MRV: 20 },
  rear_delts: { MEV: 6,  MAV: 16, MRV: 26 },
  traps:      { MEV: 0,  MAV: 12, MRV: 26 },
  lats:       { MEV: 10, MAV: 14, MRV: 25 },
  rhomboids:  { MEV: 6,  MAV: 12, MRV: 20 },
  triceps:    { MEV: 6,  MAV: 10, MRV: 18 },
  lower_back: { MEV: 4,  MAV: 8,  MRV: 16 },
  glutes:     { MEV: 0,  MAV: 4,  MRV: 16 },
  hamstrings: { MEV: 6,  MAV: 10, MRV: 20 },
  calves:     { MEV: 8,  MAV: 12, MRV: 20 },
}

// Backwards-compat alias
export const OPTIMAL_SETS = Object.fromEntries(
  Object.entries(RP_VOLUME).map(([k, v]) => [k, { min: v.MEV, max: v.MRV }])
)

export const PHYSIQUE_GOALS = [
  { id: 'overall_size',    label: 'Overall Size',    description: 'Balanced mass everywhere',   icon: '💪' },
  { id: 'wider_shoulders', label: 'Wider Shoulders', description: 'V-taper & broad look',       icon: '🔱' },
  { id: 'bigger_arms',     label: 'Bigger Arms',     description: 'Thick biceps & triceps',     icon: '💥' },
  { id: 'bigger_chest',    label: 'Bigger Chest',    description: 'Full, defined pecs',         icon: '🏆' },
  { id: 'thicker_back',    label: 'Thicker Back',    description: 'Wide lats & dense back',     icon: '🦅' },
  { id: 'stronger_legs',   label: 'Stronger Legs',   description: 'Power & quad sweep',         icon: '⚡' },
  { id: 'lean_athletic',   label: 'Lean & Athletic', description: 'Shredded & functional',      icon: '🎯' },
]

// Goal-specific multipliers on MAV targets
export const GOAL_MUSCLE_WEIGHTS = {
  overall_size:    { chest:1,   front_delts:1,   side_delts:1,   biceps:1,   forearms:0.7, abs:0.8, quads:1,   rear_delts:1,   traps:0.9, lats:1,   rhomboids:0.9, triceps:1,   lower_back:0.7, glutes:0.8, hamstrings:1,   calves:0.8 },
  wider_shoulders: { chest:0.8, front_delts:1.3, side_delts:1.8, biceps:0.8, forearms:0.5, abs:0.7, quads:0.7, rear_delts:1.5, traps:1.2, lats:1.3, rhomboids:1.1, triceps:0.9, lower_back:0.6, glutes:0.6, hamstrings:0.7, calves:0.6 },
  bigger_arms:     { chest:0.8, front_delts:0.9, side_delts:0.9, biceps:1.8, forearms:1.3, abs:0.5, quads:0.6, rear_delts:0.8, traps:0.7, lats:1.0, rhomboids:0.8, triceps:1.8, lower_back:0.5, glutes:0.5, hamstrings:0.6, calves:0.6 },
  bigger_chest:    { chest:1.8, front_delts:1.4, side_delts:0.9, biceps:0.8, forearms:0.5, abs:0.7, quads:0.6, rear_delts:0.9, traps:0.8, lats:0.9, rhomboids:0.9, triceps:1.4, lower_back:0.5, glutes:0.5, hamstrings:0.6, calves:0.5 },
  thicker_back:    { chest:0.7, front_delts:0.8, side_delts:0.9, biceps:1.1, forearms:0.9, abs:0.6, quads:0.7, rear_delts:1.5, traps:1.5, lats:1.8, rhomboids:1.5, triceps:0.7, lower_back:1.2, glutes:0.7, hamstrings:0.8, calves:0.5 },
  stronger_legs:   { chest:0.6, front_delts:0.6, side_delts:0.7, biceps:0.6, forearms:0.6, abs:0.9, quads:1.8, rear_delts:0.6, traps:0.7, lats:0.7, rhomboids:0.6, triceps:0.6, lower_back:1.2, glutes:1.5, hamstrings:1.8, calves:1.4 },
  lean_athletic:   { chest:0.9, front_delts:0.9, side_delts:1.1, biceps:0.9, forearms:0.8, abs:1.5, quads:1.2, rear_delts:1.1, traps:0.9, lats:1.1, rhomboids:1.0, triceps:0.9, lower_back:0.9, glutes:1.1, hamstrings:1.1, calves:1.0 },
}
