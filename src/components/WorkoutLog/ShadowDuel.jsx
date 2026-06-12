import { epley1RM } from '../../utils/calculations.js'

// ── SHADOW DUEL ───────────────────────────────────────────────────────────────
// Live battle vs your "shadow" — your previous logged performance of this same
// exercise. Every completed set advances your side of the duel. Beat the
// shadow's total volume and it is DEFEATED. Solo-Leveling-themed, but the
// numbers are real progressive-overload tracking.
const PURPLE = '#a78bfa'
const working = (sets) => (sets || []).filter(s => !s.warmup && s.weight > 0 && s.reps > 0)

export default function ShadowDuel({ sets, ghostSets, unit = 'kg' }) {
  const ghost = working(ghostSets)
  if (!ghost.length) return null
  const mine = working(sets).filter(s => s.done)
  const ghostVol = Math.round(ghost.reduce((t, s) => t + s.weight * s.reps, 0))
  if (ghostVol <= 0) return null
  const myVol = Math.round(mine.reduce((t, s) => t + s.weight * s.reps, 0))

  const pct = Math.min(100, Math.round(myVol / ghostVol * 100))
  const defeated = myVol > ghostVol
  const ghostBest = Math.max(...ghost.map(s => epley1RM(s.weight, s.reps)))
  const myBest = mine.length ? Math.max(...mine.map(s => epley1RM(s.weight, s.reps))) : 0
  const beatBest = myBest > ghostBest + 0.5

  const color = defeated ? '#f59e0b' : PURPLE

  return (
    <div style={{
      marginBottom: 8, padding: '8px 10px', borderRadius: 8,
      background: defeated ? 'rgba(245,158,11,0.08)' : 'rgba(167,139,250,0.07)',
      border: `1px solid ${defeated ? 'rgba(245,158,11,0.45)' : 'rgba(167,139,250,0.3)'}`,
      boxShadow: defeated ? '0 0 12px rgba(245,158,11,0.15)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.08em', color, textTransform: 'uppercase' }}>
          👤 Shadow Duel
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 800, color }}>
          {defeated ? '⚔ SHADOW DEFEATED' : mine.length === 0 ? 'Awaiting first set…' : `${pct}%`}
        </span>
      </div>

      {/* duel bar — shadow owns the full track, you fill it */}
      <div style={{ position: 'relative', height: 8, borderRadius: 999, background: 'rgba(167,139,250,0.18)', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 999,
          background: defeated
            ? 'linear-gradient(90deg, #a78bfa, #f59e0b)'
            : `linear-gradient(90deg, rgba(167,139,250,0.5), ${PURPLE})`,
          boxShadow: `0 0 8px ${color}`, transition: 'width 0.5s cubic-bezier(0.2,0.8,0.2,1)',
        }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 5, fontSize: '0.66rem', color: 'var(--text3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>You <strong style={{ color: 'var(--text)' }}>{myVol.toLocaleString()}</strong>{unit}</span>
        <span>·</span>
        <span>Shadow <strong style={{ color: PURPLE }}>{ghostVol.toLocaleString()}</strong>{unit}</span>
        {defeated && <span style={{ color: '#f59e0b', fontWeight: 700 }}>+{(myVol - ghostVol).toLocaleString()}{unit} over your past self</span>}
        {beatBest && <span style={{ color: 'var(--green)', fontWeight: 700 }}>🗡 best set beaten</span>}
      </div>
    </div>
  )
}
