import { useMemo } from 'react'
import { useStore } from '../../store/useStore.js'
import { generateSystemQuests, verifyChallenge, RANK_META } from '../../utils/system.js'

const TODAY = new Date().toISOString().slice(0, 10)

// ── Solo-Leveling "System" daily quest window ─────────────────────────────────
export default function SystemPanel({ readinessScore = null }) {
  const { profile, sessions, completeQuest } = useStore()

  const { quests, modeLabel, mode } = useMemo(
    () => generateSystemQuests(TODAY, sessions, profile, readinessScore),
    [sessions, profile, readinessScore]
  )

  const claimed = profile?.game?.questLog?.[TODAY] || []

  // Auto-verification: a quest is "met" if logged data satisfies it (or already claimed).
  const status = quests.map(q => {
    const auto = verifyChallenge(q, sessions, profile, TODAY)
    const isClaimed = claimed.includes(q.id)
    return { q, auto, isClaimed, met: isClaimed || auto === true }
  })

  const doneCount = status.filter(s => s.met).length
  const accent = '#38bdf8'   // System blue

  return (
    <div style={{
      marginBottom: 16, borderRadius: 14, overflow: 'hidden', position: 'relative',
      background: 'linear-gradient(160deg, rgba(8,20,40,0.95), rgba(12,28,54,0.92))',
      border: `1px solid ${accent}55`,
      boxShadow: `0 0 0 1px ${accent}22, 0 0 24px ${accent}22`,
    }}>
      {/* corner ticks (System window aesthetic) */}
      {[['top',8,'left',8],['top',8,'right',8],['bottom',8,'left',8],['bottom',8,'right',8]].map(([vy,vyv,vx,vxv],i) => (
        <div key={i} style={{ position:'absolute', [vy]:vyv, [vx]:vxv, width:10, height:10, borderTop: vy==='top'?`2px solid ${accent}`:'none', borderBottom: vy==='bottom'?`2px solid ${accent}`:'none', borderLeft: vx==='left'?`2px solid ${accent}`:'none', borderRight: vx==='right'?`2px solid ${accent}`:'none', opacity:0.7 }} />
      ))}

      {/* Header */}
      <div style={{ padding: '14px 16px 10px', textAlign: 'center', borderBottom: `1px solid ${accent}33` }}>
        <div style={{ fontSize: '0.6rem', letterSpacing: '0.35em', color: accent, fontWeight: 700, textTransform: 'uppercase' }}>The System</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#eaf6ff', letterSpacing: '0.04em', marginTop: 2, textShadow: `0 0 12px ${accent}66` }}>
          ⚔ DAILY QUEST
        </div>
        <div style={{ fontSize: '0.66rem', color: accent, marginTop: 3, opacity: 0.85 }}>{modeLabel}</div>
      </div>

      {/* Quests */}
      <div style={{ padding: '8px 14px 4px' }}>
        {status.map(({ q, auto, isClaimed, met }) => {
          const rm = RANK_META[q.rank] || RANK_META.D
          return (
            <div key={q.id} style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '11px 4px',
              borderBottom: `1px solid ${accent}1f`, opacity: met ? 0.6 : 1,
            }}>
              {/* rank chip */}
              <div style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 6, background: `${rm.color}22`, border: `1px solid ${rm.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem', color: rm.color }}>
                {rm.label}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {q.icon} {q.title}{q.boss && <span style={{ marginLeft: 6, color: '#ef4444' }}>● BOSS</span>}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#dbeafe', marginTop: 2, textDecoration: met ? 'line-through' : 'none', lineHeight: 1.35 }}>
                  {q.text}
                </div>
                <div style={{ fontSize: '0.64rem', color: '#7dd3fc', marginTop: 2 }}>
                  Reward: +{q.reward} 🪙
                  {auto === false && !isClaimed && <span style={{ color: '#64748b', marginLeft: 8 }}>· auto-tracks from your log</span>}
                </div>
              </div>
              {/* state */}
              {met ? (
                <span style={{ flexShrink: 0, color: '#22c55e', fontWeight: 800, fontSize: '0.95rem' }}>✓</span>
              ) : auto === null ? (
                // manual challenge — user marks complete
                <button onClick={() => completeQuest(TODAY, q)} style={{ flexShrink: 0, padding: '5px 11px', borderRadius: 6, border: `1px solid ${accent}`, background: `${accent}1a`, color: accent, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                  Complete
                </button>
              ) : (
                // auto-tracked but not yet met — show a subtle pending pip
                <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: '50%', border: `2px solid ${accent}55` }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Footer / penalty warning */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.64rem', color: '#7dd3fc' }}>{doneCount}/{status.length} cleared · resets at midnight</span>
        {doneCount === status.length && status.length > 0
          ? <span style={{ fontSize: '0.66rem', color: '#22c55e', fontWeight: 700 }}>QUEST COMPLETE ✦</span>
          : <span style={{ fontSize: '0.62rem', color: '#f59e0b', opacity: 0.8 }}>⚠ Clear before midnight</span>}
      </div>
    </div>
  )
}
