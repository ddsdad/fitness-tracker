// ════════════════════════════════════════════════════════════════════════════
//  Coach Brain — post-session feedback + weekly check-in report.
//  Turns logged data into a real coach's voice.
// ════════════════════════════════════════════════════════════════════════════
import { getMuscleVolume } from './heatmap.js'
import { MUSCLE_GROUPS, RP_VOLUME } from '../data/muscles.js'
import { epley1RM } from './calculations.js'

const MS_DAY = 86_400_000

function bestE1RM(sets = []) {
  let best = 0
  for (const s of sets) if (s.weight > 0 && s.reps > 0 && !s.warmup) best = Math.max(best, epley1RM(s.weight, s.reps))
  return best
}

// ── Post-session feedback ─────────────────────────────────────────────────────
// `session` = the just-saved session; `priorSessions` = everything before it.
export function postSessionFeedback(session, priorSessions, profile) {
  const lines = []
  const workingSets = (session.exercises || []).reduce((t, ex) => t + (ex.sets || []).filter(s => !s.warmup && s.weight > 0 && s.reps > 0).length, 0)
  const volume = (session.exercises || []).reduce((t, ex) => t + (ex.sets || []).reduce((st, s) => st + (s.warmup ? 0 : (s.weight || 0) * (s.reps || 0)), 0), 0)

  // PR detection vs prior sessions
  const prs = []
  for (const ex of session.exercises || []) {
    const cur = bestE1RM(ex.sets)
    if (cur <= 0) continue
    let priorBest = 0
    for (const ps of priorSessions) {
      const pex = ps.exercises?.find(e => e.exerciseId === ex.exerciseId)
      if (pex) priorBest = Math.max(priorBest, bestE1RM(pex.sets))
    }
    if (priorBest > 0 && cur > priorBest + 0.5) prs.push({ name: ex.name, gain: +(cur - priorBest).toFixed(1) })
  }

  // Headline
  let headline, tone = 'good'
  if (prs.length >= 2)      headline = `🔥 ${prs.length} PRs this session — you're on fire.`
  else if (prs.length === 1) headline = `🏆 New PR on ${prs[0].name} (+${prs[0].gain}${profile.unit})!`
  else if (workingSets >= 18) headline = `💪 Big session — ${workingSets} working sets logged.`
  else if (workingSets >= 10) headline = `✅ Solid work — ${workingSets} sets in the bank.`
  else if (workingSets > 0)  headline = `Logged ${workingSets} sets. Every session counts.`
  else { headline = 'Session saved.'; tone = 'neutral' }

  // Detail lines
  if (prs.length > 1) lines.push(`PRs: ${prs.map(p => `${p.name} +${p.gain}${profile.unit}`).join(', ')}.`)
  if (volume > 0) lines.push(`Total volume: ${volume >= 1000 ? (volume/1000).toFixed(1) + 'k' : Math.round(volume)} ${profile.unit}.`)

  // Weekly muscle-balance nudge (look at last 7 days incl. this session)
  const vol7 = getMuscleVolume([session, ...priorSessions], 7)
  const lagging = Object.entries(vol7)
    .map(([m, v]) => ({ m, v, mev: RP_VOLUME[m]?.MEV ?? 0 }))
    .filter(x => x.mev > 0 && x.v < x.mev)
    .sort((a, b) => (a.v / a.mev) - (b.v / b.mev))
  if (lagging.length) {
    const top = lagging[0]
    lines.push(`Heads up: ${MUSCLE_GROUPS[top.m]?.label} is under its weekly minimum (${top.v.toFixed(0)}/${top.mev} sets) — prioritize it next session.`)
  }

  const coins = 10 + Math.min(40, workingSets * 2) + prs.length * 25
  return { headline, tone, lines, prs, coins }
}

// (weeklyReport removed — superseded by utils/weekly.js buildWeekSummary)
