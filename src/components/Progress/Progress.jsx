import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useStore } from '../../store/useStore.js'
import { getCurrentWeek, getProgressStatus, getStatusLabel, detectTrainingLevel, TRAINING_LEVEL_META } from '../../utils/milestones.js'
import { caseyButtCeiling, lbmAndFat, navyBF } from '../../utils/calculations.js'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { IconPlus, IconCheck, IconArrowDown } from '../shared/Icons.jsx'
import { e1rmTrend, topTrackedExercises, detectPlateau, weeklyVolumeSeries, bestWorstWeeks, gainRate, projectStrength } from '../../utils/analytics.js'

// ── Streak calculation ────────────────────────────────────────────────────────
function calcStreak(sessions) {
  if (!sessions.length) return { current: 0, thisWeek: 0, avg30: 0 }
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date))
  const today = new Date(); today.setHours(0,0,0,0)

  // Current day streak
  let streak = 0
  let check = new Date(today)
  for (let i = 0; i < 90; i++) {
    const ds = check.toDateString()
    if (sorted.some(s => new Date(s.date).toDateString() === ds)) {
      streak++
      check.setDate(check.getDate() - 1)
    } else if (i === 0) { // Today has no session yet — don't break streak
      check.setDate(check.getDate() - 1)
    } else break
  }

  // Sessions this week (Mon–Sun)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
  const thisWeek = sessions.filter(s => new Date(s.date) >= weekStart).length

  // 30-day average
  const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30)
  const avg30 = +(sessions.filter(s => new Date(s.date) >= cutoff30).length / 4.3).toFixed(1)

  return { current: streak, thisWeek, avg30 }
}

const LIFT_LABELS = { squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift', row: 'Row', ohp: 'OHP' }
const MEASURE_LABELS = { chest: 'Chest', waist: 'Waist', hips: 'Hips', arms: 'Arms', shoulders: 'Shoulders', thighs: 'Thighs', calves: 'Calves' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8125rem' }}>
      <div style={{ color: 'var(--text2)', marginBottom: 4 }}>Week {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value?.toFixed(1)}
        </div>
      ))}
    </div>
  )
}

function MetricChart({ data, dataKey, targetKey, label, color = '#22c55e', unit = '' }) {
  if (!data || data.length === 0) return <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 24, fontSize: '0.875rem' }}>No data yet</div>
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--bg4)" />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text3)' }} tickLine={false} axisLine={false} label={{ value: 'Week', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--text3)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey={targetKey} stroke="var(--border)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Target" />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ fill: color, r: 3 }} name="Actual" connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Check-in modal
function CheckInModal({ profile, currentWeek, onSave, onClose }) {
  const milestone = profile.milestones?.find(m => m.week === currentWeek) || {}
  const [bw, setBw] = useState('')
  const [measures, setMeasures] = useState({})
  const [lifts, setLifts] = useState({})

  const save = () => {
    onSave({
      week: currentWeek,
      date: new Date().toISOString(),
      bodyweight: parseFloat(bw) || null,
      measurements: Object.fromEntries(Object.entries(measures).map(([k,v]) => [k, parseFloat(v) || null])),
      liftMaxes: Object.fromEntries(Object.entries(lifts).map(([k,v]) => [k, parseFloat(v) || null])),
    })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, overflowY: 'auto' }}>
      <div style={{ background: 'var(--bg2)', minHeight: '100%', padding: '20px 16px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2>Week {currentWeek} Check-In</h2>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label>Bodyweight (target: {milestone.bodyweight} {profile.unit})</label>
          <input className="input" type="number" inputMode="decimal" placeholder={String(milestone.bodyweight || '')} value={bw} onChange={e => setBw(e.target.value)} />
        </div>

        <div className="section-title">Measurements</div>
        {Object.keys(MEASURE_LABELS).map(k => (
          <div key={k} style={{ marginBottom: 14 }}>
            <label>{MEASURE_LABELS[k]} (target: {milestone.measurements?.[k]} {profile.unit === 'kg' ? 'cm' : 'in'})</label>
            <input className="input" type="number" inputMode="decimal" value={measures[k] || ''} onChange={e => setMeasures(p => ({...p, [k]: e.target.value}))} />
          </div>
        ))}

        <div className="section-title" style={{ marginTop: 20 }}>Lift Maxes (1RM)</div>
        {Object.keys(LIFT_LABELS).map(k => (
          <div key={k} style={{ marginBottom: 14 }}>
            <label>{LIFT_LABELS[k]} (target: {milestone.liftMaxes?.[k]} {profile.unit})</label>
            <input className="input" type="number" inputMode="decimal" value={lifts[k] || ''} onChange={e => setLifts(p => ({...p, [k]: e.target.value}))} />
          </div>
        ))}

        <button className="btn btn-primary btn-full" style={{ marginTop: 24 }} onClick={save}><IconCheck /> Save Check-In</button>
      </div>
    </div>
  )
}

// ── Edit a single measurement or lift ─────────────────────────────────────────
function EditMeasurementModal({ metric, label, currentValue, unit, onSave, onClose }) {
  const [value, setValue] = useState('')
  const save = () => {
    const v = parseFloat(value)
    if (isNaN(v) || v <= 0) return
    onSave(metric, v)
    onClose()
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:300, display:'flex', alignItems:'flex-end' }}>
      <div style={{ width:'100%', maxWidth:480, margin:'0 auto', background:'var(--bg2)', borderRadius:'16px 16px 0 0', padding:'24px 20px 36px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3>Update {label}</h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding:'4px 12px' }}>✕</button>
        </div>
        <div style={{ fontSize:'0.875rem', color:'var(--text2)', marginBottom:12 }}>
          Current: <strong>{currentValue} {unit}</strong>
        </div>
        <div className="input-unit" style={{ marginBottom:16 }}>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder={String(currentValue)}
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
          />
          <span>{unit}</span>
        </div>
        {value && parseFloat(value) > 0 && (
          <div style={{ fontSize:'0.8rem', color: parseFloat(value) > currentValue ? 'var(--green)' : 'var(--red)', marginBottom:14 }}>
            {parseFloat(value) > currentValue ? '▲' : '▼'} {Math.abs(parseFloat(value) - currentValue).toFixed(1)} {unit} from current
          </div>
        )}
        <button className="btn btn-primary btn-full" onClick={save} disabled={!value || parseFloat(value) <= 0}>
          <IconCheck /> Save Update
        </button>
      </div>
    </div>
  )
}

// ── Measurement history mini-chart ────────────────────────────────────────────
function HistorySparkline({ history, metric, color = 'var(--green)' }) {
  const recs = history.filter(r => r.metric === metric).sort((a,b) => a.date.localeCompare(b.date))
  if (recs.length < 2) return null
  const data = recs.map(r => ({ date: r.date.slice(5), v: r.value }))
  const min = Math.min(...data.map(d => d.v)) * 0.98
  const max = Math.max(...data.map(d => d.v)) * 1.02
  const first = recs[0].value, last = recs[recs.length-1].value
  const diff = +(last - first).toFixed(1)
  return (
    <div style={{ marginTop:6 }}>
      <ResponsiveContainer width="100%" height={60}>
        <LineChart data={data} margin={{ top:4, right:4, bottom:0, left:0 }}>
          <YAxis domain={[min,max]} hide />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length
                ? <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 8px', fontSize:'0.75rem' }}>{payload[0].payload.date}: {payload[0].value}</div>
                : null
            }
          />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ fontSize:'0.7rem', color: diff >= 0 ? 'var(--green)' : 'var(--red)', marginTop:2 }}>
        {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)} since start · {recs.length} entries
      </div>
    </div>
  )
}

// ── Insights / analytics tab ──────────────────────────────────────────────────
function InsightsTab({ sessions, profile, measurementHistory }) {
  const tracked = topTrackedExercises(sessions, 6)
  const [exId, setExId] = useState(tracked[0]?.id || null)
  const trend = exId ? e1rmTrend(sessions, exId) : []
  const plateau = exId ? detectPlateau(sessions, exId) : null
  const projection = projectStrength(trend)
  const volSeries = weeklyVolumeSeries(sessions).slice(-10)
  const bw = bestWorstWeeks(sessions)
  const gain = gainRate(measurementHistory, profile.unit)

  if (sessions.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
      Log a few workouts to unlock strength trends, plateau alerts and projections.
    </div>
  }

  return (
    <>
      {/* Strength trend */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 10 }}>Estimated 1RM Trend</h3>
        {tracked.length > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 6 }}>
            {tracked.map(t => (
              <button key={t.id} onClick={() => setExId(t.id)} style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 999, border: `1px solid ${exId === t.id ? 'var(--green)' : 'var(--border)'}`, background: exId === t.id ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: exId === t.id ? 'var(--green)' : 'var(--text2)', fontSize: '0.7rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.name}
              </button>
            ))}
          </div>
        )}
        {trend.length >= 2 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg4)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false} domain={['auto','auto']} />
              <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem' }} />
              <Line type="monotone" dataKey="e1rm" stroke="var(--green)" strokeWidth={2} dot={{ r: 3, fill: 'var(--green)' }} name="Est. 1RM" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ color: 'var(--text3)', fontSize: '0.8125rem', padding: 16, textAlign: 'center' }}>Log this lift twice to see a trend.</div>
        )}

        {projection && projection.trending === 'up' && (
          <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--green)', background: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: '8px 12px' }}>
            📈 Trending +{projection.perWeek}{profile.unit}/wk — on pace for ~<strong>{projection.projected}{profile.unit}</strong> in {projection.weeksAhead} weeks.
          </div>
        )}
        {plateau && (
          <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: '8px 12px' }}>
            ⚠️ Plateau: stalled near {plateau.stalledAt}{profile.unit} for ~{plateau.weeks} weeks. {plateau.suggestion}
          </div>
        )}
      </div>

      {/* Rate of gain */}
      {gain && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 10 }}>Bodyweight Rate of Change</h3>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-around', textAlign: 'center' }}>
            <div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: gain.perWeek >= 0 ? 'var(--green)' : 'var(--red)' }}>{gain.perWeek > 0 ? '+' : ''}{gain.perWeek}</div><div style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>{profile.unit}/WEEK</div></div>
            <div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{gain.totalChange > 0 ? '+' : ''}{gain.totalChange}</div><div style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>TOTAL {profile.unit}</div></div>
            <div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{gain.weeks}</div><div style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>WEEKS</div></div>
          </div>
        </div>
      )}

      {/* Weekly volume + best/worst */}
      {volSeries.length >= 2 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 10 }}>Weekly Volume</h3>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={volSeries} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg4)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem' }} />
              <Line type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="Volume (kg)" />
            </LineChart>
          </ResponsiveContainer>
          {bw && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: '0.75rem' }}>
              <span style={{ flex: 1, background: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: '6px 8px', color: 'var(--green)' }}>🔥 Best: wk {bw.best.label} ({(bw.best.volume/1000).toFixed(1)}k)</span>
              <span style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '6px 8px', color: 'var(--text3)' }}>Low: wk {bw.worst.label} ({(bw.worst.volume/1000).toFixed(1)}k)</span>
            </div>
          )}
        </div>
      )}
    </>
  )
}

const CALORIC_MODES = [
  { id: 'aggressive_bulk', label: 'Aggressive Bulk', emoji: '🔥', desc: '+500 kcal surplus', mult: 1.4 },
  { id: 'lean_bulk',       label: 'Lean Bulk',       emoji: '💪', desc: '+200 kcal surplus', mult: 1.0 },
  { id: 'maintenance',     label: 'Maintenance',     emoji: '⚖️', desc: 'Recomp',            mult: 0.6 },
  { id: 'cut',             label: 'Cut',             emoji: '🎯', desc: '−400 kcal deficit', mult: 0.3 },
]

export default function Progress() {
  const { profile, setProfile, checkins, addCheckin, sessions, measurementHistory, addMeasurementEntry } = useStore()
  const [tab, setTab] = useState('body') // body | lifts | composition
  const [showCheckin, setShowCheckin] = useState(false)
  const [editing, setEditing] = useState(null) // { metric, label, currentValue, unit, type }

  const handleSaveEdit = (metric, newValue) => {
    const today = new Date().toISOString().slice(0,10)
    const unit  = profile.unit === 'kg' ? (editing.type === 'body' ? 'cm' : 'kg') : (editing.type === 'body' ? 'in' : 'lbs')
    // Log to history
    addMeasurementEntry({ id: uuidv4(), date: today, metric, value: newValue, unit })
    // Update profile
    if (metric === 'bodyweight') {
      setProfile({ ...profile, bodyweight: newValue })
    } else if (editing.type === 'body') {
      setProfile({ ...profile, measurements: { ...(profile.measurements || {}), [metric]: newValue } })
    } else if (editing.type === 'lift') {
      setProfile({ ...profile, liftMaxes: { ...(profile.liftMaxes || {}), [metric]: newValue } })
    }
  }

  if (!profile) return <EmptyState />
  const currentWeek = getCurrentWeek(profile.startDate)

  // Build chart data
  const chartData = profile.milestones?.map(m => {
    const checkin = checkins.find(c => c.week === m.week)
    return {
      week: m.week,
      targetBW: m.bodyweight,
      actualBW: checkin?.bodyweight || null,
      ...Object.fromEntries(Object.keys(MEASURE_LABELS).flatMap(k => [
        [`target_${k}`, m.measurements?.[k]],
        [`actual_${k}`, checkin?.measurements?.[k] || null]
      ])),
      ...Object.fromEntries(Object.keys(LIFT_LABELS).flatMap(k => [
        [`target_${k}`, m.liftMaxes?.[k]],
        [`actual_${k}`, checkin?.liftMaxes?.[k] || null]
      ])),
    }
  }) || []

  const latestCheckin = checkins.length > 0 ? checkins[checkins.length - 1] : null
  const streak = calcStreak(sessions)

  // Flags
  const flags = []
  if (latestCheckin) {
    const m = profile.milestones?.find(mi => mi.week === latestCheckin.week)
    if (m) {
      Object.entries(LIFT_LABELS).forEach(([k, label]) => {
        const st = getProgressStatus(latestCheckin.liftMaxes?.[k], m.liftMaxes?.[k])
        if (st === 'behind') flags.push({ metric: `${label} 1RM`, status: 'behind' })
      })
    }
  }

  // Genetic ceiling
  const bw_kg    = profile.unit === 'kg' ? profile.bodyweight : profile.bodyweight / 2.2046
  const ht_cm    = profile.unit === 'kg' ? profile.height    : profile.height * 2.54
  const wrist_cm = profile.wrist  > 0 ? (profile.unit === 'kg' ? profile.wrist  : profile.wrist  * 2.54) : 17
  const ankle_cm = profile.ankle  > 0 ? (profile.unit === 'kg' ? profile.ankle  : profile.ankle  * 2.54) : 22
  const neck_cm  = profile.neck   > 0 ? (profile.unit === 'kg' ? profile.neck   : profile.neck   * 2.54) : 38

  let bf_pct = 18
  try {
    const waist_cm = profile.unit === 'kg' ? (profile.measurements?.waist || 0) : (profile.measurements?.waist || 0) * 2.54
    if (neck_cm > 0 && ht_cm > 0 && waist_cm > 0)
      bf_pct = navyBF(waist_cm, neck_cm, ht_cm, profile.gender || 'male', 0)
  } catch {}
  const { lbm: currentLBM } = lbmAndFat(bw_kg, bf_pct)
  const { maxLBM_kg }       = caseyButtCeiling(ht_cm, wrist_cm, ankle_cm, 0.05)
  const ceilingPct          = Math.min(100, Math.round(currentLBM / maxLBM_kg * 100))
  const remainingKg         = +(maxLBM_kg - currentLBM).toFixed(1)

  // Body composition chart data from check-ins
  const compChartData = checkins.map(ci => {
    const bwKg = ci.bodyweight
      ? (profile.unit === 'kg' ? ci.bodyweight : ci.bodyweight / 2.2046)
      : bw_kg
    const waistCI = ci.measurements?.waist
      ? (profile.unit === 'kg' ? ci.measurements.waist : ci.measurements.waist * 2.54)
      : 0
    let bfEst = bf_pct
    try {
      if (waistCI > 0 && neck_cm > 0 && ht_cm > 0)
        bfEst = navyBF(waistCI, neck_cm, ht_cm, profile.gender || 'male', 0)
    } catch {}
    const { lbm, fat } = lbmAndFat(bwKg, bfEst)
    return { week: ci.week, lbm: +lbm.toFixed(1), fat: +fat.toFixed(1) }
  })

  const trainingLevel = detectTrainingLevel(profile.liftMaxes, bw_kg)
  const levelMeta     = TRAINING_LEVEL_META[trainingLevel]
  const caloricMode   = profile.caloricMode || 'lean_bulk'
  const caloricMeta   = CALORIC_MODES.find(c => c.id === caloricMode) || CALORIC_MODES[1]

  const setCaloricMode = (id) => setProfile({ ...profile, caloricMode: id })

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Progress</h1>
            <p>Week {currentWeek} of {profile.targetWeeks}</p>
          </div>
          <button className="btn btn-primary" style={{ padding: '10px 16px', fontSize: '0.875rem' }} onClick={() => setShowCheckin(true)}>
            <IconPlus /> Check In
          </button>
        </div>
      </div>

      {/* Training level banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: `${levelMeta.color}14`,
        border: `1px solid ${levelMeta.color}44`,
        borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16,
      }}>
        <div style={{
          background: levelMeta.color, color: '#000', fontWeight: 800,
          fontSize: '0.6875rem', padding: '3px 10px', borderRadius: 999,
          letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0,
        }}>{levelMeta.label}</div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.5 }}>{levelMeta.note}</div>
      </div>

      {/* Streak stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Current Streak', value: streak.current === 0 ? '—' : `${streak.current}d`, sub: streak.current > 0 ? '🔥 keep it up' : 'Start today', color: streak.current >= 7 ? 'var(--green)' : streak.current >= 3 ? '#f59e0b' : 'var(--text)' },
          { label: 'This Week', value: streak.thisWeek, sub: 'sessions', color: 'var(--text)' },
          { label: '30-Day Avg', value: streak.avg30, sub: 'per week', color: 'var(--text)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {showCheckin && (
        <CheckInModal profile={profile} currentWeek={currentWeek} onSave={addCheckin} onClose={() => setShowCheckin(false)} />
      )}
      {editing && (
        <EditMeasurementModal
          metric={editing.metric}
          label={editing.label}
          currentValue={editing.currentValue}
          unit={editing.unit}
          onSave={handleSaveEdit}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Timeline progress bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 8 }}>
          <span style={{ color: 'var(--text2)' }}>Program Progress</span>
          <span style={{ fontWeight: 600 }}>{Math.round(currentWeek / profile.targetWeeks * 100)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${Math.min(100, currentWeek / profile.targetWeeks * 100)}%`, background: 'var(--green)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text3)', marginTop: 6 }}>
          <span>Week {currentWeek}</span><span>Week {profile.targetWeeks}</span>
        </div>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {flags.slice(0,3).map((f, i) => (
            <div key={i} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconArrowDown style={{ color: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', flex: 1 }}>{f.metric} is behind target — consider increasing volume or frequency.</span>
            </div>
          ))}
        </div>
      )}

      {/* Genetic ceiling */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Natural Muscle Ceiling</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginTop: 2 }}>Casey Butt genetic potential estimate</div>
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.125rem', color: ceilingPct >= 90 ? '#f59e0b' : 'var(--green)' }}>{ceilingPct}%</span>
        </div>
        <div className="progress-bar" style={{ marginBottom: 8 }}>
          <div className="progress-bar-fill" style={{ width: `${ceilingPct}%`, background: ceilingPct >= 90 ? '#f59e0b' : 'var(--green)', transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>
          {remainingKg > 0
            ? `~${remainingKg}kg of lean mass remaining before genetic ceiling`
            : 'You\'re at or beyond your estimated natural potential 🏆'}
        </div>
      </div>

      {/* Caloric mode */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Caloric Strategy</div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: 12 }}>Affects milestone prediction speed</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {CALORIC_MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setCaloricMode(m.id)}
              style={{
                flexShrink: 0,
                padding: '8px 14px',
                borderRadius: 999,
                border: `1.5px solid ${caloricMode === m.id ? 'var(--green)' : 'var(--border)'}`,
                background: caloricMode === m.id ? 'rgba(34,197,94,0.12)' : 'var(--bg3)',
                color: caloricMode === m.id ? 'var(--green)' : 'var(--text2)',
                fontWeight: caloricMode === m.id ? 700 : 400,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {m.emoji} {m.label}
              <div style={{ fontSize: '0.6875rem', opacity: 0.75, marginTop: 1 }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 999, padding: 3, marginBottom: 20, gap: 2 }}>
        {[['body', 'Body'], ['lifts', 'Lifts'], ['composition', 'Comp'], ['insights', '📊 Insights']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: '8px 4px', borderRadius: 999, border: 'none', cursor: 'pointer', background: tab === id ? 'var(--bg2)' : 'transparent', color: tab === id ? 'var(--text)' : 'var(--text3)', fontWeight: tab === id ? 600 : 400, fontSize: '0.8125rem', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'insights' && <InsightsTab sessions={sessions} profile={profile} measurementHistory={measurementHistory} />}

      {tab === 'body' && (
        <>
          {/* Bodyweight */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3>Bodyweight</h3>
              <button
                onClick={() => setEditing({ metric:'bodyweight', label:'Bodyweight', currentValue: profile.bodyweight, unit: profile.unit, type:'bw' })}
                style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 10px', fontSize:'0.75rem', color:'var(--text2)', cursor:'pointer' }}
              >✏️ Edit</button>
            </div>
            <MetricChart data={chartData} dataKey="actualBW" targetKey="targetBW" label="Bodyweight" unit={profile.unit} />
            <HistorySparkline history={measurementHistory} metric="bodyweight" />
          </div>

          {Object.entries(MEASURE_LABELS).map(([k, label]) => (
            <div key={k} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <h3>{label}</h3>
                <button
                  onClick={() => setEditing({ metric:k, label, currentValue: profile.measurements?.[k] || 0, unit: profile.unit === 'kg' ? 'cm' : 'in', type:'body' })}
                  style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 10px', fontSize:'0.75rem', color:'var(--text2)', cursor:'pointer' }}
                >✏️ Edit</button>
              </div>
              <MetricChart data={chartData} dataKey={`actual_${k}`} targetKey={`target_${k}`} label={label} color="#3b82f6" />
              <HistorySparkline history={measurementHistory} metric={k} color="#3b82f6" />
            </div>
          ))}
        </>
      )}

      {tab === 'lifts' && (
        <>
          {Object.entries(LIFT_LABELS).map(([k, label]) => {
            const latest = latestCheckin?.liftMaxes?.[k]
            const current = profile.milestones?.find(m => m.week === currentWeek)?.liftMaxes?.[k]
            const status = latest && current ? getProgressStatus(latest, current) : null
            const badge = status ? getStatusLabel(status) : null
            return (
              <div key={k} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3>{label}</h3>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {badge && <span className={`badge ${badge.cls}`}>{badge.label}</span>}
                    <button
                      onClick={() => setEditing({ metric:k, label, currentValue: profile.liftMaxes?.[k] || 0, unit: profile.unit, type:'lift' })}
                      style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 10px', fontSize:'0.75rem', color:'var(--text2)', cursor:'pointer' }}
                    >✏️ Edit</button>
                  </div>
                </div>
                <MetricChart data={chartData} dataKey={`actual_${k}`} targetKey={`target_${k}`} label={label} color="#a78bfa" unit={profile.unit} />
                <HistorySparkline history={measurementHistory} metric={k} color="#a78bfa" />
              </div>
            )
          })}
        </>
      )}

      {tab === 'composition' && (
        <>
          {/* LBM vs Fat chart */}
          {compChartData.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📉</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No composition data yet</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>
                Log a check-in with bodyweight + waist to track lean mass vs fat over time.
              </div>
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 4 }}>Lean Mass vs Fat Mass</h3>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: 16 }}>Estimated from Navy BF% formula (waist + neck + height)</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={compChartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg4)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text3)' }} tickLine={false} axisLine={false} label={{ value: 'Week', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--text3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="lbm" stroke="var(--green)" strokeWidth={2.5} dot={{ fill: 'var(--green)', r: 3 }} name="LBM" connectNulls />
                  <Line type="monotone" dataKey="fat" stroke="#f87171" strokeWidth={2} dot={{ fill: '#f87171', r: 3 }} name="Fat" connectNulls />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--green)', fontWeight: 600 }}>● LBM</span>
                <span style={{ fontSize: '0.8125rem', color: '#f87171', fontWeight: 600 }}>● Fat</span>
              </div>
              {/* Latest snapshot */}
              {compChartData.length > 0 && (() => {
                const last = compChartData[compChartData.length - 1]
                const total = last.lbm + last.fat
                const bfPct = total > 0 ? ((last.fat / total) * 100).toFixed(1) : '—'
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 16 }}>
                    {[
                      { label: 'Lean Mass', value: `${last.lbm}kg`, color: 'var(--green)' },
                      { label: 'Fat Mass',  value: `${last.fat}kg`, color: '#f87171' },
                      { label: 'Body Fat',  value: `${bfPct}%`,     color: 'var(--text)' },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '10px 8px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.125rem', color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text3)', marginTop: 2, textTransform: 'uppercase' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Milestone timeline */}
          <div style={{ marginTop: 8 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Milestone Timeline</div>
            {profile.milestones?.map(m => {
              const checkin = checkins.find(c => c.week === m.week)
              const isPast = m.week <= currentWeek
              const isCurrent = m.week === currentWeek
              return (
                <div key={m.week} style={{ display: 'flex', gap: 12, marginBottom: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${isCurrent ? 'var(--green)' : isPast && checkin ? 'var(--green)' : 'var(--border)'}`, background: isCurrent ? 'var(--green)' : isPast && checkin ? 'rgba(34,197,94,0.2)' : 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {checkin && <IconCheck />}
                    </div>
                    {m.week < profile.targetWeeks && <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 20 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Week {m.week}</span>
                      {isCurrent && <span className="badge badge-green">Current</span>}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>
                      BW: {m.bodyweight}{profile.unit} · Squat: {m.liftMaxes?.squat}{profile.unit} · Bench: {m.liftMaxes?.bench}{profile.unit}
                    </div>
                    {checkin && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--green)', marginTop: 4 }}>
                        ✓ Logged: BW {checkin.bodyweight || '?'}{profile.unit} · Squat {checkin.liftMaxes?.squat || '?'}{profile.unit}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', gap: 12 }}>
      <div style={{ fontSize: 48 }}>📊</div>
      <h2>No Profile Yet</h2>
      <p style={{ color: 'var(--text2)' }}>Complete the onboarding to track progress.</p>
    </div>
  )
}
