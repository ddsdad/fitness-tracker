import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import {
  generateProgram, getProgramStatus, readinessScore, readinessAdjustment,
  generateProgramWorkout, splitVariant, SPLIT_META, PPL_SCHEDULE,
} from '../../utils/program.js'
import { planExercisesToSession } from '../WorkoutLog/WorkoutSession.jsx'
import { MUSCLE_GROUPS } from '../../data/muscles.js'

const TODAY_STR = new Date().toISOString().slice(0, 10)
const readKey = 'ft_readiness'
const getReadiness = (d) => { try { return (JSON.parse(localStorage.getItem(readKey)) || {})[d] || null } catch { return null } }
const setReadiness = (d, v) => { const all = (() => { try { return JSON.parse(localStorage.getItem(readKey)) || {} } catch { return {} } })(); all[d] = v; localStorage.setItem(readKey, JSON.stringify(all)) }

// ── Readiness check (3 sliders) ───────────────────────────────────────────────
function ReadinessCheck({ onSave }) {
  const [sleep, setSleep]       = useState(7)
  const [soreness, setSoreness] = useState(2)
  const [energy, setEnergy]     = useState(3)
  const score = readinessScore({ sleep, soreness, energy })
  const adj   = readinessAdjustment(score)

  const Row = ({ label, value, min, max, step, set, fmt }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 6 }}>
        <span style={{ color: 'var(--text2)' }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => set(+e.target.value)} />
    </div>
  )

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>🌅 Daily Readiness Check</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: 14 }}>30 seconds — adjusts today's load to how recovered you are.</div>
      <Row label="Sleep last night" value={sleep} min={3} max={10} step={0.5} set={setSleep} fmt={v => `${v} h`} />
      <Row label="Muscle soreness"  value={soreness} min={1} max={5} step={1} set={setSoreness} fmt={v => ['—','None','Mild','Moderate','Sore','Very sore'][v]} />
      <Row label="Energy / motivation" value={energy} min={1} max={5} step={1} set={setEnergy} fmt={v => ['—','Drained','Low','OK','Good','Great'][v]} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px', marginTop: 4 }}>
        <div style={{ textAlign: 'center', minWidth: 56 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: adj.color, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text3)', textTransform: 'uppercase' }}>Readiness</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: adj.color, fontSize: '0.875rem' }}>{adj.label}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text2)', lineHeight: 1.4, marginTop: 2 }}>{adj.message}</div>
        </div>
      </div>

      <button className="btn btn-primary btn-full" style={{ marginTop: 14 }}
        onClick={() => onSave({ score, sleep, soreness, energy, date: TODAY_STR })}>
        Save & See Today's Workout
      </button>
    </div>
  )
}

// ── Main Program view ─────────────────────────────────────────────────────────
export default function Program({ onStartSession }) {
  const { profile, setProfile } = useStore()
  const [showAllWeeks, setShowAllWeeks] = useState(false)
  const [readiness, setReadinessState] = useState(() => getReadiness(TODAY_STR))
  const [redoReadiness, setRedoReadiness] = useState(false)

  const program = profile?.program

  // ── No program yet — onboarding hero ──
  if (!program) {
    return (
      <div className="card" style={{ marginBottom: 16, textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
        <h2 style={{ marginBottom: 8 }}>3-Month Transformation</h2>
        <p style={{ color: 'var(--text2)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 16 }}>
          A full 12-week periodized plan: <strong>6-day Push/Pull/Legs</strong>, each muscle hit twice a week,
          with progressive overload and built-in deload weeks. The exact plan to maximize muscle.
        </p>
        <div style={{ textAlign: 'left', fontSize: '0.8125rem', color: 'var(--text2)', background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, lineHeight: 1.8 }}>
          <div>📈 <strong>Weeks 1–4:</strong> Foundation — add weight every session</div>
          <div>🧘 <strong>Week 5:</strong> Deload — recover</div>
          <div>🔥 <strong>Weeks 6–9:</strong> Volume — push sets near failure</div>
          <div>🧘 <strong>Week 10:</strong> Deload</div>
          <div>💥 <strong>Weeks 11–12:</strong> Intensity — heaviest, then test</div>
        </div>
        <button className="btn btn-primary btn-full"
          onClick={() => setProfile({ ...profile, program: generateProgram(profile) })}>
          Start My 12-Week Program
        </button>
      </div>
    )
  }

  const status = getProgramStatus(program)

  if (status.notStarted) {
    return <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>Program starts in {status.daysUntil} day(s).</div>
  }
  if (status.finished) {
    return (
      <div className="card" style={{ marginBottom: 16, textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
        <h2 style={{ marginBottom: 8 }}>Program Complete!</h2>
        <p style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: 16 }}>You finished all 12 weeks. Time to test your maxes and start a fresh block.</p>
        <button className="btn btn-primary btn-full" onClick={() => setProfile({ ...profile, program: generateProgram(profile) })}>Start a New 12-Week Block</button>
        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={() => setProfile({ ...profile, program: null })}>End Program</button>
      </div>
    )
  }

  const { week, dayInWeek, split, weekPlan } = status
  const meta = SPLIT_META[split]
  const isRest = split === 'rest'
  const variant = splitVariant(program.schedule, dayInWeek)
  const adj = readiness ? readinessAdjustment(readiness.score) : null
  const workout = isRest ? [] : generateProgramWorkout(split, weekPlan, variant, adj)
  const progressPct = Math.round((week - 1) / program.totalWeeks * 100)

  const handleSaveReadiness = (r) => { setReadiness(TODAY_STR, r); setReadinessState(r); setRedoReadiness(false) }

  return (
    <div>
      {/* Program header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Week {week} of 12</div>
            <div style={{ fontSize: '0.8rem', color: weekPlan.deload ? 'var(--yellow)' : 'var(--green)', fontWeight: 600 }}>
              {weekPlan.deload ? '🧘 ' : ''}{weekPlan.phase} Phase · {weekPlan.rir} RIR
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.7rem' }}
            onClick={() => { if (confirm('End your 12-week program?')) setProfile({ ...profile, program: null }) }}>End</button>
        </div>
        <div className="progress-bar" style={{ marginBottom: 6 }}>
          <div className="progress-bar-fill" style={{ width: `${progressPct}%`, background: weekPlan.deload ? 'var(--yellow)' : 'var(--green)' }} />
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{weekPlan.focus}</div>
      </div>

      {/* This week's schedule */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 16 }}>
        {program.schedule.map((s, i) => {
          const m = SPLIT_META[s]
          const isToday = i === dayInWeek
          return (
            <div key={i} style={{
              textAlign: 'center', padding: '8px 2px', borderRadius: 8,
              border: `2px solid ${isToday ? 'var(--green)' : 'var(--border)'}`,
              background: isToday ? 'rgba(34,197,94,0.08)' : 'var(--bg2)',
            }}>
              <div style={{ fontSize: '1rem' }}>{m.emoji}</div>
              <div style={{ fontSize: '0.55rem', color: isToday ? 'var(--green)' : 'var(--text3)', fontWeight: isToday ? 700 : 400, marginTop: 2 }}>
                {s === 'rest' ? 'Rest' : m.label.split(' ')[0]}
              </div>
            </div>
          )
        })}
      </div>

      {/* Rest day */}
      {isRest ? (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>😴</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Rest Day</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>Recovery is when muscle is built. Eat your protein, sleep well, come back tomorrow.</div>
        </div>
      ) : (
        <>
          {/* Readiness gate */}
          {(!readiness || redoReadiness) ? (
            <ReadinessCheck onSave={handleSaveReadiness} />
          ) : (
            <>
              {/* Readiness summary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', border: `1px solid ${adj.color}44`, borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                <span style={{ fontWeight: 800, color: adj.color }}>{readiness.score}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text2)', flex: 1 }}>{adj.label} — {adj.message}</span>
                <button onClick={() => setRedoReadiness(true)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}>Redo</button>
              </div>

              {/* Today's workout */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: '1.5rem' }}>{meta.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{meta.label} {variant === 1 ? '(B)' : '(A)'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{workout.length} exercises · {weekPlan.phase}{adj.loadPct < 1 ? ` · ${Math.round(adj.loadPct*100)}% load today` : ''}</div>
                  </div>
                </div>
                {workout.map((ex, i) => (
                  <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < workout.length - 1 ? '1px solid var(--bg4)' : 'none' }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text2)', flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{ex.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{MUSCLE_GROUPS[ex.primary]?.label} · {ex.category}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--green)' }}>{ex.sets}×{ex.reps}</div>
                  </div>
                ))}
                <button className="btn btn-primary btn-full" style={{ marginTop: 14 }}
                  onClick={() => onStartSession(planExercisesToSession(workout))}>
                  ▶ Start {meta.label}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Full periodization (collapsible) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div onClick={() => setShowAllWeeks(s => !s)} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>📅 Full 12-Week Plan</span>
          <span style={{ color: 'var(--text3)', transform: showAllWeeks ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
        </div>
        {showAllWeeks && (
          <div style={{ padding: '0 16px 12px' }}>
            {program.weeks.map(w => (
              <div key={w.week} style={{ display: 'flex', gap: 10, padding: '7px 0', borderTop: '1px solid var(--bg4)', alignItems: 'center', opacity: w.week < week ? 0.5 : 1 }}>
                <span style={{ width: 30, fontSize: '0.7rem', color: w.week === week ? 'var(--green)' : 'var(--text3)', fontWeight: w.week === week ? 700 : 400 }}>W{w.week}</span>
                <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: w.deload ? 700 : 400, color: w.deload ? 'var(--yellow)' : 'var(--text)' }}>{w.deload ? '🧘 ' : ''}{w.phase}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{w.rir} RIR</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
