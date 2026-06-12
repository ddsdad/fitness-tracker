import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { EXERCISES } from '../../data/exercises.js'
import { MUSCLE_GROUPS } from '../../data/muscles.js'
import { epley1RM } from '../../utils/calculations.js'
import { postSessionFeedback } from '../../utils/coach.js'
import { IconPlus, IconCheck, IconTrash, IconChevronLeft } from '../shared/Icons.jsx'
import ExercisePicker from './ExercisePicker.jsx'
import SetRow from './SetRow.jsx'
import RestTimer from './RestTimer.jsx'
import ShadowDuel from './ShadowDuel.jsx'

function genId() { return Math.random().toString(36).slice(2) }

function calcVolume(exercises) {
  return Math.round(exercises.reduce((s, ex) => s + ex.sets.reduce((ss, set) => ss + (set.reps * set.weight), 0), 0))
}

function calcTUT(exercises) {
  return exercises.reduce((s, ex) => {
    const ex_ = EXERCISES.find(e => e.id === ex.exerciseId)
    const tutPerRep = ex_?.tut || 3
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

// ── Plate calculator (unit-aware) ─────────────────────────────────────────────
function plateConfig(unit) {
  return unit === 'lbs'
    ? { plates: [45, 35, 25, 10, 5, 2.5], bar: 45, inc: 5 }
    : { plates: [25, 20, 15, 10, 5, 2.5, 1.25], bar: 20, inc: 2.5 }
}
function platesPerSide(target, unit = 'kg') {
  const { plates, bar } = plateConfig(unit)
  let perSide = (target - bar) / 2
  if (perSide <= 0) return []
  const out = []
  for (const p of plates) {
    while (perSide >= p - 1e-9) { out.push(p); perSide = +(perSide - p).toFixed(3) }
  }
  return out
}

// ── Warm-up ramp from a top working weight (unit-aware rounding) ──────────────
function warmupRamp(topWeight, unit = 'kg') {
  const { bar, inc } = plateConfig(unit)
  if (!topWeight || topWeight <= bar) return []
  return [
    { pct: 0.40, reps: 8 },
    { pct: 0.60, reps: 5 },
    { pct: 0.80, reps: 3 },
  ].map(w => ({ weight: Math.max(bar, Math.round(topWeight * w.pct / inc) * inc), reps: w.reps }))
}
const roundToInc = (w, unit) => { const { inc } = plateConfig(unit); return Math.round(w / inc) * inc }

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


// ── Single exercise block ─────────────────────────────────────────────────────
function ExerciseBlock({ exercise, onUpdate, onDelete, defaultRest, lastPerf, isView, unit = 'kg' }) {
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
    const ramp = warmupRamp(topW, unit)
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

      {/* Shadow Duel — live battle vs your previous performance */}
      {!isView && <ShadowDuel sets={exercise.sets} ghostSets={lastPerf?.sets} unit={unit} />}

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

      {/* %-of-1RM working-weight fill */}
      {!isView && (() => {
        const oneRM = Math.max(currentBest || 0, lastPerf?.e1rm || 0)
        if (oneRM <= 0) return null
        const fillPct = (pct) => {
          const w = roundToInc(oneRM * pct / 100, unit)
          onUpdate({ ...exercise, sets: exercise.sets.map(s => s.warmup ? s : { ...s, weight: w }) })
        }
        return (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>% of {oneRM.toFixed(0)}{unit} 1RM:</span>
            {[70, 75, 80, 85, 90].map(p => (
              <button key={p} onClick={() => fillPct(p)} style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer' }}>
                {p}% · {roundToInc(oneRM * p / 100, unit)}{unit}
              </button>
            ))}
          </div>
        )
      })()}

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
          unit={unit}
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
export default function WorkoutSession({ mode, session: initialSession, onDone, initialExercises, onRepeat }) {
  const { addSession, deleteSession, updateSession, sessions, profile, setProfile } = useStore()

  // Build initial exercises from either a pre-loaded plan or an existing session
  const buildInitialExercises = () => {
    if (initialExercises?.length) return initialExercises
    if (initialSession?.exercises) {
      return (initialSession.exercises || []).map(e => ({ ...e, sets: (e.sets || []).map(s => ({ ...s, id: s.id || genId() })) }))
    }
    return []
  }

  const [name, setName]         = useState(initialSession?.name || (initialExercises?.length ? 'Planned Session' : ''))
  const [exercises, setExercises] = useState(buildInitialExercises)
  const [showPicker, setShowPicker] = useState(false)
  const [startTime]             = useState(new Date())
  const [saving, setSaving]     = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [editing, setEditing]   = useState(false)

  const isView = mode === 'view' && !editing

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
    // Compute coach feedback BEFORE adding (so priorSessions excludes this one)
    const fb = profile ? postSessionFeedback(session, sessions, profile) : null
    addSession(session)
    if (fb) setFeedback(fb)
    else onDone()
  }

  const handleDelete = () => {
    if (confirm('Delete this session?') && initialSession) {
      deleteSession(initialSession.id)
      onDone()
    }
  }

  // ── Save edits back onto an existing logged session (preserves id & date) ──────
  const commitEdit = () => {
    if (!initialSession) return
    const exercisesWithE1RM = exercises.map(ex => ({ ...ex, bestE1RM: bestE1RM(ex.sets) }))
    updateSession(initialSession.id, {
      name: name || 'Workout',
      exercises: exercisesWithE1RM,
      totalVolume: calcVolume(exercises),
      estimatedTUT: calcTUT(exercises),
    })
    setEditing(false)
    onDone()
  }

  const cancelEdit = () => {
    setExercises(buildInitialExercises())
    setName(initialSession?.name || '')
    setEditing(false)
  }

  // Post-session coach feedback overlay
  if (feedback) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{feedback.prs.length ? '🏆' : '💪'}</div>
        <h2 style={{ marginBottom: 8 }}>{feedback.headline}</h2>
        {feedback.coins > 0 && (
          <div style={{ display: 'inline-block', background: 'rgba(34,197,94,0.12)', border: '1px solid var(--green)', borderRadius: 999, padding: '6px 16px', marginBottom: 16, fontWeight: 800, color: 'var(--green)' }}>
            +{feedback.coins} 🪙 earned
          </div>
        )}
        <div style={{ maxWidth: 360, marginBottom: 24 }}>
          {feedback.lines.map((l, i) => (
            <p key={i} style={{ color: 'var(--text2)', fontSize: '0.9rem', lineHeight: 1.6, marginTop: 6 }}>{l}</p>
          ))}
        </div>
        <button className="btn btn-primary btn-full" style={{ maxWidth: 320 }} onClick={onDone}>Done</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
      {showPicker && <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} />}

      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ padding: 8 }} onClick={onDone}><IconChevronLeft /></button>
        {isView ? (
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{initialSession?.name || 'Workout'}</div>
            <input
              type="date"
              value={new Date(initialSession?.date).toLocaleDateString('en-CA')}
              max={new Date().toLocaleDateString('en-CA')}
              onChange={e => {
                if (!e.target.value || !initialSession) return
                // keep time-of-day at noon to avoid timezone date rollover
                const newDate = new Date(`${e.target.value}T12:00:00`).toISOString()
                updateSession(initialSession.id, { date: newDate })
                initialSession.date = newDate
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text2)', fontSize: '0.8125rem', padding: 0, cursor: 'pointer', colorScheme: 'dark' }}
            />
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
          <>
            <button className="btn btn-ghost" style={{ padding: 8, fontSize: '1.1rem' }} onClick={() => setEditing(true)} aria-label="Edit workout">✏️</button>
            <button className="btn btn-ghost" style={{ padding: 8, color: 'var(--red)' }} onClick={handleDelete}><IconTrash /></button>
          </>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* View-mode stats */}
        {isView && (
          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="stat-block"><div className="val text-green">{(initialSession?.exercises || []).reduce((s,e) => s + (e.sets || []).length, 0)}</div><div className="lbl">Sets</div></div>
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
            unit={profile?.unit || 'kg'}
          />
        ))}

        {!isView && (
          <button className="btn btn-secondary btn-full" style={{ marginBottom: 16 }} onClick={() => setShowPicker(true)}>
            <IconPlus /> Add Exercise
          </button>
        )}

        {/* Repeat this workout */}
        {isView && onRepeat && (
          <button className="btn btn-primary btn-full" style={{ marginTop: 8, marginBottom: 16 }} onClick={() => onRepeat(initialSession)}>
            🔁 Repeat This Workout
          </button>
        )}
      </div>

      {/* Footer */}
      {!isView && (
        <div style={{ padding: '12px 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: 'var(--bg2)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', textAlign: 'center', marginBottom: 10 }}>
            {exercises.reduce((s,e) => s + e.sets.filter(s=>s.done).length, 0)}/
            {exercises.reduce((s,e) => s + e.sets.length, 0)} sets complete
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" style={{ flex: '0 0 auto' }} onClick={editing ? cancelEdit : onDone}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={editing ? commitEdit : saveSession} disabled={exercises.length === 0 || saving}>
              <IconCheck /> {editing ? 'Save Changes' : 'Finish & Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
