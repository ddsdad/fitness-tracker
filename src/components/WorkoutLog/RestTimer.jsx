import { useState, useEffect, useRef } from 'react'
import { IconTimer } from '../shared/Icons.jsx'

export default function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(true)
  const ref = useRef()

  useEffect(() => {
    if (!running) return
    ref.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(ref.current); onDone?.(); return 0 }
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
