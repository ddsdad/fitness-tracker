import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore.js'
import { MUSCLE_GROUPS, PHYSIQUE_GOALS, GOAL_MUSCLE_WEIGHTS } from '../../data/muscles.js'
import { IconCheck } from '../shared/Icons.jsx'

export default function Goals() {
  const { profile, setProfile, goals, setGoals } = useStore()
  const [activeGoal, setActiveGoal] = useState(profile?.physiqueGoal || 'overall_size')
  const [weights, setWeights] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const base = GOAL_MUSCLE_WEIGHTS[activeGoal] || GOAL_MUSCLE_WEIGHTS.overall_size
    const custom = Object.keys(goals).length > 0 ? goals : null
    setWeights(custom || { ...base })
  }, [activeGoal, goals])

  const handleGoalChange = (goalId) => {
    setActiveGoal(goalId)
    setWeights({ ...GOAL_MUSCLE_WEIGHTS[goalId] })
  }

  const handleSlider = (muscle, val) => {
    setWeights(w => ({ ...w, [muscle]: parseFloat(val) }))
  }

  const handleSave = () => {
    setGoals(weights)
    if (profile && profile.physiqueGoal !== activeGoal) {
      setProfile({ ...profile, physiqueGoal: activeGoal })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    const base = GOAL_MUSCLE_WEIGHTS[activeGoal] || GOAL_MUSCLE_WEIGHTS.overall_size
    setWeights({ ...base })
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Physique Goals</h1>
        <p>Customize your target muscle priorities.</p>
      </div>

      {/* Goal presets */}
      <div className="section">
        <div className="section-title">Goal Preset</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {PHYSIQUE_GOALS.map(g => (
            <button
              key={g.id}
              onClick={() => handleGoalChange(g.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '14px 10px', borderRadius: 'var(--radius-sm)',
                background: activeGoal === g.id ? 'rgba(34,197,94,0.1)' : 'var(--bg2)',
                border: `1px solid ${activeGoal === g.id ? 'var(--green)' : 'var(--border)'}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 24 }}>{g.icon}</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: activeGoal === g.id ? 'var(--green)' : 'var(--text)' }}>{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* Fine-tune sliders */}
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="section-title" style={{ margin: 0 }}>Fine-Tune Volume Priority</div>
          <button className="btn btn-ghost" style={{ fontSize: '0.8125rem', padding: '4px 10px' }} onClick={handleReset}>Reset</button>
        </div>
        <p style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: 20 }}>
          Adjust how much each muscle group is prioritized in heatmap thresholds and recommendations.
        </p>

        {/* Front muscles */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Front Body</div>
          {Object.entries(MUSCLE_GROUPS).filter(([, m]) => m.side === 'front').map(([key, meta]) => (
            <MuscleSlider key={key} muscle={key} label={meta.label} value={weights[key] || 1} onChange={v => handleSlider(key, v)} />
          ))}
        </div>

        {/* Back muscles */}
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Back Body</div>
          {Object.entries(MUSCLE_GROUPS).filter(([, m]) => m.side === 'back').map(([key, meta]) => (
            <MuscleSlider key={key} muscle={key} label={meta.label} value={weights[key] || 1} onChange={v => handleSlider(key, v)} />
          ))}
        </div>
      </div>

      <button className="btn btn-primary btn-full" style={{ marginBottom: 24 }} onClick={handleSave}>
        {saved ? <><IconCheck /> Saved!</> : 'Save Goal Settings'}
      </button>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.6 }}>
        These settings affect the muscle heatmap color thresholds and workout recommendations. A higher priority raises the "optimal" range for that muscle group, pushing more volume toward it.
      </div>
    </div>
  )
}

function MuscleSlider({ muscle, label, value, onChange }) {
  const pct = Math.round((value / 2) * 100)
  const barColor = value >= 1.5 ? 'var(--green)' : value >= 1.0 ? 'var(--blue)' : value >= 0.6 ? 'var(--yellow)' : 'var(--red)'

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ marginBottom: 0, color: 'var(--text)' }}>{label}</label>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: barColor }}>
          {value < 0.6 ? 'Low' : value < 1.0 ? 'Below avg' : value < 1.4 ? 'Average' : value < 1.7 ? 'High' : 'Max'}
        </span>
      </div>
      <input
        type="range"
        min="0.3"
        max="2"
        step="0.1"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ '--progress': `${pct}%` }}
      />
    </div>
  )
}
