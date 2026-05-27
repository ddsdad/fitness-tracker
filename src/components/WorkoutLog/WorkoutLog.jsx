import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import WorkoutSession from './WorkoutSession.jsx'
import { IconPlus, IconChevronRight, IconFlame, IconTimer, IconX, IconTrash } from '../shared/Icons.jsx'
import { EXERCISES, searchExercises } from '../../data/exercises.js'
import { MUSCLE_GROUPS } from '../../data/muscles.js'
import { format, parseISO } from 'date-fns'

const rid = () => Math.random().toString(36).slice(2, 10)
// Build fresh session exercises from a logged session (pre-fill weights, reset done)
function buildRepeat(session) {
  return (session.exercises || []).map(ex => ({
    id: rid(), exerciseId: ex.exerciseId, name: ex.name,
    primaryMuscle: ex.primaryMuscle, secondaryMuscles: ex.secondaryMuscles || [],
    sets: (ex.sets || []).filter(s => !s.warmup).map(s => ({ id: rid(), weight: s.weight, reps: s.reps, restSeconds: s.restSeconds || 90, done: false })),
  }))
}
// Build fresh session exercises from a saved routine blueprint
function buildRoutine(routine) {
  return (routine.exercises || []).map(ex => ({
    id: rid(), exerciseId: ex.exerciseId, name: ex.name,
    primaryMuscle: ex.primary, secondaryMuscles: ex.secondary || [],
    sets: Array.from({ length: ex.sets || 3 }, () => ({ id: rid(), weight: 0, reps: ex.reps || 8, restSeconds: ex.category === 'compound' ? 180 : 90, done: false })),
  }))
}

// ── Routine builder modal ─────────────────────────────────────────────────────
function RoutineBuilder({ onSave, onClose }) {
  const { customExercises = [] } = useStore()
  const [name, setName] = useState('')
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const pool = [...customExercises, ...EXERCISES]
  const results = query.length > 1 ? pool.filter(e => e.name.toLowerCase().includes(query.toLowerCase())).slice(0, 20) : []

  const add = (ex) => { setItems(p => [...p, { exerciseId: ex.id, name: ex.name, primary: ex.primary, secondary: ex.secondary || [], category: ex.category, equipment: ex.equipment, sets: 3, reps: ex.category === 'compound' ? 6 : 12 }]); setQuery('') }
  const upd = (i, k, v) => setItems(p => p.map((it, j) => j === i ? { ...it, [k]: v } : it))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--bg2)', flex: 1, marginTop: 'auto', borderRadius: '16px 16px 0 0', maxHeight: '90dvh', overflowY: 'auto', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3>New Routine</h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: '1.25rem' }}>✕</button>
        </div>
        <input className="input" placeholder="Routine name (e.g. Push A)" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 12 }} />

        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--bg3)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>{MUSCLE_GROUPS[it.primary]?.label}</div>
            </div>
            <input className="input" type="number" inputMode="numeric" value={it.sets} onChange={e => upd(i, 'sets', parseInt(e.target.value) || 1)} style={{ width: 52, padding: '6px', textAlign: 'center' }} title="sets" />
            <span style={{ color: 'var(--text3)' }}>×</span>
            <input className="input" type="number" inputMode="numeric" value={it.reps} onChange={e => upd(i, 'reps', parseInt(e.target.value) || 1)} style={{ width: 52, padding: '6px', textAlign: 'center' }} title="reps" />
            <button onClick={() => setItems(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>✕</button>
          </div>
        ))}

        <input className="input" placeholder="🔍 Search to add exercise…" value={query} onChange={e => setQuery(e.target.value)} style={{ marginTop: 12 }} />
        {results.map(ex => (
          <div key={ex.id} onClick={() => add(ex)} style={{ padding: '8px 4px', borderBottom: '1px solid var(--bg3)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem' }}>{ex.name}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>{MUSCLE_GROUPS[ex.primary]?.label}</span>
          </div>
        ))}

        <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} disabled={!name.trim() || items.length === 0}
          onClick={() => { onSave({ id: rid(), name: name.trim(), emoji: '📋', exercises: items }); onClose() }}>
          Save Routine ({items.length} exercises)
        </button>
      </div>
    </div>
  )
}

export default function WorkoutLog({ onNavigate, preloadedPlan, onPreloadConsumed }) {
  const { sessions, routines = [], addRoutine, deleteRoutine } = useStore()
  const [view, setView] = useState(preloadedPlan ? 'new' : 'list')
  const [activeSession, setActiveSession] = useState(null)
  const [repeatEx, setRepeatEx] = useState(null)
  const [buildingRoutine, setBuildingRoutine] = useState(false)

  // If a plan was passed in, open the new-session view immediately
  const [consumedPlan] = useState(preloadedPlan)

  if (view === 'new') {
    return (
      <WorkoutSession
        mode="new"
        initialExercises={consumedPlan || repeatEx || undefined}
        onDone={() => { setView('list'); setRepeatEx(null); onPreloadConsumed?.() }}
      />
    )
  }
  if (view === 'detail' && activeSession) {
    return <WorkoutSession
      mode="view"
      session={activeSession}
      onDone={() => { setView('list'); setActiveSession(null) }}
      onRepeat={(s) => { setRepeatEx(buildRepeat(s)); setActiveSession(null); setView('new') }}
    />
  }

  const grouped = groupByDate(sessions)

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h1>Workout Log</h1><p>{sessions.length} sessions logged</p></div>
        </div>
      </div>

      {/* New session CTA */}
      <button
        className="btn btn-primary btn-full"
        style={{ marginBottom: 16, padding: 16, fontSize: '1rem' }}
        onClick={() => setView('new')}
      >
        <IconPlus /> Start New Session
      </button>

      {/* Routines */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="section-title" style={{ margin: 0 }}>My Routines</span>
          <button onClick={() => setBuildingRoutine(true)} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer' }}>＋ New</button>
        </div>
        {routines.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Save a reusable workout blueprint to start it in one tap.</div>
        ) : (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {routines.map(r => (
              <div key={r.id} style={{ flexShrink: 0, minWidth: 150, border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--bg2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.emoji} {r.name}</div>
                  <button onClick={() => { if (confirm(`Delete "${r.name}"?`)) deleteRoutine(r.id) }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️</button>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text3)', margin: '2px 0 10px' }}>{r.exercises.length} exercises</div>
                <button className="btn btn-secondary btn-full" style={{ padding: '8px', fontSize: '0.8rem' }} onClick={() => { setRepeatEx(buildRoutine(r)); setView('new') }}>▶ Start</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {buildingRoutine && <RoutineBuilder onSave={addRoutine} onClose={() => setBuildingRoutine(false)} />}

      {/* History */}
      {sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏋️</div>
          <p>No workouts yet.</p>
          <p style={{ fontSize: '0.875rem', marginTop: 8 }}>Start your first session above.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, daySessions]) => (
          <div key={date} className="section">
            <div className="section-title">{date}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {daySessions.map(session => (
                <SessionCard key={session.id} session={session} onClick={() => { setActiveSession(session); setView('detail') }} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function SessionCard({ session, onClick }) {
  const muscles = [...new Set(session.exercises.flatMap(e => [e.primaryMuscle]))]
  const duration = session.duration ? `${session.duration}m` : ''
  const vol = session.totalVolume

  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{session.name || 'Workout'}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginTop: 2 }}>
            {session.exercises.length} exercises · {session.exercises.reduce((s,e) => s + e.sets.length, 0)} sets
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {duration && <span style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>⏱ {duration}</span>}
          <IconChevronRight />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {muscles.slice(0, 4).map(m => (
          <span key={m} className="badge badge-green" style={{ textTransform: 'capitalize' }}>{m.replace('_', ' ')}</span>
        ))}
        {vol > 0 && <span className="badge badge-blue">{vol >= 1000 ? `${(vol/1000).toFixed(1)}k` : vol} kg vol</span>}
      </div>
    </div>
  )
}

function groupByDate(sessions) {
  const groups = {}
  sessions.forEach(s => {
    const d = new Date(s.date)
    const today = new Date()
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    let label
    if (d.toDateString() === today.toDateString()) label = 'Today'
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday'
    else label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    if (!groups[label]) groups[label] = []
    groups[label].push(s)
  })
  return groups
}
