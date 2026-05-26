import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import WorkoutSession from './WorkoutSession.jsx'
import { IconPlus, IconChevronRight, IconFlame, IconTimer } from '../shared/Icons.jsx'
import { format, parseISO } from 'date-fns'

export default function WorkoutLog({ onNavigate, preloadedPlan, onPreloadConsumed }) {
  const { sessions } = useStore()
  const [view, setView] = useState(preloadedPlan ? 'new' : 'list')
  const [activeSession, setActiveSession] = useState(null)

  // If a plan was passed in, open the new-session view immediately
  const [consumedPlan] = useState(preloadedPlan)

  if (view === 'new') {
    return (
      <WorkoutSession
        mode="new"
        initialExercises={consumedPlan || undefined}
        onDone={() => { setView('list'); onPreloadConsumed?.() }}
      />
    )
  }
  if (view === 'detail' && activeSession) {
    return <WorkoutSession mode="view" session={activeSession} onDone={() => { setView('list'); setActiveSession(null) }} />
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
        style={{ marginBottom: 24, padding: 16, fontSize: '1rem' }}
        onClick={() => setView('new')}
      >
        <IconPlus /> Start New Session
      </button>

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
