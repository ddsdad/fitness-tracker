// ════════════════════════════════════════════════════════════════════════════
//  AURA — the stakes layer. A living energy that RISES when you train and DECAYS
//  when you don't. Loss aversion is the strongest habit lever there is: seeing
//  your aura visibly drain after a skipped day pulls you back far harder than a
//  reward for showing up. 100 = radiant; near 0 = your shadow is fading.
//
//  Pure function of session history — recomputable, cheat-resistant, no writes.
// ════════════════════════════════════════════════════════════════════════════
const MS_DAY = 86_400_000
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

// Tunables
const GAIN_PER_SESSION = 26     // each training day adds aura
const DECAY_PER_REST   = 9      // each rest day past the first bleeds aura
const FREE_REST_DAYS   = 1      // one rest day a week doesn't hurt (recovery is good)

export function computeAura(sessions = [], shieldDates = [], today = new Date()) {
  const trained = new Set((sessions || []).map(s => startOfDay(s.date).getTime()))
  const shielded = new Set((shieldDates || []).map(ds => startOfDay(ds + 'T00:00:00').getTime()))
  const now = startOfDay(today)

  // Walk the last 21 days forward, simulating gain/decay.
  let aura = 50
  let restRun = 0
  for (let i = 20; i >= 0; i--) {
    const day = new Date(now.getTime() - i * MS_DAY).getTime()
    if (trained.has(day) || shielded.has(day)) {
      aura += GAIN_PER_SESSION
      restRun = 0
    } else {
      restRun++
      if (restRun > FREE_REST_DAYS) aura -= DECAY_PER_REST * (restRun - FREE_REST_DAYS)
    }
    aura = Math.max(0, Math.min(100, aura))
  }

  // Days since last training day (today not-yet-trained is fine)
  let daysIdle = 0
  for (let i = 0; i < 21; i++) {
    const day = new Date(now.getTime() - i * MS_DAY).getTime()
    if (trained.has(day) || shielded.has(day)) break
    if (i > 0) daysIdle++
  }

  const tier = aura >= 80 ? { label: 'RADIANT', color: '#38bdf8' }
    : aura >= 55 ? { label: 'CHARGED', color: '#22c55e' }
    : aura >= 30 ? { label: 'DIMMING', color: '#eab308' }
    : aura > 0   ? { label: 'FADING', color: '#f59e0b' }
    : { label: 'EXTINGUISHED', color: '#ef4444' }

  // Tomorrow's projected aura if no session today (the "loss" you're staring at)
  const willLose = daysIdle >= FREE_REST_DAYS ? DECAY_PER_REST * (daysIdle - FREE_REST_DAYS + 1) : 0

  return {
    value: Math.round(aura),
    tier,
    daysIdle,
    decaying: daysIdle >= FREE_REST_DAYS,
    willLoseTomorrow: Math.min(Math.round(aura), willLose),
  }
}
