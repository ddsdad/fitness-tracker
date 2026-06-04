import { useMemo } from 'react'
import { useStore } from '../../store/useStore.js'
import { computeHunter, ATTRS, RANKS } from '../../utils/hunter.js'
import HexChart from './HexChart.jsx'

const ACCENT = '#38bdf8'

function RankBadge({ rank, size = 92 }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, borderRadius: 18, position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(circle at 50% 35%, ${rank.color}33, rgba(8,16,32,0.9))`,
      border: `2px solid ${rank.color}`, boxShadow: `0 0 22px ${rank.glow}, inset 0 0 18px ${rank.color}22`,
    }}>
      <span style={{ fontSize: size * 0.4, fontWeight: 900, color: rank.color, textShadow: `0 0 14px ${rank.glow}`, letterSpacing: '-0.02em' }}>{rank.tier}</span>
    </div>
  )
}

export default function HunterStatus() {
  const { profile, sessions } = useStore()
  const h = useMemo(() => computeHunter(profile, sessions || []), [profile, sessions])
  if (!profile) return null

  const { stats, power, rank, next, progressToNext, strongest, weakest, className, powerLevel } = h

  return (
    <div style={{ paddingBottom: 8 }}>
      {/* ── Hero: rank + power level ── */}
      <div style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 16,
        background: `linear-gradient(160deg, rgba(8,18,38,0.96), rgba(10,16,30,0.94))`,
        border: `1px solid ${rank.color}55`, boxShadow: `0 0 26px ${rank.glow}`,
        padding: '18px 16px',
      }}>
        <div style={{ fontSize: '0.58rem', letterSpacing: '0.35em', color: ACCENT, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>
          ⚔ Hunter Status
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <RankBadge rank={rank} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: rank.color, textShadow: `0 0 12px ${rank.glow}`, lineHeight: 1.1 }}>
              {rank.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: 1 }}>{rank.title} · {className.emoji} {className.name}</div>
            <div style={{ marginTop: 8, fontSize: '0.62rem', color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Power Level</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#eaf6ff', lineHeight: 1, textShadow: `0 0 16px ${ACCENT}66` }}>
              {powerLevel.toLocaleString()}
            </div>
          </div>
        </div>

        {/* progress to next rank */}
        {next ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#94a3b8', marginBottom: 4 }}>
              <span>{rank.tier} · {power}</span>
              <span>{progressToNext}% → {next.tier}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressToNext}%`, borderRadius: 999, background: `linear-gradient(90deg, ${rank.color}, ${next.color})`, boxShadow: `0 0 10px ${next.glow}`, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: 5 }}>
              {next.min - power} power to <strong style={{ color: next.color }}>{next.name}</strong>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: '0.74rem', color: rank.color, fontWeight: 700 }}>
            ✦ Maximum rank achieved — you are the {rank.title}. ✦
          </div>
        )}
      </div>

      {/* ── Hexagon radar ── */}
      <div style={{ borderRadius: 16, background: 'rgba(8,16,32,0.55)', border: `1px solid ${ACCENT}33`, padding: '10px 8px 4px', marginBottom: 16 }}>
        <HexChart stats={stats} attrs={ATTRS} accent={ACCENT} size={260} />
      </div>

      {/* ── Attribute breakdown ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {ATTRS.map(a => (
          <div key={a.key} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: '1rem' }}>{a.icon}</span>
              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: a.color }}>{a.key}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>{a.name}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 800, color: a.color }}>{stats[a.key]}</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--bg4)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats[a.key]}%`, borderRadius: 999, background: a.color, transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text3)', marginTop: 4 }}>{a.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Class insight ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, background: `${strongest.color}14`, border: `1px solid ${strongest.color}44`, borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Strongest</div>
          <div style={{ fontWeight: 700, color: strongest.color, fontSize: '0.85rem', marginTop: 2 }}>{strongest.icon} {strongest.name}</div>
        </div>
        <div style={{ flex: 1, background: `${weakest.color}14`, border: `1px solid ${weakest.color}44`, borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Train next</div>
          <div style={{ fontWeight: 700, color: weakest.color, fontSize: '0.85rem', marginTop: 2 }}>{weakest.icon} {weakest.name}</div>
        </div>
      </div>

      {/* ── Rank ladder ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Rank Ladder</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[...RANKS].reverse().map(r => {
            const reached = power >= r.min
            const current = r.tier === rank.tier
            return (
              <div key={r.tier} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px', borderRadius: 8, background: current ? `${r.color}1a` : 'transparent', border: current ? `1px solid ${r.color}55` : '1px solid transparent', opacity: reached ? 1 : 0.4 }}>
                <span style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.7rem', color: r.color, border: `1px solid ${r.color}`, background: `${r.color}1a` }}>{r.tier}</span>
                <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: current ? 700 : 500, color: current ? r.color : 'var(--text2)' }}>{r.name} · {r.title}</span>
                {current && <span style={{ fontSize: '0.62rem', color: r.color, fontWeight: 700 }}>YOU</span>}
                {reached && !current && <span style={{ color: 'var(--green)', fontSize: '0.7rem' }}>✓</span>}
                {!reached && <span style={{ fontSize: '0.62rem', color: 'var(--text3)' }}>{r.min}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
