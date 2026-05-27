// ════════════════════════════════════════════════════════════════════════════
//  Strength & load science — DOTS score, strength standards, and ACWR injury risk.
// ════════════════════════════════════════════════════════════════════════════

// ── DOTS (modern bodyweight-adjusted strength coefficient) ────────────────────
// Lets a 60kg and a 100kg lifter compare fairly. Input total in kg.
export function dotsCoeff(bwKg, sex = 'male') {
  const c = sex === 'female'
    ? [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706]
    : [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093]
  const bw = Math.min(Math.max(bwKg, 40), 200)
  const denom = c[0] + c[1]*bw + c[2]*bw**2 + c[3]*bw**3 + c[4]*bw**4
  return denom === 0 ? 0 : 500 / denom
}
export function dotsScore(totalKg, bwKg, sex = 'male') {
  if (!totalKg || !bwKg) return 0
  return +(totalKg * dotsCoeff(bwKg, sex)).toFixed(1)
}
export function dotsTier(dots) {
  if (dots <= 0)   return { label: '—',            color: 'var(--text3)' }
  if (dots < 200)  return { label: 'Beginner',     color: 'var(--text2)' }
  if (dots < 300)  return { label: 'Novice',       color: 'var(--yellow)' }
  if (dots < 400)  return { label: 'Intermediate', color: 'var(--green)' }
  if (dots < 500)  return { label: 'Advanced',     color: 'var(--blue)' }
  return             { label: 'Elite',           color: '#a78bfa' }
}

// Total from the big-3 in the user's unit → kg
export function bigThreeTotalKg(profile) {
  const lm = profile?.liftMaxes || {}
  const total = (lm.bench || 0) + (lm.squat || 0) + (lm.deadlift || 0)
  return profile?.unit === 'lbs' ? total / 2.2046 : total
}

// ── ACWR — acute:chronic workload ratio (injury-risk proxy) ───────────────────
// acute = this week's load; chronic = trailing 4-week average weekly load.
function weekVolume(sessions, startDaysAgo, endDaysAgo) {
  const now = Date.now()
  const from = now - startDaysAgo * 86_400_000
  const to   = now - endDaysAgo * 86_400_000
  return sessions
    .filter(s => { const t = new Date(s.date).getTime(); return t >= from && t < to })
    .reduce((tot, s) => tot + (s.exercises || []).reduce((a, ex) =>
      a + (ex.sets || []).reduce((b, st) => b + (st.warmup ? 0 : (st.weight || 0) * (st.reps || 0)), 0), 0), 0)
}
export function acwr(sessions) {
  const acute = weekVolume(sessions, 7, 0)
  const chronic28 = weekVolume(sessions, 28, 0) / 4   // avg weekly over 4 weeks
  if (chronic28 <= 0) return null
  const ratio = +(acute / chronic28).toFixed(2)
  let zone, color, message
  if (ratio < 0.8)       { zone = 'Detraining'; color = 'var(--yellow)'; message = 'Load dropped below your recent average — you may be detraining.' }
  else if (ratio <= 1.3) { zone = 'Optimal';    color = 'var(--green)';  message = 'Workload is in the sweet spot — progressing safely.' }
  else if (ratio <= 1.5) { zone = 'Caution';    color = '#f59e0b';       message = 'Ramping up fast — watch recovery and form.' }
  else                   { zone = 'High Risk';  color = 'var(--red)';    message = 'Big spike vs your baseline — elevated injury risk. Consider easing off.' }
  return { ratio, acute: Math.round(acute), chronic: Math.round(chronic28), zone, color, message }
}
