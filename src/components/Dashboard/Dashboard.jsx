import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import Body3D from './Body3D.jsx'
import BodyStatsPanel from './BodyStatsPanel.jsx'
import { getMuscleVolume, getMuscleStatus, getMuscleDetail } from '../../utils/heatmap.js'
import { MUSCLE_GROUPS, RP_VOLUME } from '../../data/muscles.js'
import { getCurrentWeek } from '../../utils/milestones.js'
import { structuralRiskScore } from '../../utils/balance.js'
import { getWeekScheduleData } from '../../utils/recommendations.js'
import { weeklyReport } from '../../utils/coach.js'
import Compete from '../Compete/Compete.jsx'

const TIME_WINDOWS = [{ label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: 'All', days: 365 }]

// Muscle → split colour bucket
const MUSCLE_SPLIT_COLOR = {
  chest:'#3b82f6', front_delts:'#3b82f6', side_delts:'#3b82f6', triceps:'#3b82f6',   // push → blue
  lats:'#a78bfa',  rhomboids:'#a78bfa',   traps:'#a78bfa',  rear_delts:'#a78bfa',
  biceps:'#a78bfa',forearms:'#a78bfa',                                                 // pull → purple
  quads:'#22c55e', hamstrings:'#22c55e',  glutes:'#22c55e', calves:'#22c55e',
  lower_back:'#22c55e',                                                                // legs → green
  abs:'#f59e0b',                                                                       // core → amber
}

function WeekSchedule({ sessions }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const days = getWeekScheduleData(sessions)

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

export default function Dashboard() {
  const { profile, sessions, goals, nutritionLogs } = useStore()
  const [window_, setWindow_] = useState(7)
  const [activeMuscle, setActiveMuscle] = useState(null)
  const [tab, setTab] = useState('heatmap') // heatmap | schedule | compete | stats

  const muscleVolume = getMuscleVolume(sessions, window_)
  const goalId = profile?.physiqueGoal || 'overall_size'
  const customWeights = Object.keys(goals).length > 0 ? goals : null

  const currentWeek = profile ? getCurrentWeek(profile.startDate) : 1
  const weeksLeft   = profile ? Math.max(0, profile.targetWeeks - currentWeek) : 0

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
            <h1>{profile?.name ? `Hey, ${profile.name} 👋` : 'Muscle Heatmap'}</h1>
            <p>Week {currentWeek} · {weeksLeft} weeks left</p>
          </div>
          {/* Risk gauge */}
          <div style={{ textAlign: 'center', background: 'var(--bg2)', border: `1px solid ${risk.color}22`, borderRadius: 10, padding: '8px 12px', minWidth: 64 }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: risk.color }}>{risk.score}</div>
            <div style={{ fontSize: '0.625rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Risk</div>
            <div style={{ fontSize: '0.625rem', color: risk.color, fontWeight: 600 }}>{risk.level}</div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-block">
          <div className="val text-green">{sessions7.length}</div>
          <div className="lbl">Sessions</div>
        </div>
        <div className="stat-block">
          <div className="val">{totalVolume7 >= 1000 ? `${(totalVolume7/1000).toFixed(1)}k` : totalVolume7}</div>
          <div className="lbl">Volume kg</div>
        </div>
        <div className="stat-block">
          <div className="val">{Object.values(muscleVolume).filter(v => v > 0).length}</div>
          <div className="lbl">Muscles Hit</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 999, padding: 3, marginBottom: 20, gap: 2 }}>
        {[['heatmap','Heatmap'],['schedule','Schedule'],['compete','🏆 Compete'],['stats','Stats']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: '7px 4px', borderRadius: 999, border: 'none', cursor: 'pointer', background: tab === id ? 'var(--bg2)' : 'transparent', color: tab === id ? (id === 'compete' ? 'var(--green)' : 'var(--text)') : 'var(--text3)', fontWeight: tab === id ? 600 : 400, fontSize: '0.75rem', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'stats'    && <BodyStatsPanel profile={profile} />}
      {tab === 'schedule' && <WeekSchedule sessions={sessions} goals={goals} profile={profile} />}
      {tab === 'compete'  && <Compete />}

      {tab === 'heatmap' && (
        <>
          {/* Weekly coach report */}
          {(() => {
            const r = weeklyReport(sessions, profile, nutritionLogs || {})
            return (
              <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(34,197,94,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: '1.125rem' }}>🧠</span>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>This Week</span>
                  {r.volChange != null && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: r.volChange >= 0 ? 'var(--green)' : '#f59e0b' }}>
                      {r.volChange >= 0 ? '▲' : '▼'} {Math.abs(r.volChange)}% volume
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 600 }}>{r.verdict}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginTop: 4, lineHeight: 1.5 }}>{r.focus}</div>
                {r.hasData && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, fontSize: '0.7rem' }}>
                    <span style={{ flex: 1, textAlign: 'center', background: 'var(--bg3)', borderRadius: 8, padding: '6px 4px' }}><strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--green)' }}>{r.sessionCount}</strong>sessions</span>
                    <span style={{ flex: 1, textAlign: 'center', background: 'var(--bg3)', borderRadius: 8, padding: '6px 4px' }}><strong style={{ fontSize: '0.95rem', display: 'block' }}>{r.volume >= 1000 ? (r.volume/1000).toFixed(1)+'k' : r.volume}</strong>volume</span>
                    <span style={{ flex: 1, textAlign: 'center', background: 'var(--bg3)', borderRadius: 8, padding: '6px 4px' }}><strong style={{ fontSize: '0.95rem', display: 'block' }}>{r.proteinDays}/7</strong>protein days</span>
                  </div>
                )}
              </div>
            )
          })()}

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

          {/* Time window selector */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 999, padding: 3, gap: 2 }}>
              {TIME_WINDOWS.map(w => (
                <button key={w.days} onClick={() => setWindow_(w.days)}
                  style={{ padding: '6px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', background: window_ === w.days ? 'var(--green)' : 'transparent', color: window_ === w.days ? '#000' : 'var(--text2)', fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s' }}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3D body heatmap */}
          <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
            <Body3D
              muscleVolume={muscleVolume}
              goalId={goalId}
              customWeights={customWeights}
              activeMuscle={activeMuscle}
              onMuscleClick={m => setActiveMuscle(m === activeMuscle ? null : m)}
            />
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
