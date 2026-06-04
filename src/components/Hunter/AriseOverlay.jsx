import { useEffect, useState } from 'react'

// Full-screen "ARISE" rank-up cinematic, Solo Leveling style.
export default function AriseOverlay({ rank, onClose }) {
  const [phase, setPhase] = useState(0)  // 0 fade-in, 1 reveal, 2 hold
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 250)
    const t2 = setTimeout(() => setPhase(2), 1100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', cursor: 'pointer',
      background: `radial-gradient(circle at 50% 45%, ${rank.glow}, rgba(2,6,16,0.97) 70%)`,
      animation: 'ariseFade 0.4s ease',
    }}>
      <style>{`
        @keyframes ariseFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ariseRise { from { opacity: 0; transform: translateY(30px) scale(0.8) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes ariseGlow { 0%,100% { text-shadow: 0 0 18px ${rank.glow}, 0 0 40px ${rank.glow} } 50% { text-shadow: 0 0 28px ${rank.glow}, 0 0 70px ${rank.glow} } }
        @keyframes ringPulse { 0% { transform: scale(0.6); opacity: 0.9 } 100% { transform: scale(2.4); opacity: 0 } }
        @keyframes sparkUp { from { transform: translateY(0); opacity: 0.9 } to { transform: translateY(-180px); opacity: 0 } }
      `}</style>

      {/* expanding rings */}
      {[0, 0.4, 0.8].map((d, i) => (
        <div key={i} style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', border: `2px solid ${rank.color}`, animation: `ringPulse 1.8s ease-out ${d}s infinite` }} />
      ))}
      {/* rising sparks */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', bottom: '38%', left: `${15 + i * 6}%`, width: 3, height: 3, borderRadius: '50%', background: rank.color, boxShadow: `0 0 6px ${rank.color}`, animation: `sparkUp ${1.4 + (i % 4) * 0.3}s ease-out ${(i % 5) * 0.2}s infinite` }} />
      ))}

      <div style={{ fontSize: '0.7rem', letterSpacing: '0.45em', color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.5s' }}>
        The System
      </div>

      {/* ARISE */}
      <div style={{
        fontSize: '2.6rem', fontWeight: 900, letterSpacing: '0.12em', color: '#eaf6ff',
        animation: phase >= 1 ? 'ariseGlow 2s ease-in-out infinite' : 'none', marginBottom: 18,
        opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.6s',
      }}>
        ARISE
      </div>

      {/* rank badge */}
      {phase >= 1 && (
        <div style={{ animation: 'ariseRise 0.7s cubic-bezier(0.2,0.8,0.2,1)', marginBottom: 16 }}>
          <div style={{
            width: 140, height: 140, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(circle at 50% 35%, ${rank.color}44, rgba(8,16,32,0.9))`,
            border: `3px solid ${rank.color}`, boxShadow: `0 0 40px ${rank.glow}, inset 0 0 30px ${rank.color}33`,
          }}>
            <span style={{ fontSize: '4rem', fontWeight: 900, color: rank.color, textShadow: `0 0 24px ${rank.glow}` }}>{rank.tier}</span>
          </div>
        </div>
      )}

      {phase >= 1 && (
        <div style={{ animation: 'ariseRise 0.7s ease 0.15s both' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: rank.color, textShadow: `0 0 16px ${rank.glow}` }}>{rank.name}</div>
          <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: 4 }}>You have risen to <strong style={{ color: rank.color }}>{rank.title}</strong></div>
        </div>
      )}

      {phase >= 2 && (
        <button onClick={onClose} style={{
          marginTop: 28, padding: '11px 28px', borderRadius: 999, border: `1px solid ${rank.color}`,
          background: `${rank.color}1a`, color: rank.color, fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer',
          letterSpacing: '0.05em', animation: 'ariseFade 0.5s ease',
        }}>
          ACCEPT POWER
        </button>
      )}
    </div>
  )
}
