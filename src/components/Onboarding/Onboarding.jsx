import { useState } from 'react'
import { sanitize } from '../../utils/sanitize.js'
import { generateMilestones } from '../../utils/milestones.js'
import { PHYSIQUE_GOALS, GOAL_MUSCLE_WEIGHTS } from '../../data/muscles.js'
import { IconChevronRight, IconChevronLeft, IconCheck } from '../shared/Icons.jsx'
import { ACTIVITY_MULTIPLIERS } from '../../utils/calculations.js'

const STEPS = ['Welcome', 'Body Stats', 'Frame & Key', 'Measurements', 'Segments', 'Lift Maxes', 'Your Goal', 'Timeline']

const initialState = {
  name: '', age: '', gender: 'male', activityLevel: 'moderate', unit: 'kg',
  bodyweight: '', height: '',
  // Frame / key measurements
  wrist: '', ankle: '', neck: '',
  // Body measurements
  measurements: { chest: '', waist: '', hips: '', arms: '', shoulders: '', thighs: '', calves: '' },
  // Segment lengths (optional but improves 3D / leverage calc)
  segments: { torsoLength: '', armLength: '', femurLength: '', shinLength: '' },
  liftMaxes: { squat: '', bench: '', deadlift: '', row: '', ohp: '' },
  physiqueGoal: 'overall_size',
  targetWeeks: 12,
}

function parseF(v) { return parseFloat(v) || 0 }

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState(initialState)

  const update = (key, val) => setData(d => ({ ...d, [key]: val }))
  const updateMeasure  = (key, val) => setData(d => ({ ...d, measurements: { ...d.measurements, [key]: val } }))
  const updateSegment  = (key, val) => setData(d => ({ ...d, segments: { ...d.segments, [key]: val } }))
  const updateLift     = (key, val) => setData(d => ({ ...d, liftMaxes: { ...d.liftMaxes, [key]: val } }))

  const canNext = () => {
    if (step === 1) return data.bodyweight && data.height && data.age
    if (step === 6) return data.physiqueGoal
    return true
  }

  const handleComplete = () => {
    const bw = parseF(data.bodyweight)
    const ht = parseF(data.height)
    const profile = {
      ...data,
      name:       sanitize(data.name),
      age:        parseInt(data.age) || 25,
      bodyweight: bw,
      height:     ht,
      wrist:      parseF(data.wrist),
      ankle:      parseF(data.ankle),
      neck:       parseF(data.neck),
      measurements: Object.fromEntries(Object.entries(data.measurements).map(([k,v]) => [k, parseF(v)])),
      segments:     Object.fromEntries(Object.entries(data.segments).map(([k,v]) => [k, parseF(v)])),
      liftMaxes:    Object.fromEntries(Object.entries(data.liftMaxes).map(([k,v]) => [k, parseF(v)])),
      startDate: new Date().toISOString(),
      muscleGoalWeights: { ...GOAL_MUSCLE_WEIGHTS[data.physiqueGoal] },
    }
    profile.milestones = generateMilestones(profile)
    onComplete(profile)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 3, background: 'var(--bg3)' }}>
        <div style={{ height: '100%', width: `${(step / (STEPS.length - 1)) * 100}%`, background: 'var(--green)', transition: 'width 0.3s ease' }} />
      </div>

      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        {step > 0 && (
          <button className="btn btn-ghost" style={{ padding: '8px', borderRadius: 8 }} onClick={() => setStep(s => s - 1)}>
            <IconChevronLeft />
          </button>
        )}
        <span style={{ color: 'var(--text3)', fontSize: '0.8125rem' }}>Step {step + 1} of {STEPS.length}</span>
      </div>

      <div style={{ flex: 1, padding: '24px 20px', overflowY: 'auto' }} className="fade-in">
        {step === 0 && <WelcomeStep data={data} update={update} />}
        {step === 1 && <BodyStatsStep data={data} update={update} />}
        {step === 2 && <FrameStep data={data} update={update} />}
        {step === 3 && <MeasurementsStep data={data} update={updateMeasure} />}
        {step === 4 && <SegmentsStep data={data} update={updateSegment} />}
        {step === 5 && <LiftMaxesStep data={data} update={updateLift} />}
        {step === 6 && <GoalStep data={data} update={update} />}
        {step === 7 && <TimelineStep data={data} update={update} />}
      </div>

      <div style={{ padding: '16px 20px 32px' }}>
        {step < STEPS.length - 1 ? (
          <button className="btn btn-primary btn-full" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
            Continue <IconChevronRight />
          </button>
        ) : (
          <button className="btn btn-primary btn-full" onClick={handleComplete}>
            Start Tracking <IconCheck />
          </button>
        )}
      </div>
    </div>
  )
}

function WelcomeStep({ data, update }) {
  return (
    <div>
      <div style={{ marginBottom: 32, marginTop: 16 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>💪</div>
        <h1>Welcome to<br />FitTrack</h1>
        <p style={{ color: 'var(--text2)', marginTop: 12, fontSize: '1rem' }}>
          The more data you enter, the more accurate every projection becomes — including your genetic ceiling, structural risk score, ideal proportions, and personalised weekly targets.
        </p>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>Your name (optional)</label>
        <input className="input" placeholder="e.g. Alex" value={data.name} onChange={e => update('name', e.target.value)} />
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        {['kg', 'lbs'].map(u => (
          <button key={u} className={`chip${data.unit === u ? ' active' : ''}`} onClick={() => update('unit', u)} style={{ flex: 1, textAlign: 'center' }}>
            {u === 'kg' ? '🌍 Metric (kg/cm)' : '🇺🇸 Imperial (lbs/in)'}
          </button>
        ))}
      </div>
    </div>
  )
}

function BodyStatsStep({ data, update }) {
  const bwU = data.unit
  const htU = data.unit === 'kg' ? 'cm' : 'in'
  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>Body Stats</h2>
      <p style={{ color: 'var(--text2)', marginBottom: 24, fontSize: '0.9375rem' }}>Used for BF%, FFMI, BMR, and personalised targets.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="grid-2">
          <div>
            <label>Age *</label>
            <input className="input" type="number" inputMode="numeric" placeholder="25" value={data.age} onChange={e => update('age', e.target.value)} />
          </div>
          <div>
            <label>Gender</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              {['male','female'].map(g => (
                <button key={g} className={`chip${data.gender === g ? ' active' : ''}`} style={{ flex: 1 }} onClick={() => update('gender', g)}>
                  {g === 'male' ? '♂ Male' : '♀ Female'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label>Bodyweight *</label>
          <div className="input-unit">
            <input className="input" type="number" inputMode="decimal" placeholder={bwU === 'kg' ? '80' : '176'} value={data.bodyweight} onChange={e => update('bodyweight', e.target.value)} />
            <span>{bwU}</span>
          </div>
        </div>
        <div>
          <label>Height *</label>
          <div className="input-unit">
            <input className="input" type="number" inputMode="decimal" placeholder={htU === 'cm' ? '178' : '70'} value={data.height} onChange={e => update('height', e.target.value)} />
            <span>{htU}</span>
          </div>
        </div>
        <div>
          <label>Activity Level</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {Object.entries(ACTIVITY_MULTIPLIERS).map(([key, { label }]) => (
              <button key={key} onClick={() => update('activityLevel', key)}
                style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: `1px solid ${data.activityLevel === key ? 'var(--green)' : 'var(--border)'}`, background: data.activityLevel === key ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: data.activityLevel === key ? 'var(--green)' : 'var(--text2)', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FrameStep({ data, update }) {
  const u = data.unit === 'kg' ? 'cm' : 'in'
  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>Frame Measurements</h2>
      <p style={{ color: 'var(--text2)', marginBottom: 8, fontSize: '0.9375rem' }}>
        All optional — skip if you don't have a tape measure handy. You can add these later in Settings.
      </p>
      <div style={{ marginBottom: 20, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-sm)', padding: 12, fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.6 }}>
        These unlock: genetic ceiling (max LBM), ideal proportions, and Navy BF% (neck + waist). Wrist and ankle don't change over time — measure once.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { key: 'wrist', label: 'Wrist Circumference', hint: 'Smallest point', placeholder: u === 'cm' ? '17' : '6.7' },
          { key: 'ankle', label: 'Ankle Circumference', hint: 'Smallest point', placeholder: u === 'cm' ? '22' : '8.7' },
          { key: 'neck',  label: 'Neck Circumference',  hint: "Just below Adam's apple", placeholder: u === 'cm' ? '38' : '15' },
        ].map(f => (
          <div key={f.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ margin: 0 }}>{f.label} <span style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>— {f.hint}</span></label>
              <span style={{ fontSize: '0.7rem', color: 'var(--text3)', fontStyle: 'italic' }}>optional</span>
            </div>
            <div className="input-unit">
              <input className="input" type="number" inputMode="decimal" placeholder={f.placeholder} value={data[f.key]} onChange={e => update(f.key, e.target.value)} />
              <span>{u}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MeasurementsStep({ data, update }) {
  const u = data.unit === 'kg' ? 'cm' : 'in'
  const fields = [
    { key: 'chest',     label: 'Chest',          hint: 'At nipple line, relaxed',   placeholder: u === 'cm' ? '100' : '39' },
    { key: 'shoulders', label: 'Shoulders',       hint: 'Circumference at widest',   placeholder: u === 'cm' ? '120' : '47' },
    { key: 'waist',     label: 'Waist',           hint: 'At navel',                  placeholder: u === 'cm' ? '80' : '31' },
    { key: 'hips',      label: 'Hips',            hint: 'Widest point',              placeholder: u === 'cm' ? '95' : '37' },
    { key: 'arms',      label: 'Arms (flexed)',   hint: 'Peak of bicep, flexed',     placeholder: u === 'cm' ? '38' : '15' },
    { key: 'thighs',    label: 'Thighs',          hint: 'Midpoint, relaxed',         placeholder: u === 'cm' ? '58' : '23' },
    { key: 'calves',    label: 'Calves',          hint: 'Widest point',              placeholder: u === 'cm' ? '38' : '15' },
  ]
  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>Body Measurements</h2>
      <p style={{ color: 'var(--text2)', marginBottom: 24, fontSize: '0.9375rem' }}>
        Enables Steve Reeves ideal-ratio comparison, shoulder-to-waist ratio, structural weakness detection, and per-muscle growth projections.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {fields.map(f => (
          <div key={f.key}>
            <label>{f.label} <span style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>— {f.hint}</span></label>
            <div className="input-unit">
              <input className="input" type="number" inputMode="decimal" placeholder={f.placeholder} value={data.measurements[f.key]} onChange={e => update(f.key, e.target.value)} />
              <span>{u}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SegmentsStep({ data, update }) {
  const u = data.unit === 'kg' ? 'cm' : 'in'
  const fields = [
    { key: 'torsoLength', label: 'Torso Length',  hint: 'Top of shoulder to hip bone', placeholder: u === 'cm' ? '60' : '24' },
    { key: 'armLength',   label: 'Arm Length',    hint: 'Shoulder to wrist',           placeholder: u === 'cm' ? '65' : '26' },
    { key: 'femurLength', label: 'Femur Length',  hint: 'Hip bone to knee',            placeholder: u === 'cm' ? '45' : '18' },
    { key: 'shinLength',  label: 'Shin Length',   hint: 'Knee to ankle',               placeholder: u === 'cm' ? '42' : '17' },
  ]
  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>Segment Lengths</h2>
      <p style={{ color: 'var(--text2)', marginBottom: 8, fontSize: '0.9375rem' }}>
        Optional — unlocks leverage analysis and personalised exercise selection.
      </p>
      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 20, fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.6 }}>
        Long femurs → better deadlift leverages, harder squats → app recommends trap bar / sumo. Long arms → worse bench mechanics → app suggests dumbbells or closer grip.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {fields.map(f => (
          <div key={f.key}>
            <label>{f.label} <span style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>— {f.hint}</span></label>
            <div className="input-unit">
              <input className="input" type="number" inputMode="decimal" placeholder={f.placeholder} value={data.segments[f.key]} onChange={e => update(f.key, e.target.value)} />
              <span>{u}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-full" style={{ marginTop: 16, color: 'var(--text3)' }} onClick={() => {}}>
        Skip — I'll add these later
      </button>
    </div>
  )
}

function LiftMaxesStep({ data, update }) {
  const u = data.unit
  const lifts = [
    { key: 'squat',    label: '🏋️ Back Squat (1RM)',      placeholder: u === 'kg' ? '100' : '220' },
    { key: 'bench',    label: '🪑 Bench Press (1RM)',      placeholder: u === 'kg' ? '80'  : '176' },
    { key: 'deadlift', label: '⚡ Deadlift (1RM)',         placeholder: u === 'kg' ? '120' : '264' },
    { key: 'row',      label: '🚣 Barbell Row (1RM)',      placeholder: u === 'kg' ? '80'  : '176' },
    { key: 'ohp',      label: '🔼 Overhead Press (1RM)',   placeholder: u === 'kg' ? '60'  : '132' },
  ]
  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>Lift Maxes</h2>
      <p style={{ color: 'var(--text2)', marginBottom: 8, fontSize: '0.9375rem' }}>Estimated 1RM — used for Epley strength projections and Symmetric Strength tier ranking.</p>
      <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 20, fontSize: '0.8125rem', color: 'var(--text2)' }}>
        Don't know your 1RM? Use: <strong style={{ color: 'var(--text)' }}>Weight × (1 + Reps ÷ 30)</strong> — Epley formula. E.g. 80kg × 5 reps → 1RM ≈ 93kg.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {lifts.map(l => (
          <div key={l.key}>
            <label>{l.label}</label>
            <div className="input-unit">
              <input className="input" type="number" inputMode="decimal" placeholder={l.placeholder} value={data.liftMaxes[l.key]} onChange={e => update(l.key, e.target.value)} />
              <span>{u}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GoalStep({ data, update }) {
  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>Physique Goal</h2>
      <p style={{ color: 'var(--text2)', marginBottom: 24, fontSize: '0.9375rem' }}>This shifts your MEV/MAV/MRV targets and reorders exercise priorities.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PHYSIQUE_GOALS.map(g => (
          <button key={g.id} onClick={() => update('physiqueGoal', g.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: data.physiqueGoal === g.id ? 'rgba(34,197,94,0.1)' : 'var(--bg2)', border: `1px solid ${data.physiqueGoal === g.id ? 'var(--green)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 28 }}>{g.icon}</span>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{g.label}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>{g.description}</div>
            </div>
            {data.physiqueGoal === g.id && <div style={{ marginLeft: 'auto', color: 'var(--green)' }}><IconCheck /></div>}
          </button>
        ))}
      </div>
    </div>
  )
}

function TimelineStep({ data, update }) {
  const options = [8, 12, 16, 20, 24]
  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>Target Timeline</h2>
      <p style={{ color: 'var(--text2)', marginBottom: 24, fontSize: '0.9375rem' }}>How many weeks for your initial program? Projections use your frame size and current LBM to set realistic weekly gains.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {options.map(w => (
          <button key={w} onClick={() => update('targetWeeks', w)}
            style={{ padding: '20px 16px', textAlign: 'center', background: data.targetWeeks === w ? 'rgba(34,197,94,0.1)' : 'var(--bg2)', border: `1px solid ${data.targetWeeks === w ? 'var(--green)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: data.targetWeeks === w ? 'var(--green)' : 'var(--text)' }}>{w}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>weeks</div>
          </button>
        ))}
      </div>
    </div>
  )
}
