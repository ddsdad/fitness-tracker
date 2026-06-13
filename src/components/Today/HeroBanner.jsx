import { useMemo } from 'react'
import { useStore } from '../../store/useStore.js'
import { computeHunter } from '../../utils/hunter.js'
import { gameStats } from '../../utils/gamification.js'
import { currentStreak } from '../../utils/streak.js'
import { computeAura } from '../../utils/aura.js'

// ── The home hero — first 2 seconds should punch ──────────────────────────────
// Rank sigil + Power Level + level/coins + streak flame, on a glowing System
// panel. The single dominant element of the home screen.
export default function HeroBanner({ onPrimary, primaryLabel, primaryReady = true, subtitle }) {
  const { profile, sessions, measurementHistory, nutritionLogs } = useStore()
  const h = useMemo(() => computeHunter(profile, sessions || []), [profile, sessions])
  const game = useMemo(() => gameStats(profile, sessions, measurementHistory, nutritionLogs), [profile, sessions, measurementHistory, nutritionLogs])
  const streak = currentStreak(sessions || [], profile?.game?.shieldDates || [])
  const aura = useMemo(() => computeAura(sessions || [], profile?.game?.shieldDates || []), [sessions, profile])
  if (!profile) return null

  const { rank, powerLevel, next, progressToNext } = h

  return (
    <div className="hud" style={{
      position: 'relative', borderRadius: 18, overflow: 'hidden', marginBottom: 18,
      padding: '18px 16px 16px',
      background: `linear-gradient(165deg, color-mix(in srgb, ${rank.color} 16%, rgba(10,18,38,0.9)), rgba(8,12,26,0.92))`,
      border: `1px solid ${rank.color}55`,
      boxShadow: `0 10px 40px -14px rgba(0,0,0,0.8), 0 0 30px -8px ${rank.glow}`,
    }}>
      {/* animated scan sheen */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
        background: `linear-gradient(115deg, transparent 40%, ${rank.color}22 50%, transparent 60%)`,
        backgroundSize: '250% 250%', animation: 'shimmer 6s linear infinite' }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Rank sigil */}
        <div style={{
          width: 70, height: 70, flexShrink: 0, borderRadius: 16, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `radial-gradient(circle at 50% 32%, ${rank.color}44, rgba(8,14,30,0.9))`,
          border: `2px solid ${rank.color}`, boxShadow: `0 0 22px ${rank.glow}, inset 0 0 16px ${rank.color}22`,
        }}>
          <span style={{ fontSize: '2rem', fontWeight: 900, color: rank.color, textShadow: `0 0 14px ${rank.glow}` }}>{rank.tier}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hud-eyebrow">{rank.name} · {rank.title}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#eaf6ff', lineHeight: 1, textShadow: `0 0 18px ${rank.glow}`, fontVariantNumeric: 'tabular-nums' }}>
              {powerLevel.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Power</span>
          </div>
          {/* level + coins + streak row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: '0.72rem', fontWeight: 700 }}>
            <span style={{ color: 'var(--text2)' }}>Lv {game.level}</span>
            <span style={{ color: 'var(--accent)' }}>🪙 {game.coins}</span>
            {streak > 0 && <span style={{ color: '#fb923c' }}>{streak}🔥</span>}
          </div>
        </div>
      </div>

      {/* AURA meter — the stakes bar */}
      <div style={{ position: 'relative', marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', marginBottom: 3, fontWeight: 800, letterSpacing: '0.08em' }}>
          <span style={{ color: aura.tier.color }}>⚡ AURA · {aura.tier.label}</span>
          <span style={{ color: aura.decaying ? '#f59e0b' : 'var(--text3)' }}>
            {aura.decaying ? `▼ −${aura.willLoseTomorrow} if you skip` : `${aura.value}/100`}
          </span>
        </div>
        <div className="progress-bar" style={{ height: 7 }}>
          <div className="progress-bar-fill" style={{ width: `${aura.value}%`, background: `linear-gradient(90deg, ${aura.tier.color}, color-mix(in srgb, ${aura.tier.color} 50%, white))`, boxShadow: `0 0 12px ${aura.tier.color}`, animation: aura.decaying ? 'pulse 1.6s ease-in-out infinite' : 'none' }} />
        </div>
      </div>

      {/* rank progress */}
      {next && (
        <div style={{ position: 'relative', marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text3)', marginBottom: 3, fontWeight: 700, letterSpacing: '0.04em' }}>
            <span>RANK {rank.tier}</span>
            <span>{progressToNext}% → {next.tier}</span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div className="progress-bar-fill" style={{ width: `${progressToNext}%`, background: `linear-gradient(90deg, ${rank.color}, ${next.color})`, boxShadow: `0 0 10px ${next.glow}` }} />
          </div>
        </div>
      )}

      {/* Primary mission CTA */}
      {onPrimary && (
        <button className="btn btn-primary btn-full" style={{ marginTop: 14, fontSize: '1rem', padding: '15px', letterSpacing: '0.02em' }} onClick={onPrimary} disabled={!primaryReady}>
          {primaryLabel}
        </button>
      )}
      {subtitle && <div style={{ position: 'relative', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text3)', marginTop: 8 }}>{subtitle}</div>}
    </div>
  )
}
