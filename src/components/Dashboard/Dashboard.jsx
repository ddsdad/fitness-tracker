import { useState, lazy, Suspense } from 'react'
import { useStore } from '../../store/useStore.js'
// three.js + react-three are ~1MB — only load them when the heatmap tab renders
const Body3D = lazy(() => import('./Body3D.jsx'))
import BodyStatsPanel from './BodyStatsPanel.jsx'
import { getMuscleVolume, getMuscleStatus, getMuscleDetail } from '../../utils/heatmap.js'
import { MUSCLE_GROUPS, RP_VOLUME } from '../../data/muscles.js'
import { getCurrentWeek } from '../../utils/milestones.js'
import { getWeekRange, weekRangeLabel, sessionsInWeek, muscleVolumeForSessions } from '../../utils/weekly.js'
import WeeklySummary from './WeeklySummary.jsx'
import HunterStatus from '../Hunter/HunterStatus.jsx'
import { structuralRiskScore } from '../../utils/balance.js'
import { getWeekScheduleData } from '../../utils/recommendations.js'
import Compete from '../Compete/Compete.jsx'
import Settings from '../Settings/Settings.jsx'
import Today from '../Today/Today.jsx'


// Muscle → split colour bucket
const MUSCLE_SPLIT_COLOR = {
  chest:'#3b82f6', front_delts:'#3b82f6', side_delts:'#3b82f6', triceps:'#3b82f6',   // push → blue
  lats:'#a78bfa',  rhomboids:'#a78bfa',   traps:'#a78bfa',  rear_delts:'#a78bfa',
  biceps:'#a78bfa',forearms:'#a78bfa',                                                 // pull → purple
  quads:'#22c55e', hamstrings:'#22c55e',  glutes:'#22c55e', calves:'#22c55e',
  lower_back:'#22c55e',                                                                // legs → green
  abs:'#f59e0b',                                                                       // core → amber
}

function WeekSchedule({ sessions, profile }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const days = getWeekScheduleData(sessions, profile?.startDate)

  // Week date range label
  const from = days[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const to   = days[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const sel = selectedDay !== null ? days[selectedDay] : null

  return (
    <div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: 12 }}>
        {from} – {to}
      </div>

      {/* 7-day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 16 }}>
        {days.map((day, i) => {
          const trained  = day.sessions.length > 0
          const isToday  = day.isToday
          const selected = selectedDay === i
          const topColors = [...new Set(day.muscleGroups.map(m => MUSCLE_SPLIT_COLOR[m]).filter(Boolean))].slice(0, 3)

          return (
            <div
              key={i}
              onClick={() => setSelectedDay(selected ? null : i)}
              style={{
                borderRadius: 10,
                border: `2px solid ${selected ? 'var(--green)' : isToday ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                background: isToday ? 'rgba(34,197,94,0.06)' : 'var(--bg2)',
                padding: '8px 4px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                minHeight: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div style={{ fontSize: '0.625rem', fontWeight: 700, color: isToday ? 'var(--green)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {day.dayLabel}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--green)' : 'var(--text)' }}>
                {day.date.getDate()}
              </div>

              {trained ? (
                <>
                  {/* Colour dots for muscle splits */}
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {topColors.map((c, ci) => (
                      <div key={ci} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                    ))}
                  </div>
                  {day.totalMins > 0 && (
                    <div style={{ fontSize: '0.5625rem', color: 'var(--text3)', marginTop: 1 }}>{day.totalMins}m</div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '0.5625rem', color: 'var(--text3)', marginTop: 4 }}>
                  {day.isPast ? 'Rest' : '—'}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {[['#3b82f6','Push'],['#a78bfa','Pull'],['#22c55e','Legs'],['#f59e0b','Core']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text2)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {sel && (
        <div className="card fade-in" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.9375rem' }}>
            {sel.dayLabel} {sel.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {sel.isToday && <span className="badge badge-green" style={{ marginLeft: 8 }}>Today</span>}
          </div>

          {sel.sessions.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
              {sel.isPast ? 'Rest day — no sessions logged.' : 'No session planned yet. Head to Plan to get a recommendation.'}
            </div>
          ) : (
            sel.sessions.map(session => {
              const muscles = [...new Set((session.exercises || []).map(e => e.primaryMuscle || e.primary).filter(Boolean))]
              return (
                <div key={session.id} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--bg3)' }}>
                  <div style={{ fontWeight: 600 }}>{session.name || 'Workout'}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', margin: '4px 0' }}>
                    {session.exercises?.length || 0} exercises · {(session.exercises || []).reduce((s, e) => s + (e.sets?.length || 0), 0)} sets
                    {session.duration ? ` · ${session.duration} min` : ''}
                    {session.totalVolume > 0 ? ` · ${session.totalVolume >= 1000 ? `${(session.totalVolume/1000).toFixed(1)}k` : session.totalVolume} kg` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {muscles.map(m => (
                      <span key={m} style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 999, background: `${MUSCLE_SPLIT_COLOR[m] || 'var(--bg4)'}22`, color: MUSCLE_SPLIT_COLOR[m] || 'var(--text3)', border: `1px solid ${MUSCLE_SPLIT_COLOR[m] || 'var(--border)'}44` }}>
                        {MUSCLE_GROUPS[m]?.label || m}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* This week summary */}
      <div className="section-title" style={{ marginBottom: 8 }}>This Week</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { label: 'Sessions',     value: days.filter(d => d.sessions.length > 0).length },
          { label: 'Total Volume', value: days.reduce((s, d) => s + d.totalVolume, 0) >= 1000 ? `${(days.reduce((s, d) => s + d.totalVolume, 0)/1000).toFixed(1)}k` : days.reduce((s, d) => s + d.totalVolume, 0) },
          { label: 'Training Days Left', value: days.filter(d => !d.isPast && !d.isToday && d.sessions.length === 0).length },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{s.value}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const LEGEND = [
  { color: 'rgba(70,70,70,0.7)',  label: 'Untrained' },
  { color: 'rgba(239,68,68,0.9)', label: '< MEV' },
  { color: 'rgba(234,179,8,0.85)',label: 'Working' },
  { color: 'rgba(34,197,94,0.9)', label: 'Optimal' },
  { color: 'rgba(239,68,68,0.8)', label: 'Overtrained' },
]

export default function Dashboard({ onNavigate, onStartSession }) {
  const { profile, sessions, goals, nutritionLogs } = useStore()
  const [activeMuscle, setActiveMuscle] = useState(null)
  const [tab, setTab] = useState('today') // today | heatmap | schedule | compete | stats
  const [showSettings, setShowSettings] = useState(false)

  const goalId = profile?.physiqueGoal || 'overall_size'
  const customWeights = Object.keys(goals).length > 0 ? goals : null

  const rawWeek     = profile ? getCurrentWeek(profile.startDate) : 1
  const targetWeeks = profile?.targetWeeks || 12
  const currentWeek = Math.min(rawWeek, targetWeeks)        // cap so the heatmap navigator can't exceed the plan
  const weeksLeft   = Math.max(0, targetWeeks - rawWeek)

  // Heatmap now reflects a specific PROGRAM WEEK (default = current), not a
  // rolling window — so "week 2" means week 2, matching how the user thinks.
  const [viewWeek, setViewWeek] = useState(currentWeek)
  const muscleVolume = profile?.startDate
    ? muscleVolumeForSessions(sessionsInWeek(sessions, profile.startDate, viewWeek))
    : getMuscleVolume(sessions, 7)

  const cutoff7 = new Date(); cutoff7.setDate(cutoff7.getDate() - 7)
  const sessions7 = sessions.filter(s => new Date(s.date) >= cutoff7)
  const totalVolume7 = sessions7.reduce((sum, s) => sum + (s.totalVolume || 0), 0)

  // Risk score
  const risk = structuralRiskScore(muscleVolume, profile?.liftMaxes)

  const activeMuscleDetail = activeMuscle
    ? getMuscleDetail(activeMuscle, muscleVolume[activeMuscle] || 0, goalId, customWeights)
    : null
  const rpZone = activeMuscle ? RP_VOLUME[activeMuscle] : null

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="hud-eyebrow" style={{ marginBottom: 3 }}>System Online</div>
            <h1>{profile?.name ? profile.name : 'Hunter'}</h1>
            <p>{weeksLeft > 0 ? `Week ${currentWeek} · ${weeksLeft} weeks left` : `Program complete · ${targetWeeks} weeks`}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Risk gauge */}
            <div style={{ textAlign: 'center', background: 'var(--bg2)', border: `1px solid ${risk.color}22`, borderRadius: 10, padding: '8px 12px', minWidth: 64 }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: risk.color }}>{risk.score}</div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Risk</div>
              <div style={{ fontSize: '0.625rem', color: risk.color, fontWeight: 600 }}>{risk.level}</div>
            </div>
            {/* Settings */}
            <button onClick={() => setShowSettings(true)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, width: 38, height: 44, fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text2)' }} aria-label="Settings">⚙️</button>
          </div>
        </div>
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      {/* Quick stats */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-block">
          <div className="val" style={{ color: 'var(--accent)', textShadow: '0 0 16px color-mix(in srgb, var(--accent) 60%, transparent)' }}>{sessions7.length}</div>
          <div className="lbl">Sessions</div>
        </div>
        <div className="stat-block">
          <div className="val" style={{ color: 'var(--sys)', textShadow: '0 0 16px rgba(56,189,248,0.5)' }}>{totalVolume7 >= 1000 ? `${(totalVolume7/1000).toFixed(1)}k` : totalVolume7}</div>
          <div className="lbl">Volume kg</div>
        </div>
        <div className="stat-block">
          <div className="val" style={{ color: 'var(--sys2)', textShadow: '0 0 16px rgba(129,140,248,0.5)' }}>{Object.values(muscleVolume).filter(v => v > 0).length}</div>
          <div className="lbl">Muscles Hit</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: 'rgba(10,16,30,0.55)', border: '1px solid var(--border)', borderRadius: 14, padding: 4, marginBottom: 20, gap: 3, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[['today','Home'],['status','Status'],['heatmap','Body'],['schedule','Week'],['compete','Arena'],['stats','Stats']].map(([id, label]) => {
          const on = tab === id
          const accent = id === 'status' ? 'var(--sys)' : 'var(--accent)'
          return (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: '1 0 auto', padding: '8px 10px', borderRadius: 10, border: on ? `1px solid ${accent}55` : '1px solid transparent', cursor: 'pointer',
              background: on ? `color-mix(in srgb, ${accent} 16%, transparent)` : 'transparent',
              color: on ? accent : 'var(--text3)', fontWeight: on ? 800 : 600, fontSize: '0.72rem', letterSpacing: '0.02em',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
              boxShadow: on ? `0 0 14px -6px ${accent}` : 'none',
            }}>
              {label}
            </button>
          )
        })}
      </div>

      {tab === 'status' && <HunterStatus />}

      {tab === 'today'    && <Today embedded onNavigate={onNavigate} onStartSession={onStartSession} />}
      {tab === 'stats'    && <BodyStatsPanel profile={profile} />}
      {tab === 'schedule' && <WeekSchedule sessions={sessions} goals={goals} profile={profile} />}
      {tab === 'compete'  && <Compete />}

      {tab === 'heatmap' && sessions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: '3rem' }}>🗺️</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>No training data yet</div>
          <div style={{ color: 'var(--text2)', fontSize: '0.875rem', maxWidth: 280, lineHeight: 1.5 }}>
            Log your first workout and the heatmap will show which muscles you're hitting and whether your volume is in the optimal zone.
          </div>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => onNavigate('workout')}>
            Log First Workout
          </button>
        </div>
      )}

      {tab === 'heatmap' && sessions.length > 0 && (
        <>
          {/* High-level weekly summaries (live current week + auto-saved past weeks) */}
          <WeeklySummary />

          {/* Imbalance warnings */}
          {risk.imbalances.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {risk.imbalances.slice(0,2).map(imb => (
                <div key={imb.id} style={{ background: imb.risk === 'high' ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.08)', border: `1px solid ${imb.risk === 'high' ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.3)'}`, borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{imb.label} imbalance</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>{imb.fix}</div>
                </div>
              ))}
            </div>
          )}

          {/* Program-week navigator — the heatmap reflects ONE week at a time */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <button
              onClick={() => setViewWeek(w => Math.max(1, w - 1))}
              disabled={viewWeek <= 1}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', cursor: viewWeek <= 1 ? 'default' : 'pointer', opacity: viewWeek <= 1 ? 0.35 : 1, fontSize: '1.1rem' }}
              aria-label="Previous week"
            >‹</button>
            <div style={{ textAlign: 'center', minWidth: 140 }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                Week {viewWeek}{viewWeek === currentWeek && <span className="badge badge-green" style={{ marginLeft: 6 }}>Current</span>}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{profile?.startDate ? weekRangeLabel(profile.startDate, viewWeek) : ''}</div>
            </div>
            <button
              onClick={() => setViewWeek(w => Math.min(currentWeek, w + 1))}
              disabled={viewWeek >= currentWeek}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', cursor: viewWeek >= currentWeek ? 'default' : 'pointer', opacity: viewWeek >= currentWeek ? 0.35 : 1, fontSize: '1.1rem' }}
              aria-label="Next week"
            >›</button>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text3)', marginBottom: 16 }}>
            Heatmap shows sets logged in this program week
          </div>

          {/* 3D body heatmap */}
          <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
            <Suspense fallback={
              <div style={{ height: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text3)', fontSize: '0.8rem' }}>
                <span style={{ fontSize: '2rem' }}>🧍</span> Loading 3D body…
              </div>
            }>
              <Body3D
                muscleVolume={muscleVolume}
                goalId={goalId}
                customWeights={customWeights}
                activeMuscle={activeMuscle}
                onMuscleClick={m => setActiveMuscle(m === activeMuscle ? null : m)}
              />
            </Suspense>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '12px 16px', flexWrap: 'wrap' }}>
              {LEGEND.map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text3)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active muscle detail with RP zones */}
          {activeMuscle && activeMuscleDetail && (
            <div className="card fade-in" style={{ marginBottom: 16, borderColor: 'var(--green)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3>{MUSCLE_GROUPS[activeMuscle]?.label}</h3>
                <span className={`badge ${activeMuscleDetail.cls}`}>{activeMuscleDetail.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[['MEV', activeMuscleDetail.MEV, 'var(--red)'], ['MAV', activeMuscleDetail.MAV, 'var(--yellow)'], ['MRV', activeMuscleDetail.MRV, 'var(--green)']].map(([zone, val, color]) => (
                  <div key={zone} style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color }}>{val}</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text3)', marginTop: 2 }}>{zone} sets/wk</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: 6 }}>
                <span style={{ color: 'var(--text2)' }}>This week</span>
                <span style={{ fontWeight: 600 }}>{activeMuscleDetail.volume.toFixed(0)} sets</span>
              </div>
              <div style={{ height: 8, background: 'var(--bg4)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                {/* MEV marker */}
                <div style={{ position: 'absolute', left: `${Math.min(95, activeMuscleDetail.MEV / activeMuscleDetail.MRV * 100)}%`, top: 0, bottom: 0, width: 2, background: 'var(--red)', opacity: 0.7 }} />
                {/* MAV marker */}
                <div style={{ position: 'absolute', left: `${Math.min(95, activeMuscleDetail.MAV / activeMuscleDetail.MRV * 100)}%`, top: 0, bottom: 0, width: 2, background: 'var(--yellow)', opacity: 0.7 }} />
                {/* Fill */}
                <div style={{ height: '100%', width: `${Math.min(100, activeMuscleDetail.volume / activeMuscleDetail.MRV * 100)}%`, background: activeMuscleDetail.cls.includes('green') ? 'var(--green)' : activeMuscleDetail.cls.includes('yellow') ? 'var(--yellow)' : 'var(--red)', borderRadius: 4, transition: 'width 0.4s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: 'var(--text3)', marginTop: 4 }}>
                <span>0</span><span>MEV</span><span>MAV</span><span>MRV</span>
              </div>
            </div>
          )}

          {/* Balance ratios */}
          <div className="section">
            <div className="section-title">Balance Ratios</div>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="card card-sm">
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: 4 }}>Push:Pull</div>
                <div style={{ fontWeight: 700, fontSize: '1.125rem', color: risk.pp.status === 'balanced' ? 'var(--green)' : 'var(--yellow)' }}>
                  {risk.pp.ratio ?? '—'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: risk.pp.status === 'balanced' ? 'var(--green)' : 'var(--yellow)', marginTop: 2 }}>
                  {risk.pp.status === 'balanced' ? 'Balanced' : risk.pp.status === 'push_heavy' ? 'Push Heavy ⚠️' : 'Pull Heavy'}
                </div>
              </div>
              <div className="card card-sm">
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: 4 }}>Quad:Ham</div>
                <div style={{ fontWeight: 700, fontSize: '1.125rem', color: risk.qh.status === 'balanced' ? 'var(--green)' : 'var(--red)' }}>
                  {risk.qh.ratio ?? '—'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: risk.qh.status === 'balanced' ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>
                  {risk.qh.status === 'balanced' ? 'Balanced' : risk.qh.status === 'quad_dominant' ? 'Quad Dom ⚠️' : 'Ham Dom'}
                </div>
              </div>
            </div>
            {/* Rotator cuff */}
            {risk.rc.status !== 'no_data' && (
              <div style={{ background: risk.rc.status === 'at_risk' ? 'rgba(239,68,68,0.08)' : 'var(--bg2)', border: `1px solid ${risk.rc.status === 'at_risk' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Rotator Cuff Ratio</span>
                  <span className={`badge ${risk.rc.status === 'healthy' ? 'badge-green' : risk.rc.status === 'warning' ? 'badge-yellow' : 'badge-red'}`}>
                    {risk.rc.status === 'healthy' ? 'Healthy' : risk.rc.status === 'warning' ? 'Warning' : 'At Risk'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginTop: 4 }}>{risk.rc.message}</div>
              </div>
            )}
          </div>

          {/* Volume breakdown */}
          <div className="section">
            <div className="section-title">Volume Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(MUSCLE_GROUPS).map(([muscle, meta]) => {
                const vol = muscleVolume[muscle] || 0
                const detail = getMuscleDetail(muscle, vol, goalId, customWeights)
                const rp = RP_VOLUME[muscle]
                return (
                  <div key={muscle} className="card card-sm" style={{ cursor: 'pointer', borderColor: activeMuscle === muscle ? 'var(--green)' : 'var(--border)' }} onClick={() => setActiveMuscle(muscle === activeMuscle ? null : muscle)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: detail.cls.includes('green') ? 'var(--green)' : detail.cls.includes('yellow') ? 'var(--yellow)' : 'var(--red)', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '0.9375rem' }}>{meta.label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{Math.round(vol)}/{rp?.MAV ?? '?'} sets</span>
                      <span className={`badge ${detail.cls}`} style={{ fontSize: '0.6875rem' }}>{detail.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
