import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { planRestOfWeek, buildDayWorkout, FIBER_PROFILES } from '../../utils/weekPlanner.js'
import { planExercisesToSession } from '../WorkoutLog/WorkoutSession.jsx'

// ── Compact "rest of week" optimal allocation card ────────────────────────────
export default function WeekPlanner({ onStartSession }) {
  const { profile, sessions, goals } = useStore()
  const [open, setOpen] = useState(true)

  const customWeights = goals && Object.keys(goals).length > 0 ? goals : null
  const plan = useMemo(
    () => planRestOfWeek(sessions, profile, customWeights),
    [sessions, profile, customWeights]
  )
  if (!plan) return null

  const { days, perMuscle, totals, daysLeft, cram, fiberLabel, stillShort, trainingDays } = plan
  const cov = totals.coveragePct

  return (
    <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden', border: '1px solid rgba(59,130,246,0.3)' }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '1.25rem' }}>🧮</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
            This Week's Plan
            {cram && <span style={{ marginLeft: 8, fontSize: '0.6rem', fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 7px', borderRadius: 999, letterSpacing: '0.04em' }}>CRAM MODE</span>}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 1 }}>
            {daysLeft} day{daysLeft !== 1 ? 's' : ''} left · {trainingDays} session{trainingDays !== 1 ? 's' : ''} planned · {fiberLabel}
          </div>
        </div>
        {/* coverage ring */}
        <svg width={44} height={44} viewBox="0 0 44 44">
          <circle cx={22} cy={22} r={18} fill="none" stroke="var(--bg4)" strokeWidth={4} />
          <circle cx={22} cy={22} r={18} fill="none"
            stroke={cov >= 90 ? 'var(--green)' : cov >= 60 ? 'var(--yellow)' : 'var(--red)'}
            strokeWidth={4} strokeLinecap="round"
            strokeDasharray={`${cov / 100 * 113.1} 113.1`} transform="rotate(-90 22 22)" />
          <text x={22} y={26} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--text)">{cov}%</text>
        </svg>
        <span style={{ color: 'var(--text3)', fontSize: '0.75rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
      </div>

      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>
            Optimal allocation of your remaining weekly volume across the days left — recalculated whenever you log or miss a day. Capped at each muscle's safe recoverable max.
          </div>

          {/* Day plan strip */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {days.map(d => (
              <div key={d.dayIndex} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
                background: d.isToday ? 'rgba(34,197,94,0.07)' : 'var(--bg3)',
                border: `1px solid ${d.isToday ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
              }}>
                <div style={{ textAlign: 'center', minWidth: 40 }}>
                  <div style={{ fontSize: '1.25rem' }}>{d.emoji}</div>
                  <div style={{ fontSize: '0.6rem', color: d.isToday ? 'var(--green)' : 'var(--text3)', fontWeight: 700 }}>{d.isToday ? 'TODAY' : d.dateLabel}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{d.label}</div>
                  {d.muscles.length > 0 ? (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text2)', marginTop: 2 }}>
                      {d.muscles.map(m => `${m.label} ${m.sets}`).join(' · ')} sets
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 2 }}>Recovery — nothing due</div>
                  )}
                </div>
                {d.totalSets > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--green)', fontSize: '1rem' }}>{d.totalSets}</div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text3)', textTransform: 'uppercase' }}>sets</div>
                  </div>
                )}
                {d.isToday && d.totalSets > 0 && onStartSession && (
                  <button
                    onClick={() => onStartSession(planExercisesToSession(buildDayWorkout(d, profile)))}
                    style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#000', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >▶ Start</button>
                )}
              </div>
            ))}
          </div>

          {/* Projected weekly coverage per muscle (lowest first) */}
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Projected weekly volume
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {perMuscle.slice(0, 8).map(m => (
              <div key={m.muscle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 2 }}>
                  <span style={{ color: 'var(--text2)' }}>{m.label}</span>
                  <span style={{ color: m.projectedPct >= 90 ? 'var(--green)' : m.projectedPct >= 60 ? 'var(--yellow)' : 'var(--red)', fontWeight: 600 }}>
                    {m.done}{m.scheduled > 0 ? ` +${m.scheduled}` : ''} / {m.target} sets
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 999, background: 'var(--bg4)', overflow: 'hidden', position: 'relative' }}>
                  {/* already-done portion (solid) */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, m.target ? m.done / m.target * 100 : 0)}%`, background: 'var(--green)' }} />
                  {/* scheduled portion (lighter, stacked) */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(100, m.target ? m.done / m.target * 100 : 0)}%`, width: `${Math.min(100 - (m.target ? m.done / m.target * 100 : 0), m.target ? m.scheduled / m.target * 100 : 0)}%`, background: 'rgba(34,197,94,0.4)' }} />
                </div>
              </div>
            ))}
          </div>

          {stillShort.length > 0 && (
            <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 12, background: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: '8px 10px' }}>
              ⚠️ Not enough days to fully hit: <strong>{stillShort.join(', ')}</strong>. Prioritized by your goals; the rest carries minimal deficit.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
