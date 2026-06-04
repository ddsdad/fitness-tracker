import { useState } from 'react'
import { IconCheck } from '../shared/Icons.jsx'

const MEASURE_LABELS = { chest: 'Chest', waist: 'Waist', hips: 'Hips', arms: 'Arms', shoulders: 'Shoulders', thighs: 'Thighs', calves: 'Calves' }
const LIFT_LABELS    = { squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift', row: 'Row', ohp: 'OHP' }

export default function CheckInModal({ profile, currentWeek, onSave, onClose }) {
  const milestone = profile.milestones?.find(m => m.week === currentWeek) || {}
  const [bw, setBw] = useState('')
  const [measures, setMeasures] = useState({})
  const [lifts, setLifts] = useState({})

  const save = () => {
    onSave({
      week: currentWeek,
      date: new Date().toISOString(),
      bodyweight: parseFloat(bw) || null,
      measurements: Object.fromEntries(Object.entries(measures).map(([k, v]) => [k, parseFloat(v) || null])),
      liftMaxes:    Object.fromEntries(Object.entries(lifts).map(([k, v]) => [k, parseFloat(v) || null])),
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
            <input className="input" type="number" inputMode="decimal" value={measures[k] || ''} onChange={e => setMeasures(p => ({ ...p, [k]: e.target.value }))} />
          </div>
        ))}

        <div className="section-title" style={{ marginTop: 20 }}>Lift Maxes (1RM)</div>
        {Object.keys(LIFT_LABELS).map(k => (
          <div key={k} style={{ marginBottom: 14 }}>
            <label>{LIFT_LABELS[k]} (target: {milestone.liftMaxes?.[k]} {profile.unit})</label>
            <input className="input" type="number" inputMode="decimal" value={lifts[k] || ''} onChange={e => setLifts(p => ({ ...p, [k]: e.target.value }))} />
          </div>
        ))}

        <button className="btn btn-primary btn-full" style={{ marginTop: 24 }} onClick={save}><IconCheck /> Save Check-In</button>
      </div>
    </div>
  )
}
