// Single source of truth for the day-streak. Shield-aware: days covered by a
// Streak Shield count as trained. Today not yet trained does NOT break the run.
export function currentStreak(sessions = [], shieldDates = [], maxDays = 365) {
  const trained = new Set(sessions.map(s => { const d = new Date(s.date); d.setHours(0, 0, 0, 0); return d.getTime() }))
  const shielded = new Set(shieldDates.map(ds => { const d = new Date(ds + 'T00:00:00'); d.setHours(0, 0, 0, 0); return d.getTime() }))
  const covered = (t) => trained.has(t) || shielded.has(t)

  let streak = 0
  const check = new Date(); check.setHours(0, 0, 0, 0)
  for (let i = 0; i < maxDays; i++) {
    if (covered(check.getTime())) streak++
    else if (i !== 0) break          // a past gap ends the streak; today pending is fine
    check.setDate(check.getDate() - 1)
  }
  return streak
}
