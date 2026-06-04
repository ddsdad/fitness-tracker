// ════════════════════════════════════════════════════════════════════════════
//  THE SYSTEM — Solo-Leveling-style daily quests that LEARN from your history.
//
//  Unlike the old random daily quests, the System reads your actual logged data
//  and issues personalized, progressive challenges:
//    • Progressive overload — "Bench 62.5kg × 5 (last: 60×5)" from your real sets
//    • Volume / consistency — hit a set target, train a neglected muscle
//    • Boss fights — bodyweight-relative strength milestones (rarer, big reward)
//    • Conditioning finishers — AMRAP / rep-total challenges
//
//  Difficulty AUTO-ESCALATES: progressing → nudges harder; stalling / missed
//  days → backs off to rebuild momentum. Challenges auto-verify against logged
//  data where possible.
// ════════════════════════════════════════════════════════════════════════════
import { EXERCISES } from '../data/exercises.js'
import { MUSCLE_GROUPS, RP_VOLUME } from '../data/muscles.js'
import { epley1RM } from './calculations.js'
import { computePRs, detectPlateau, topTrackedExercises } from './analytics.js'
import { getCurrentWeek, sessionsInWeek, muscleVolumeForSessions } from './weekly.js'

const MS_DAY = 86_400_000
const round2 = (w) => Math.round(w / 2.5) * 2.5   // nearest 2.5 (plate-friendly)

function bestSetOf(ex) {
  let best = null
  for (const s of ex.sets || []) {
    if (s.warmup || !(s.weight > 0) || !(s.reps > 0)) continue
    const e = epley1RM(s.weight, s.reps)
    if (!best || e > best.e1rm) best = { weight: s.weight, reps: s.reps, e1rm: e }
  }
  return best
}

// Most-recent logged performance for an exercise (best working set).
function lastPerformance(exerciseId, sessions) {
  for (const s of [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date))) {
    const ex = s.exercises?.find(e => e.exerciseId === exerciseId)
    if (ex) { const b = bestSetOf(ex); if (b) return { ...b, date: s.date } }
  }
  return null
}

// Recent momentum: are we progressing, stalling, or returning from a layoff?
function momentum(sessions, profile) {
  const now = Date.now()
  const last14 = sessions.filter(s => now - new Date(s.date) <= 14 * MS_DAY)
  const last7  = sessions.filter(s => now - new Date(s.date) <= 7 * MS_DAY)
  const { feed } = computePRs(sessions)
  const recentPRs = feed.filter(f => now - new Date(f.date) <= 10 * MS_DAY).length
  const daysSinceLast = sessions.length
    ? Math.floor((now - Math.max(...sessions.map(s => new Date(s.date)))) / MS_DAY)
    : 99

  let mode = 'steady'
  if (daysSinceLast >= 5) mode = 'rebuild'              // came back from a break → ease in
  else if (recentPRs >= 2 || last7.length >= 4) mode = 'surging'  // crushing it → push
  else if (last14.length <= 1) mode = 'rebuild'
  // escalation factor applied to weight/rep targets
  const factor = mode === 'surging' ? 1.0 : mode === 'rebuild' ? 0.0 : 0.5
  return { mode, factor, recentPRs, daysSinceLast, sessions7: last7.length }
}

// Seeded RNG so a given day is deterministic (quests don't reshuffle on reload).
function seeded(dateStr, salt = 0) {
  let s = [...dateStr].reduce((h, c) => h + c.charCodeAt(0), 0) + salt * 131
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

// ── Challenge generators ──────────────────────────────────────────────────────

// Progressive overload — beat a real prior set on a frequently-trained lift.
function genOverload(sessions, profile, mom, rng) {
  const tracked = topTrackedExercises(sessions, 6)
  if (!tracked.length) return null
  const pick = tracked[Math.floor(rng() * Math.min(3, tracked.length))]
  const last = lastPerformance(pick.id, sessions)
  if (!last) return null

  const unit = profile?.unit || 'kg'
  const plateaued = !!detectPlateau(sessions, pick.id)

  // Surging → +weight; steady → +1 rep; rebuild/plateau → match & own it
  let target, verifyText
  if (mom.mode === 'surging' && !plateaued) {
    const w = round2(last.weight * 1.025) > last.weight ? round2(last.weight * 1.025) : last.weight + 2.5
    target = { type: 'overload', exerciseId: pick.id, weight: w, reps: last.reps }
    verifyText = `${pick.name}: ${w}${unit} × ${last.reps} (last ${last.weight}×${last.reps})`
  } else if (mom.mode === 'rebuild' || plateaued) {
    target = { type: 'overload', exerciseId: pick.id, weight: last.weight, reps: last.reps }
    verifyText = `${pick.name}: rebuild — match ${last.weight}${unit} × ${last.reps}`
  } else {
    target = { type: 'overload', exerciseId: pick.id, weight: last.weight, reps: last.reps + 1 }
    verifyText = `${pick.name}: ${last.weight}${unit} × ${last.reps + 1} (one more rep than last)`
  }
  return {
    id: `overload_${pick.id}`, kind: 'overload', icon: '📈', rank: plateaued ? 'B' : 'C',
    title: 'Progressive Overload', text: verifyText, reward: plateaued ? 45 : 35,
    target,
  }
}

// Volume — hit a neglected muscle this week, or a daily set target.
function genVolume(sessions, profile, mom, rng) {
  const week = profile?.startDate ? getCurrentWeek(profile.startDate) : null
  const weekSessions = week ? sessionsInWeek(sessions, profile.startDate, week) : sessions.slice(0, 8)
  const vol = muscleVolumeForSessions(weekSessions)
  // Find the most-neglected muscle vs its MEV
  const neglected = Object.keys(MUSCLE_GROUPS)
    .map(m => ({ m, v: vol[m] || 0, mev: RP_VOLUME[m]?.MEV ?? 0 }))
    .filter(x => x.mev > 0)
    .sort((a, b) => (a.v / a.mev) - (b.v / b.mev))[0]

  if (neglected && neglected.v < neglected.mev) {
    const need = Math.max(3, Math.ceil(neglected.mev - neglected.v))
    return {
      id: `vol_${neglected.m}`, kind: 'volume', icon: '🎯', rank: 'C',
      title: 'Cover Your Weakness', reward: 30,
      text: `${MUSCLE_GROUPS[neglected.m].label}: log ${need}+ sets this week (only ${Math.round(neglected.v)} so far)`,
      target: { type: 'muscle_sets_week', muscle: neglected.m, sets: need },
    }
  }
  // Otherwise a daily total-sets challenge scaled to recent capacity
  const base = mom.mode === 'surging' ? 20 : mom.mode === 'rebuild' ? 10 : 16
  return {
    id: 'vol_total', kind: 'volume', icon: '🔢', rank: 'C',
    title: 'Volume Quota', reward: 25,
    text: `Log ${base}+ working sets today`,
    target: { type: 'sets_today', sets: base },
  }
}

// Boss fight — a bodyweight-relative strength milestone not yet achieved.
function genBoss(sessions, profile, mom, rng) {
  const bw = profile?.bodyweight || 0
  if (bw <= 0) return null
  const unit = profile?.unit || 'kg'
  const lm = profile?.liftMaxes || {}
  const BOSSES = [
    { lift: 'bench',    ratio: 1.0, name: 'Bodyweight Bench',  emoji: '🐉' },
    { lift: 'bench',    ratio: 1.5, name: '1.5× Bench',        emoji: '🐲' },
    { lift: 'squat',    ratio: 1.5, name: '1.5× Squat',        emoji: '👹' },
    { lift: 'squat',    ratio: 2.0, name: 'Double-BW Squat',   emoji: '🔱' },
    { lift: 'deadlift', ratio: 2.0, name: 'Double-BW Deadlift',emoji: '💀' },
    { lift: 'deadlift', ratio: 2.5, name: '2.5× Deadlift',     emoji: '☠️' },
    { lift: 'ohp',      ratio: 0.66, name: '2/3-BW Press',     emoji: '🗡️' },
  ]
  // Closest unachieved boss (within reach: current >= 80% of target)
  const candidates = BOSSES
    .map(b => ({ ...b, target: round2(bw * b.ratio), current: lm[b.lift] || 0 }))
    .filter(b => b.current < b.target && b.current >= b.target * 0.8)
    .sort((a, b) => (b.current / b.target) - (a.current / a.target))
  const boss = candidates[0]
  if (!boss) return null
  return {
    id: `boss_${boss.lift}_${boss.ratio}`, kind: 'boss', icon: boss.emoji, rank: 'A',
    title: `Boss Fight: ${boss.name}`, reward: 120,
    text: `Hit ${boss.target}${unit} on ${boss.lift} (you're at ${boss.current}${unit})`,
    target: { type: 'boss_lift', lift: boss.lift, weight: boss.target },
    boss: true,
  }
}

// Conditioning finisher.
function genFinisher(sessions, profile, mom, rng) {
  const POOL = [
    { id: 'fin_pushups', icon: '🔥', text: 'AMRAP push-ups in 5 minutes', reward: 30, target: { type: 'manual' } },
    { id: 'fin_plank',   icon: '🧱', text: 'Accumulate 3 minutes of plank', reward: 25, target: { type: 'manual' } },
    { id: 'fin_cardio',  icon: '🏃', text: '20-minute zone-2 cardio', reward: 30, target: { type: 'manual' } },
    { id: 'fin_100',     icon: '💯', text: '100 total reps of any accessory', reward: 30, target: { type: 'manual' } },
    { id: 'fin_carry',   icon: '🧳', text: '4 sets of loaded carries (40m)', reward: 25, target: { type: 'manual' } },
  ]
  const p = POOL[Math.floor(rng() * POOL.length)]
  return { ...p, kind: 'finisher', rank: 'D', title: 'Conditioning' }
}

// ── Auto-verification against logged data ─────────────────────────────────────
// Returns true if the day's logged sessions satisfy the challenge target.
export function verifyChallenge(ch, sessions, profile, dateStr) {
  const t = ch.target
  if (!t || t.type === 'manual') return null   // can't auto-verify — user self-marks
  const day = sessions.filter(s => (s.date || '').slice(0, 10) === dateStr)

  if (t.type === 'overload') {
    for (const s of day) {
      const ex = s.exercises?.find(e => e.exerciseId === t.exerciseId)
      if (ex?.sets?.some(st => !st.warmup && st.weight >= t.weight && st.reps >= t.reps)) return true
    }
    return false
  }
  if (t.type === 'sets_today') {
    const sets = day.reduce((n, s) => n + (s.exercises || []).reduce((m, e) => m + (e.sets || []).filter(x => !x.warmup && x.weight > 0 && x.reps > 0).length, 0), 0)
    return sets >= t.sets
  }
  if (t.type === 'muscle_sets_week') {
    if (!profile?.startDate) return false
    const week = getCurrentWeek(profile.startDate)
    const vol = muscleVolumeForSessions(sessionsInWeek(sessions, profile.startDate, week))
    return (vol[t.muscle] || 0) >= t.sets
  }
  if (t.type === 'boss_lift') {
    return (profile?.liftMaxes?.[t.lift] || 0) >= t.weight
  }
  return null
}

// ── Daily quest board ─────────────────────────────────────────────────────────
// Returns 3-4 personalized challenges for the date. Deterministic per day.
export function generateSystemQuests(dateStr, sessions, profile, readinessScore = null) {
  const mom = momentum(sessions, profile)
  const rng = seeded(dateStr)

  // Low readiness → swap the hard overload for recovery-friendly volume.
  const lowReadiness = readinessScore != null && readinessScore < 45

  const quests = []
  // 1) Always try a progressive-overload (the heart of the System)
  if (!lowReadiness) { const o = genOverload(sessions, profile, mom, rng); if (o) quests.push(o) }
  // 2) Volume / weakness coverage
  const v = genVolume(sessions, profile, mom, rng); if (v) quests.push(v)
  // 3) Boss fight if one is in reach (rarer)
  const b = genBoss(sessions, profile, mom, rng); if (b && rng() < 0.6) quests.push(b)
  // 4) Finisher to round out
  if (quests.length < 3) quests.push(genFinisher(sessions, profile, mom, rng))
  // Fill to 3 if early-stage user (no history yet)
  if (quests.length < 3) quests.push(genFinisher(sessions, profile, mom, seeded(dateStr, 7)))

  return {
    mode: mom.mode,
    modeLabel: mom.mode === 'surging' ? 'Surging — System raised the difficulty'
      : mom.mode === 'rebuild' ? 'Rebuilding — System eased the targets'
      : 'Steady — hold the line',
    quests: quests.slice(0, 4),
  }
}

// Rank → color/emoji for the System UI
export const RANK_META = {
  S: { color: '#fb923c', label: 'S' },
  A: { color: '#ef4444', label: 'A' },
  B: { color: '#a78bfa', label: 'B' },
  C: { color: '#3b82f6', label: 'C' },
  D: { color: '#9ca3af', label: 'D' },
}
