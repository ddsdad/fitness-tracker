import { useState, useEffect, useRef } from 'react'
import { IconTimer } from '../shared/Icons.jsx'

// Audible + haptic "rest over" cue — phone can be face-down between sets.
function notifyRestOver() {
  try { navigator.vibrate?.([200, 100, 200]) } catch {}
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const play = (freq, at, dur = 0.18) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = 'sine'; o.frequency.value = freq
      g.gain.setValueAtTime(0.25, ctx.currentTime + at)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + dur)
      o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + dur)
    }
    play(880, 0); play(1175, 0.22)            // two rising chimes
    setTimeout(() => ctx.close().catch(() => {}), 800)
  } catch {}
}

export default function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(true)
  const ref = useRef()

  useEffect(() => {
    if (!running) return
    ref.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(ref.current); notifyRestOver(); onDone?.(); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(ref.current)
  }, [running])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const low  = remaining <= 10

  return (
    <div style={{ background: low ? 'rgba(34,197,94,0.12)' : 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, transition: 'background 0.2s' }}>
      <IconTimer />
      <span style={{ fontWeight: 700, fontSize: '1.25rem', fontVariantNumeric: 'tabular-nums', color: low ? 'var(--green)' : 'var(--text)' }}>
        {mins}:{String(secs).padStart(2, '0')}
      </span>
      <button onClick={() => setRemaining(r => Math.max(0, r - 15))} style={{ background: 'var(--bg4)', border: 'none', borderRadius: 6, padding: '4px 8px', color: 'var(--text2)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>−15</button>
      <button onClick={() => setRemaining(r => r + 15)} style={{ background: 'var(--bg4)', border: 'none', borderRadius: 6, padding: '4px 8px', color: 'var(--text2)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>+15</button>
      <span style={{ flex: 1 }} />
      <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8125rem' }} onClick={() => setRunning(r => !r)}>
        {running ? 'Pause' : 'Resume'}
      </button>
      <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8125rem', color: 'var(--red)' }} onClick={onDone}>Skip</button>
    </div>
  )
}
