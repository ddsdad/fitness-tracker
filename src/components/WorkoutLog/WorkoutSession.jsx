import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore.js'
import { EXERCISES, searchExercises } from '../../data/exercises.js'
import { MUSCLE_GROUPS } from '../../data/muscles.js'
import { epley1RM } from '../../utils/calculations.js'
import { IconPlus, IconX, IconCheck, IconTimer, IconTrash, IconChevronLeft } from '../shared/Icons.jsx'

function genId() { return Math.random().toString(36).slice(2) }

function calcVolume(exercises) {
  return Math.round(exercises.reduce((s, ex) => s + ex.sets.reduce((ss, set) => ss + (set.reps * set.weight), 0), 0))
}

function calcTUT(exercises) {
  return exercises.reduce((s, ex) => {
    const ex_ = EXERCISES.find(e => e.id === ex.exerciseId)
    const tutPerRep = ex_?.tut_per_rep || 3
    return s + ex.sets.reduce((ss, set) => ss + set.reps * tutPerRep, 0)
  }, 0)
}

// ── Best Epley 1RM across all sets of an exercise ─────────────────────────────
function bestE1RM(sets) {
  let best = 0
  for (const s of sets) {
    if (s.weight > 0 && s.reps > 0) {
      const e = epley1RM(s.weight, s.reps)
      if (e > best) best = e
    }
  }
  return best > 0 ? +best.toFixed(1) : null
}

// ── Look up the most recent session that logged this exercise ─────────────────
function getLastPerf(exerciseId, sessions) {
  for (const s of sessions) {
    const ex = s.exercises?.find(e => e.exerciseId === exerciseId)
    if (ex && ex.sets?.some(set => set.weight > 0 || set.reps > 0)) {
      return {
        date: s.date,
        sets: ex.sets,
        e1rm: ex.bestE1RM || null,
      }
    }
  }
  return null
}

// ── Plate calculator (per side, 20 kg Olympic bar) ────────────────────────────
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25]
function platesPerSide(target, bar = 20) {
  let perSide = (target - bar) / 2
  if (perSide <= 0) return []
  const out = []
  for (const p of PLATES_KG) {
    while (perSide >= p - 1e-9) { out.push(p); perSide = +(perSide - p).toFixed(3) }
  }
  return out
}

// ── Warm-up ramp from a top working weight ────────────────────────────────────
function warmupRamp(topWeight, bar = 20) {
  if (!topWeight || topWeight <= bar) return []
  return [
    { pct: 0.40, reps: 8 },
    { pct: 0.60, reps: 5 },
    { pct: 0.80, reps: 3 },
  ].map(w => ({ weight: Math.max(bar, Math.round(topWeight * w.pct / 2.5) * 2.5), reps: w.reps }))
}

// ── Progressive overload suggestion ──────────────────────────────────────────
function progressionSuggestion(lastSets) {
  if (!lastSets?.length) return null
  const done = lastSets.filter(s => s.weight > 0 && s.reps > 0)
  if (!done.length) return null
  const lastWeight = done[done.length - 1].weight
  const avgReps    = done.reduce((s, set) => s + set.reps, 0) / done.length
  // Simple rule: if avg reps ≥ 8 on last workout, suggest +2.5 kg next time
  const suggestedWeight = avgReps >= 8 ? lastWeight + 2.5 : lastWeight
  return { lastWeight, suggestedWeight: +suggestedWeight.toFixed(1), avgReps: +avgReps.toFixed(1) }
}

// ── Convert plan exercises (from Recommendations) to session format ────────────
export function planExercisesToSession(planExercises) {
  return planExercises.map(planEx => {
    const repsStr    = String(planEx.reps || '8')
    const repsTarget = parseInt(repsStr.split('–')[0] || repsStr.split('-')[0] || '8')
    const restSecs   = planEx.category === 'compound' ? 180 : 90
    return {
      id:               genId(),
      exerciseId:       planEx.id,
      name:             planEx.name,
      primaryMuscle:    planEx.primary,
      secondaryMuscles: planEx.secondary || [],
      sets: Array.from({ length: planEx.sets || 3 }, () => ({
        id: genId(), weight: 0, reps: repsTarget, restSeconds: restSecs, done: false,
      })),
      _prescribedReps: repsStr,
    }
  })
}

// ── Rest Timer ────────────────────────────────────────────────────────────────
function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(true)
  const ref = useRef()

  useEffect(() => {
    if (!running) return
    ref.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(ref.current); onDone?.(); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(ref.current)
  }, [running])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const low  = remaining <= 10

  return (
    <div style={{ background: low ? 'rgba(34,197,94,0.12)' : 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, transition: 'background 0.2s' }}>
      <IconTimer />
      <span style={{ fontWeight: 700, fontSize: '1.25rem', fontVariantNumeric: 'tabular-nums', color: low ? 'var(--green)' : 'var(--text)' }}>
        {mins}:{String(secs).padStart(2, '0')}
      </span>
      <button onClick={() => setRemaining(r => Math.max(0, r - 15))} style={{ background: 'var(--bg4)', border: 'none', borderRadius: 6, padding: '4px 8px', color: 'var(--text2)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>−15</button>
      <button onClick={() => setRemaining(r => r + 15)} style={{ background: 'var(--bg4)', border: 'none', borderRadius: 6, padding: '4px 8px', color: 'var(--text2)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>+15</button>
      <span style={{ flex: 1 }} />
      <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8125rem' }} onClick={() => setRunning(r => !r)}>
        {running ? 'Pause' : 'Resume'}
      </button>
      <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8125rem', color: 'var(--red)' }} onClick={onDone}>Skip</button>
    </div>
  )
}

// ── Exercise picker modal ─────────────────────────────────────────────────────
function ExercisePicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const results = query.length > 1 ? searchExercises(query) : EXERCISES

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--bg2)', flex: 1, display: 'flex', flexDirection: 'column', marginTop: 'auto', borderRadius: '20px 20px 0 0', maxHeight: '85vh' }}>
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Select Exercise</h3>
            <button className="btn btn-ghost" style={{ padding: 8 }} onClick={onClose}><IconX /></button>
          </div>
          <input className="input" placeholder="Search exercises..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
        </div>
        <div style={{ overflowY: 'auto', padding: '12px 16px 32px' }}>
          {results.map(ex => (
            <button key={ex.id} onClick={() => onSelect(ex)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{ex.name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>
                  {MUSCLE_GROUPS[ex.primary]?.label}
                  {ex.secondary?.length > 0 && ` · ${ex.secondary.slice(0, 2).map(m => MUSCLE_GROUPS[m]?.label).filter(Boolean).join(', ')}`}
                </div>
              </div>
              <span className={`badge ${ex.category === 'compound' ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: '0.6875rem' }}>
                {ex.category}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Set row ───────────────────────────────────────────────────────────────────
function SetRow({ set, idx, onUpdate, onDelete, onSetComplete, suggestedWeight, showPlates }) {
  const plates = showPlates && set.weight > 0 ? platesPerSide(set.weight) : null
  return (
    <>
    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: plates ? 2 : 8 }}>
      <span style={{ color: set.warmup ? 'var(--yellow)' : 'var(--text3)', fontSize: '0.8125rem', textAlign: 'center', fontWeight: set.warmup ? 700 : 400 }}>{set.warmup ? 'W' : idx + 1}</span>

      {/* Weight */}
      <div className="input-unit" style={{ position: 'relative' }}>
        <input
          className="input"
          type="number" inputMode="decimal"
          placeholder={suggestedWeight ? String(suggestedWeight) : '0'}
          value={set.weight || ''}
          style={{ padding: '8px 36px 8px 10px', fontSize: '0.9375rem', background: set.done ? 'rgba(34,197,94,0.08)' : undefined }}
          onChange={e => onUpdate({ ...set, weight: parseFloat(e.target.value) || 0 })}
        />
        <span style={{ right: 8, fontSize: '0.75rem', position: 'absolute', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }}>kg</span>
      </div>

      {/* Reps */}
      <input
        className="input"
        type="number" inputMode="numeric"
        placeholder="0"
        value={set.reps || ''}
        style={{ padding: '8px 10px', fontSize: '0.9375rem', textAlign: 'center', background: set.done ? 'rgba(34,197,94,0.08)' : undefined }}
        onChange={e => onUpdate({ ...set, reps: parseInt(e.target.value) || 0 })}
      />

      {/* Rest */}
      <input
        className="input"
        type="number" inputMode="numeric"
        placeholder="90"
        value={set.restSeconds || ''}
        style={{ padding: '8px 10px', fontSize: '0.9375rem', textAlign: 'center' }}
        onChange={e => onUpdate({ ...set, restSeconds: parseInt(e.target.value) || 90 })}
      />

      {/* Done */}
      <button
        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: set.done ? 'var(--green)' : 'var(--bg4)', color: set.done ? '#000' : 'var(--text2)', transition: 'all 0.15s' }}
        onClick={() => onSetComplete(set)}
      >
        <IconCheck />
      </button>
    </div>
    {plates && (
      <div style={{ gridColumn: '2 / 5', fontSize: '0.7rem', color: 'var(--text3)', marginBottom: 8, paddingLeft: 4 }}>
        🏋️ Per side: {plates.length ? plates.map(p => `${p}`).join(' + ') + ' kg' : 'just the bar (20kg)'}
      </div>
    )}
    </>
  )
}

// ── Single exercise block ─────────────────────────────────────────────────────
function ExerciseBlock({ exercise, onUpdate, onDelete, defaultRest, lastPerf, isView }) {
  const [showTimer, setShowTimer] = useState(false)
  const [timerSecs, setTimerSecs] = useState(90)
  const [showPlates, setShowPlates] = useState(false)

  const ex = EXERCISES.find(e => e.id === exercise.exerciseId)
  const suggestion = progressionSuggestion(lastPerf?.sets)
  const currentBest = bestE1RM(exercise.sets)

  // Fill all working sets with last session's weight & reps (one tap)
  const fillFromLast = () => {
    const done = (lastPerf?.sets || []).filter(s => s.weight > 0 && s.reps > 0)
    if (!done.length) return
    const w = suggestion?.suggestedWeight || done[done.length - 1].weight
    const r = done[done.length - 1].reps
    onUpdate({ ...exercise, sets: exercise.sets.map(s => s.warmup ? s : { ...s, weight: w, reps: r }) })
  }

  // Prepend warm-up sets based on the heaviest working weight entered (or suggestion)
  const addWarmup = () => {
    const topW = Math.max(...exercise.sets.map(s => s.weight || 0), suggestion?.suggestedWeight || 0)
    const ramp = warmupRamp(topW)
    if (!ramp.length) return
    const warm = ramp.map(w => ({ id: genId(), weight: w.weight, reps: w.reps, restSeconds: 60, done: false, warmup: true }))
    const working = exercise.sets.filter(s => !s.warmup)
    onUpdate({ ...exercise, sets: [...warm, ...working] })
  }
  const hasWarmup = exercise.sets.some(s => s.warmup)

  // Format last-perf summary
  const lastPerfSummary = lastPerf?.sets
    ? (() => {
        const done = lastPerf.sets.filter(s => s.weight > 0 && s.reps > 0)
        if (!done.length) return null
        const w = done[done.length - 1].weight
        const r = done[done.length - 1].reps
        const daysAgo = Math.floor((Date.now() - new Date(lastPerf.date)) / 86_400_000)
        return `${done.length}×${r} @ ${w}kg · ${daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`}`
      })()
    : null

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1] || { weight: suggestion?.lastWeight || 0, reps: 0, restSeconds: defaultRest }
    onUpdate({ ...exercise, sets: [...exercise.sets, { id: genId(), weight: last.weight, reps: last.reps, restSeconds: last.restSeconds, done: false }] })
  }

  const updateSet = (id, updated) => onUpdate({ ...exercise, sets: exercise.sets.map(s => s.id === id ? updated : s) })
  const deleteSet = (id) => onUpdate({ ...exercise, sets: exercise.sets.filter(s => s.id !== id) })

  const handleSetComplete = (set) => {
    updateSet(set.id, { ...set, done: !set.done })
    if (!set.done) { setTimerSecs(set.restSeconds || 90); setShowTimer(true) }
    else setShowTimer(false)
  }

  return (
    <div className="card" style={{ marginBottom: 12, border: exercise.sets.every(s => s.done) ? '1px solid rgba(34,197,94,0.4)' : undefined }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{ex?.name || exercise.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>
            {MUSCLE_GROUPS[ex?.primary]?.label}
            {exercise._prescribedReps && <span style={{ marginLeft: 6, color: 'var(--blue)' }}>target: {exercise._prescribedReps} reps</span>}
          </div>
        </div>
        {!isView && <button className="btn btn-ghost" style={{ padding: 6, color: 'var(--red)', flexShrink: 0 }} onClick={onDelete}><IconTrash /></button>}
      </div>

      {/* Previous performance + progression hint */}
      {lastPerfSummary && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text3)', background: 'var(--bg3)', padding: '3px 8px', borderRadius: 6 }}>
            📊 Last: {lastPerfSummary}
          </span>
          {suggestion && suggestion.suggestedWeight > suggestion.lastWeight && (
            <span style={{ fontSize: '0.75rem', color: 'var(--green)', background: 'rgba(34,197,94,0.10)', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
              📈 Target: {suggestion.suggestedWeight}kg
            </span>
          )}
        </div>
      )}

      {/* Quick tools */}
      {!isView && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {lastPerf?.sets?.some(s => s.weight > 0) && (
            <button onClick={fillFromLast} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer' }}>
              ↻ Fill from last
            </button>
          )}
          {!hasWarmup && (
            <button onClick={addWarmup} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer' }}>
              🔥 Warm-up sets
            </button>
          )}
          <button onClick={() => setShowPlates(p => !p)} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 999, border: `1px solid ${showPlates ? 'var(--green)' : 'var(--border)'}`, background: showPlates ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: showPlates ? 'var(--green)' : 'var(--text2)', cursor: 'pointer' }}>
            🏋️ Plates
          </button>
        </div>
      )}

      {/* Live 1RM */}
      {currentBest > 0 && (
        <div style={{ marginBottom: 8, fontSize: '0.75rem', color: 'var(--yellow)', fontWeight: 600 }}>
          ⚡ Est. 1RM: {currentBest}kg
          {lastPerf?.e1rm && currentBest > lastPerf.e1rm && (
            <span style={{ color: 'var(--green)', marginLeft: 6 }}>▲ PR +{(currentBest - lastPerf.e1rm).toFixed(1)}kg</span>
          )}
        </div>
      )}

      {/* Rest timer */}
      {showTimer && <RestTimer seconds={timerSecs} onDone={() => setShowTimer(false)} />}

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr auto', gap: 8, marginBottom: 6 }}>
        <span />
        <span style={{ fontSize: '0.625rem', color: 'var(--text3)', textAlign: 'center', letterSpacing: '0.05em' }}>WEIGHT</span>
        <span style={{ fontSize: '0.625rem', color: 'var(--text3)', textAlign: 'center', letterSpacing: '0.05em' }}>REPS</span>
        <span style={{ fontSize: '0.625rem', color: 'var(--text3)', textAlign: 'center', letterSpacing: '0.05em' }}>REST(s)</span>
        <span />
      </div>

      {exercise.sets.map((set, idx) => (
        <SetRow
          key={set.id}
          set={set}
          idx={idx}
          onUpdate={(u) => updateSet(set.id, u)}
          onDelete={() => deleteSet(set.id)}
          onSetComplete={handleSetComplete}
          suggestedWeight={!lastPerfSummary && suggestion ? suggestion.suggestedWeight : suggestion?.lastWeight}
          showPlates={showPlates}
        />
      ))}

      {!isView && (
        <button className="btn btn-secondary btn-full" style={{ marginTop: 8 }} onClick={addSet}>
          <IconPlus /> Add Set
        </button>
      )}
    </div>
  )
}

// ── Session summary when saving ───────────────────────────────────────────────
function SessionSummary({ exercises }) {
  const totalSets   = exercises.reduce((s, e) => s + e.sets.length, 0)
  const doneSets    = exercises.reduce((s, e) => s + e.sets.filter(s => s.done).length, 0)
  const totalVol    = calcVolume(exercises)
  const prs         = exercises.filter(e => {
    const cur = bestE1RM(e.sets)
    return cur && cur > 0
  }).length

  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
      {[
        [String(doneSets) + '/' + totalSets, 'Sets Done'],
        [totalVol >= 1000 ? `${(totalVol/1000).toFixed(1)}k` : String(totalVol), 'Volume kg'],
        [String(exercises.length), 'Exercises'],
        [String(prs), 'Active 1RMs'],
      ].map(([val, lbl]) => (
        <div key={lbl} style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--green)' }}>{val}</div>
          <div style={{ fontSize: '0.625rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lbl}</div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WorkoutSession({ mode, session: initialSession, onDone, initialExercises }) {
  const { addSession, deleteSession, sessions, profile, setProfile } = useStore()

  // Build initial exercises from either a pre-loaded plan or an existing session
  const buildInitialExercises = () => {
    if (initialExercises?.length) return initialExercises
    if (initialSession?.exercises) {
      return initialSession.exercises.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s, id: s.id || genId() })) }))
    }
    return []
  }

  const [name, setName]         = useState(initialSession?.name || (initialExercises?.length ? 'Planned Session' : ''))
  const [exercises, setExercises] = useState(buildInitialExercises)
  const [showPicker, setShowPicker] = useState(false)
  const [startTime]             = useState(new Date())
  const [saving, setSaving]     = useState(false)

  const isView = mode === 'view'

  const addExercise = (ex) => {
    const lastPerf = getLastPerf(ex.id, sessions)
    const prefillWeight = lastPerf?.sets ? (lastPerf.sets.filter(s=>s.weight>0).slice(-1)[0]?.weight || 0) : 0
    setExercises(prev => [...prev, {
      id: genId(),
      exerciseId: ex.id,
      name: ex.name,
      primaryMuscle: ex.primary,
      secondaryMuscles: ex.secondary,
      sets: [{ id: genId(), weight: prefillWeight, reps: 0, restSeconds: 90, done: false }]
    }])
    setShowPicker(false)
  }

  const updateExercise = (id, updated) => setExercises(prev => prev.map(e => e.id === id ? updated : e))
  const deleteExercise = (id) => setExercises(prev => prev.filter(e => e.id !== id))

  const saveSession = () => {
    setSaving(true)
    const duration = Math.round((new Date() - startTime) / 60000)

    // Compute best 1RM per exercise and check for new PRs
    const exercisesWithE1RM = exercises.map(ex => ({
      ...ex,
      bestE1RM: bestE1RM(ex.sets),
    }))

    // Update profile.liftMaxes with any new PRs on the 5 key lifts
    const liftMap = { squat: ['squat','barbell_squat'], bench: ['bench_press','db_bench'], deadlift: ['deadlift','conventional_deadlift'], row: ['barbell_row','db_row','pendlay_row'], ohp: ['ohp','db_ohp'] }
    if (profile) {
      const newMaxes = { ...(profile.liftMaxes || {}) }
      let updated = false
      for (const [liftKey, exIds] of Object.entries(liftMap)) {
        const match = exercisesWithE1RM.find(e => exIds.includes(e.exerciseId))
        if (match?.bestE1RM) {
          const bwKg = profile.unit === 'kg' ? profile.bodyweight : profile.bodyweight / 2.2046
          const e1rmUnit = profile.unit === 'kg' ? match.bestE1RM : match.bestE1RM * 2.2046
          if (!newMaxes[liftKey] || e1rmUnit > newMaxes[liftKey]) {
            newMaxes[liftKey] = +e1rmUnit.toFixed(1)
            updated = true
          }
        }
      }
      if (updated) setProfile({ ...profile, liftMaxes: newMaxes })
    }

    const session = {
      id: genId(),
      date: new Date().toISOString(),
      name: name || 'Workout',
      exercises: exercisesWithE1RM,
      totalVolume: calcVolume(exercises),
      estimatedTUT: calcTUT(exercises),
      duration: duration || 1,
    }
    addSession(session)
    onDone()
  }

  const handleDelete = () => {
    if (confirm('Delete this session?') && initialSession) {
      deleteSession(initialSession.id)
      onDone()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      {showPicker && <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} />}

      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ padding: 8 }} onClick={onDone}><IconChevronLeft /></button>
        {isView ? (
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{initialSession?.name || 'Workout'}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>
              {new Date(initialSession?.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        ) : (
          <input
            className="input"
            placeholder="Session name…"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', padding: '8px 0', fontWeight: 600, fontSize: '1rem' }}
          />
        )}
        {isView && (
          <button className="btn btn-ghost" style={{ padding: 8, color: 'var(--red)' }} onClick={handleDelete}><IconTrash /></button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* View-mode stats */}
        {isView && (
          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="stat-block"><div className="val text-green">{initialSession?.exercises.reduce((s,e) => s + e.sets.length, 0)}</div><div className="lbl">Sets</div></div>
            <div className="stat-block"><div className="val">{initialSession?.totalVolume >= 1000 ? `${(initialSession.totalVolume/1000).toFixed(1)}k` : initialSession?.totalVolume}</div><div className="lbl">Volume</div></div>
            <div className="stat-block"><div className="val">{initialSession?.duration || '—'}m</div><div className="lbl">Duration</div></div>
          </div>
        )}

        {/* Session summary while logging */}
        {!isView && exercises.length > 0 && (
          <SessionSummary exercises={exercises} />
        )}

        {/* Exercises */}
        {exercises.map(ex => (
          <ExerciseBlock
            key={ex.id}
            exercise={ex}
            onUpdate={(u) => updateExercise(ex.id, u)}
            onDelete={() => deleteExercise(ex.id)}
            defaultRest={90}
            lastPerf={getLastPerf(ex.exerciseId, sessions)}
            isView={isView}
          />
        ))}

        {!isView && (
          <button className="btn btn-secondary btn-full" style={{ marginBottom: 120 }} onClick={() => setShowPicker(true)}>
            <IconPlus /> Add Exercise
          </button>
        )}
      </div>

      {/* Footer */}
      {!isView && (
        <div style={{ padding: '12px 16px 28px', background: 'var(--bg2)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', textAlign: 'center', marginBottom: 10 }}>
            {exercises.reduce((s,e) => s + e.sets.filter(s=>s.done).length, 0)}/
            {exercises.reduce((s,e) => s + e.sets.length, 0)} sets complete
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" style={{ flex: '0 0 auto' }} onClick={onDone}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveSession} disabled={exercises.length === 0 || saving}>
              <IconCheck /> Finish &amp; Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
