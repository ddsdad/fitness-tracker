// ════════════════════════════════════════════════════════════════════════════
//  Local notifications — the pull-back-in layer. PWA-friendly: uses the
//  Notification API with a setTimeout scheduler (fires while the tab/PWA is
//  alive or backgrounded). No server, no push subscription needed.
// ════════════════════════════════════════════════════════════════════════════

export function notifyState() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission   // 'default' | 'granted' | 'denied'
}

export async function requestNotify() {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try { return await Notification.requestPermission() } catch { return 'denied' }
}

function fire(title, body) {
  try {
    if (Notification.permission !== 'granted') return
    new Notification(title, { body, icon: '/favicon.svg', badge: '/favicon.svg', tag: 'arise' })
  } catch {}
}

// Schedule the day's nudges. Clears any prior schedule first (idempotent).
let timers = []
export function scheduleDailyNudges({ hour = 18, trainedToday = false, aura = null, split = null } = {}) {
  timers.forEach(clearTimeout); timers = []
  if (notifyState() !== 'granted') return

  const now = new Date()
  const at = (h, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime() - now.getTime() }

  // Session reminder at the user's usual training hour
  if (!trainedToday) {
    const delay = at(hour)
    if (delay > 0 && delay < 16 * 3600_000) {
      timers.push(setTimeout(() => fire(
        split && split !== 'rest' ? `⚔ ${split[0].toUpperCase() + split.slice(1)} Day awaits` : '⚔ Your mission awaits',
        'Your shadow is ready. Begin today’s session.'
      ), delay))
    }
  }

  // Streak/aura danger nudge in the evening if still untrained + aura decaying
  if (!trainedToday && aura?.decaying) {
    const delay = at(20, 30)
    if (delay > 0) {
      timers.push(setTimeout(() => fire(
        '🔥 Your aura is fading',
        `Skip today and you lose ${aura.willLoseTomorrow} aura. One session keeps it burning.`
      ), delay))
    }
  }
}

export function clearNudges() { timers.forEach(clearTimeout); timers = [] }
