import { useEffect, useState, useRef } from 'react'

// ── Cinematic session-end celebration ─────────────────────────────────────────
// Replaces the flat "feedback" text screen. Sequenced: clear → headline rises →
// XP bar fills with a count-up → coins burst → PR banners cascade → CTA.
export default function VictoryScreen({ feedback, onDone }) {
  const [phase, setPhase] = useState(0)      // staged reveal
  const [coinCount, setCoinCount] = useState(0)
  const prs = feedback.prs || []

  // haptic punch on mount
  useEffect(() => { try { navigator.vibrate?.([40, 60, 120]) } catch {} }, [])

  // staged timeline
  useEffect(() => {
    const t = []
    t.push(setTimeout(() => setPhase(1), 200))   // headline
    t.push(setTimeout(() => setPhase(2), 750))   // coins
    t.push(setTimeout(() => setPhase(3), 1500))  // PRs
    t.push(setTimeout(() => setPhase(4), 1500 + prs.length * 250 + 400)) // CTA
    return () => t.forEach(clearTimeout)
  }, [prs.length])

  // coin count-up when coins phase hits
  useEffect(() => {
    if (phase < 2 || !feedback.coins) return
    let raf, start
    const dur = 700, target = feedback.coins
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / dur)
      setCoinCount(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase, feedback.coins])

  const hasPR = prs.length > 0
  const accent = hasPR ? '#f59e0b' : 'var(--sys)'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 700, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center',
      background: `radial-gradient(circle at 50% 40%, ${hasPR ? 'rgba(245,158,11,0.22)' : 'rgba(56,189,248,0.18)'}, rgba(4,8,18,0.97) 72%)`,
      animation: 'fadeIn 0.4s ease',
    }}>
      {/* rays */}
      {phase >= 1 && Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute', top: '38%', left: '50%', width: 2, height: 220, transformOrigin: 'top center',
          background: `linear-gradient(${accent}, transparent)`, opacity: 0.18,
          transform: `rotate(${i * 36}deg)`, animation: 'pulse 2.5s ease-in-out infinite',
        }} />
      ))}
      {/* coin particles */}
      {phase >= 2 && feedback.coins > 0 && Array.from({ length: 14 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute', top: '46%', left: `${30 + i * 3}%`, fontSize: '1rem',
          animation: `floatUp ${1 + (i % 4) * 0.25}s ease-out ${(i % 5) * 0.08}s forwards`,
        }}>🪙</div>
      ))}

      {phase >= 1 && (
        <div className="juice-pop" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 64, filter: `drop-shadow(0 0 18px ${accent})` }}>{hasPR ? '🏆' : '⚔️'}</div>
        </div>
      )}

      {phase >= 1 && (
        <>
          <div className="hud-eyebrow" style={{ color: accent }}>{hasPR ? 'New Record' : 'Session Cleared'}</div>
          <h2 style={{ margin: '6px 0 4px', maxWidth: 360, textShadow: `0 0 18px ${hasPR ? 'rgba(245,158,11,0.5)' : 'rgba(56,189,248,0.4)'}` }}>{feedback.headline}</h2>
        </>
      )}

      {/* coins */}
      {phase >= 2 && feedback.coins > 0 && (
        <div className="juice-pop" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12,
          background: 'rgba(34,197,94,0.12)', border: '1px solid var(--accent)', borderRadius: 999,
          padding: '8px 20px', fontWeight: 900, fontSize: '1.3rem', color: 'var(--accent)',
          boxShadow: '0 0 22px -4px var(--accent)',
        }}>
          +{coinCount} 🪙
        </div>
      )}

      {/* PR banners cascade */}
      {phase >= 3 && prs.length > 0 && (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 340 }}>
          {prs.map((p, i) => (
            <div key={i} className="juice-pop" style={{
              animationDelay: `${i * 0.2}s`,
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
              boxShadow: '0 0 18px -8px #f59e0b',
            }}>
              <span style={{ fontSize: '1.2rem' }}>🗡️</span>
              <span style={{ flex: 1, textAlign: 'left', fontSize: '0.85rem', fontWeight: 700 }}>{p.name}</span>
              <span style={{ color: '#f59e0b', fontWeight: 900 }}>+{p.gain}</span>
            </div>
          ))}
        </div>
      )}

      {/* coach lines (condensed) */}
      {phase >= 3 && feedback.lines?.length > 0 && (
        <div style={{ maxWidth: 360, marginTop: 16 }}>
          {feedback.lines.slice(0, 2).map((l, i) => (
            <p key={i} style={{ color: 'var(--text2)', fontSize: '0.82rem', lineHeight: 1.55, marginTop: 4 }}>{l}</p>
          ))}
        </div>
      )}

      {phase >= 4 && (
        <button className="btn btn-primary btn-full" style={{ maxWidth: 320, marginTop: 26, animation: 'fadeIn 0.4s ease' }} onClick={onDone}>
          Claim Rewards
        </button>
      )}
    </div>
  )
}
