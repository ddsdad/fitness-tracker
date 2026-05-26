import { useState, useMemo } from 'react'
import { useStore } from '../../store/useStore.js'
import { getRecommendations, getWeeklyChallengeData, detectDeloadNeed, SESSION_TYPES, EQUIPMENT_PROFILES } from '../../utils/recommendations.js'
import { MUSCLE_GROUPS } from '../../data/muscles.js'
import { EXERCISES, EQUIPMENT_EMOJI, EQUIPMENT_LABELS } from '../../data/exercises.js'
import { planExercisesToSession } from '../WorkoutLog/WorkoutSession.jsx'

// ── Small helpers ─────────────────────────────────────────────────────────────
function Badge({ children, color = 'var(--green)' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em',
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>{children}</span>
  )
}

const PRIORITY_COLOR = { 'Best Match': 'var(--green)', 'Variation': 'var(--yellow)', 'Wildcard': 'var(--blue)' }

// ── Session type picker ───────────────────────────────────────────────────────
function SessionTypePicker({ selected, onChange }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
      <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
        {Object.values(SESSION_TYPES).map(st => {
          const active = selected === st.id
          return (
            <button
              key={st.id}
              onClick={() => onChange(st.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, padding: '10px 16px', borderRadius: 12,
                border: `2px solid ${active ? 'var(--green)' : 'var(--border)'}`,
                background: active ? 'rgba(34,197,94,0.10)' : 'var(--bg2)',
                cursor: 'pointer', minWidth: 88, transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '1.375rem' }}>{st.emoji}</span>
              <span style={{ fontWeight: active ? 700 : 500, fontSize: '0.8125rem', color: active ? 'var(--green)' : 'var(--text2)' }}>
                {st.label}
              </span>
              <span style={{ fontSize: '0.625rem', color: 'var(--text3)', textAlign: 'center', lineHeight: 1.3 }}>
                ~{st.targetMins} min
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Weekly challenge bars ─────────────────────────────────────────────────────
function WeeklyChallenge({ sessions, goals, goalId }) {
  const [open, setOpen] = useState(true)
  const data = getWeeklyChallengeData(sessions, Object.keys(goals).length ? goals : null, goalId)
  const done    = data.filter(m => m.done).length
  const total   = data.length
  const overallPct = total > 0 ? Math.round(data.reduce((s, m) => s + m.pct, 0) / total) : 0
  const xp      = data.reduce((s, m) => s + m.current, 0)
  const xpGoal  = data.reduce((s, m) => s + m.target, 0)

  return (
    <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
      {/* header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <span style={{ fontSize: '1.25rem' }}>🏆</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Weekly Challenge</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 1 }}>
            {done}/{total} goals complete · {Math.round(xp)}/{xpGoal} sets
          </div>
        </div>
        {/* overall ring */}
        <svg width={44} height={44} viewBox="0 0 44 44">
          <circle cx={22} cy={22} r={18} fill="none" stroke="var(--bg4)" strokeWidth={4} />
          <circle
            cx={22} cy={22} r={18} fill="none"
            stroke={overallPct >= 100 ? 'var(--green)' : overallPct >= 60 ? 'var(--yellow)' : 'var(--red)'}
            strokeWidth={4} strokeLinecap="round"
            strokeDasharray={`${overallPct / 100 * 113.1} 113.1`}
            transform="rotate(-90 22 22)"
          />
          <text x={22} y={26} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--text)" >{overallPct}%</text>
        </svg>
        <span style={{ color: 'var(--text3)', fontSize: '0.75rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
      </div>

      {open && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map(m => (
            <div key={m.muscle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 3 }}>
                <span style={{ color: m.done ? 'var(--text3)' : 'var(--text)', fontWeight: m.pct < 60 ? 600 : 400 }}>
                  {m.done ? '✅ ' : m.pct >= 60 ? '🔥 ' : '🎯 '}{m.label}
                  {m.sliderW >= 1.8 && <span style={{ marginLeft: 4, fontSize: '0.625rem', color: 'var(--green)', fontWeight: 700 }}>PRIORITY</span>}
                </span>
                <span style={{ color: m.color, fontWeight: 600 }}>
                  {m.current}/{m.target} sets
                  {m.done && <span style={{ color: 'var(--green)', marginLeft: 4 }}>+{m.current - m.target > 0 ? (m.current - m.target).toFixed(1) : '0'} bonus</span>}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--bg4)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 999,
                  width: `${m.pct}%`,
                  background: m.color,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          ))}
          {done === total && total > 0 && (
            <div style={{ textAlign: 'center', padding: '12px 0 4px', fontWeight: 700, color: 'var(--green)', fontSize: '0.9375rem' }}>
              🎉 Weekly challenge complete! You crushed it.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Exercise Swap Modal ───────────────────────────────────────────────────────
function SwapModal({ ex, equipmentTypes, onSwap, onClose }) {
  const alternatives = useMemo(() => {
    return EXERCISES
      .filter(e =>
        e.id !== ex.id &&
        e.primary === ex.primary &&
        (!equipmentTypes || equipmentTypes.has(e.equipment))
      )
      .sort((a, b) => (a.category === ex.category ? -1 : 1))  // same category first
  }, [ex.id, ex.primary, equipmentTypes])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 400, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--bg2)', flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '80vh', marginTop: 'auto', borderRadius: 'var(--radius) var(--radius) 0 0' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Swap Exercise</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginTop: 2 }}>
                Replace <em>{ex.name}</em> — same muscle: {MUSCLE_GROUPS[ex.primary]?.label}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {alternatives.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
              No alternatives for this equipment. Try switching to Full Gym mode.
            </div>
          ) : (
            alternatives.map(alt => (
              <div key={alt.id} onClick={() => { onSwap(alt); onClose() }}
                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--bg3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{alt.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>
                    {EQUIPMENT_EMOJI[alt.equipment]} {EQUIPMENT_LABELS[alt.equipment]} · {alt.category}
                    {alt.notes && ` · ${alt.notes}`}
                  </div>
                </div>
                <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0, marginLeft: 12 }}>Swap →</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Exercise row (expandable) ─────────────────────────────────────────────────
function ExRow({ ex, index, accent = 'var(--green)', label, onSwapRequest }) {
  const [open, setOpen] = useState(false)
  const CAT_COLOR = { compound: 'var(--blue)', isolation: 'var(--yellow)', bodyweight: 'var(--green)' }
  return (
    <div style={{ borderBottom: '1px solid var(--bg4)' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', cursor: 'pointer' }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, color: accent, flexShrink: 0 }}>
          {label || index + 1}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 1 }}>
            {EQUIPMENT_EMOJI[ex.equipment] || '•'} {EQUIPMENT_LABELS[ex.equipment]} · {MUSCLE_GROUPS[ex.primary]?.label}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, color: accent, fontSize: '0.9375rem' }}>{ex.sets} × {ex.reps}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text3)' }}>{ex.rest}</div>
        </div>
        <span style={{ color: 'var(--text3)', fontSize: '0.75rem', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
      </div>
      {open && (
        <div style={{ paddingBottom: 12, paddingLeft: 32, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Badge color={CAT_COLOR[ex.category] || 'var(--text3)'}>{ex.category}</Badge>
          <Badge color="var(--text3)">{ex.rir}</Badge>
          {ex.secondary?.length > 0 && (
            <Badge color="var(--text3)">Also: {ex.secondary.map(s => MUSCLE_GROUPS[s]?.label || s).join(', ')}</Badge>
          )}
          {ex.notes && (
            <div style={{ width: '100%', fontSize: '0.8125rem', color: 'var(--text2)', fontStyle: 'italic', marginTop: 4 }}>
              💡 {ex.notes}
            </div>
          )}
          {onSwapRequest && (
            <button
              onClick={e => { e.stopPropagation(); onSwapRequest(ex) }}
              style={{ padding: '5px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: '0.75rem', cursor: 'pointer', marginTop: 4 }}
            >
              🔄 Swap Exercise
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Superset block ────────────────────────────────────────────────────────────
function SupersetBlock({ pair, index, onSwapRequest }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ height: 2, flex: 1, background: 'var(--bg4)', borderRadius: 1 }} />
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--yellow)', letterSpacing: '0.07em' }}>
          🔀 {pair.label.toUpperCase()}
        </span>
        <div style={{ height: 2, flex: 1, background: 'var(--bg4)', borderRadius: 1 }} />
      </div>
      {pair.exercises.map((ex, i) => (
        <ExRow key={ex.id} ex={ex} index={i} label={i === 0 ? 'A' : 'B'} accent={i === 0 ? 'var(--yellow)' : 'var(--blue)'} onSwapRequest={onSwapRequest} />
      ))}
      <div style={{ fontSize: '0.6875rem', color: 'var(--text3)', paddingLeft: 32, paddingTop: 4, fontStyle: 'italic' }}>
        ⏱ {pair.restNote}
      </div>
    </div>
  )
}

// ── Circuit block ─────────────────────────────────────────────────────────────
function CircuitBlock({ stations, rounds, onSwapRequest }) {
  return (
    <div>
      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.6 }}>
        🔄 Complete all {stations.length} stations back-to-back, then rest <strong>2 min</strong> between rounds. Do <strong>{rounds} rounds</strong> total.
      </div>
      {stations.map((ex, i) => (
        <ExRow key={ex.id} ex={ex} index={i} accent="var(--blue)" onSwapRequest={onSwapRequest} />
      ))}
    </div>
  )
}

// ── Phase header ──────────────────────────────────────────────────────────────
function PhaseHdr({ icon, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0 6px', borderBottom: `2px solid ${color}33`, marginBottom: 2 }}>
      <span style={{ fontSize: '0.875rem' }}>{icon}</span>
      <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color }}>{label}</span>
    </div>
  )
}

// ── Warmup row ────────────────────────────────────────────────────────────────
function WarmupRow({ ex, index }) {
  return (
    <div style={{ borderBottom: '1px solid var(--bg4)', padding: '9px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text3)', flexShrink: 0 }}>
        {index + 1}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{ex.name}</div>
        {ex.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 1, fontStyle: 'italic' }}>{ex.notes}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, color: 'var(--yellow)', fontSize: '0.875rem' }}>{ex.sets} × {ex.reps}</div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text3)' }}>{ex.rest}</div>
      </div>
    </div>
  )
}

// ── Session body renderer ─────────────────────────────────────────────────────
function SessionBody({ variant, warmup, sessionTypeId, onSwapRequest }) {
  const { format, pairs = [], solo = [], rounds } = variant

  if (format === 'circuit') {
    return <CircuitBlock stations={solo} rounds={rounds || 3} onSwapRequest={onSwapRequest} />
  }

  if (format === 'superset') {
    const mainWork  = solo.filter(e => e._phase === 'main')
    const finishers = solo.filter(e => e._phase !== 'main')
    return (
      <div>
        {pairs.map((pair, i) => <SupersetBlock key={i} pair={pair} index={i} onSwapRequest={onSwapRequest} />)}
        {mainWork.length > 0 && (
          <>
            <PhaseHdr icon="💪" label="Main Work" color="var(--green)" />
            {mainWork.map((ex, i) => <ExRow key={ex.id} ex={ex} index={i} accent="var(--green)" onSwapRequest={onSwapRequest} />)}
          </>
        )}
        {finishers.length > 0 && (
          <>
            <PhaseHdr icon="🎯" label="Finishers" color="var(--blue)" />
            {finishers.map((ex, i) => <ExRow key={ex.id} ex={ex} index={i} accent="var(--blue)" onSwapRequest={onSwapRequest} />)}
          </>
        )}
      </div>
    )
  }

  // straight / deload
  const mainWork  = solo.filter(e => e._phase === 'main'     || e.category === 'compound')
  const finishers = solo.filter(e => e._phase === 'finisher'  || e.category !== 'compound')
  const isDeload  = sessionTypeId === 'deload'

  return (
    <div>
      {isDeload && (
        <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.6 }}>
          🧘 Deload week — use <strong>60% of normal weight</strong>, focus on form and feel. End each set 4–5 reps before failure.
        </div>
      )}
      {warmup.length > 0 && (
        <>
          <PhaseHdr icon="🔥" label="Warmup" color="var(--yellow)" />
          {warmup.map((ex, i) => <WarmupRow key={i} ex={ex} index={i} />)}
        </>
      )}
      {mainWork.length > 0 && (
        <>
          <PhaseHdr icon="💪" label="Main Work" color="var(--green)" />
          {mainWork.map((ex, i) => <ExRow key={ex.id} ex={ex} index={i} accent="var(--green)" onSwapRequest={onSwapRequest} />)}
        </>
      )}
      {finishers.length > 0 && (
        <>
          <PhaseHdr icon="🎯" label="Finishers" color="var(--blue)" />
          {finishers.map((ex, i) => <ExRow key={ex.id} ex={ex} index={i} accent="var(--blue)" onSwapRequest={onSwapRequest} />)}
        </>
      )}
    </div>
  )
}

// ── Summary bar stats ─────────────────────────────────────────────────────────
function calcSummary(variant, warmup, sessionType) {
  const { format, pairs = [], solo = [], rounds } = variant
  if (format === 'circuit') {
    const totalSets = solo.reduce((s, e) => s + (e.sets || 0), 0)
    const estMins   = Math.round(solo.length * 45 * (rounds || 3) / 60 + (rounds || 3) * 2)
    return [
      [String(solo.length), 'Stations'],
      [String(rounds || 3), 'Rounds'],
      [String(totalSets), 'Total Sets'],
      [`~${estMins} min`, 'Est. Time'],
    ]
  }
  if (format === 'superset') {
    const totalEx   = pairs.reduce((s, p) => s + p.exercises.length, 0) + solo.length
    const totalSets = pairs.reduce((s, p) => s + p.exercises.reduce((ss, e) => ss + (e.sets || 0), 0), 0) + solo.reduce((s, e) => s + (e.sets || 0), 0)
    const estMins   = Math.round(pairs.length * 6 + solo.length * 4 + (warmup.length * 1.5))
    return [
      [String(pairs.length), 'Pairs'],
      [String(solo.length), 'Solo'],
      [String(totalSets), 'Total Sets'],
      [`~${estMins} min`, 'Est. Time'],
    ]
  }
  const mainWork  = solo.filter(e => e._phase === 'main'    || e.category === 'compound')
  const finishers = solo.filter(e => e._phase === 'finisher' || e.category !== 'compound')
  const totalSets = solo.reduce((s, e) => s + (e.sets || 0), 0)
  const estMins   = Math.round(warmup.length * 1.5 + solo.reduce((s, e) => {
    const restSec = e.category === 'compound' ? 200 : 90
    return s + (e.sets || 0) * (((e.tut || 3) * 8) + restSec)
  }, 0) / 60)
  return [
    warmup.length > 0  ? [String(warmup.length), 'Warmup']    : null,
    mainWork.length > 0 ? [String(mainWork.length), 'Main']   : null,
    finishers.length > 0 ? [String(finishers.length), 'Finishers'] : null,
    [String(totalSets), 'Total Sets'],
    [`~${estMins} min`, 'Est. Time'],
  ].filter(Boolean)
}

// ── Reasoning panel ───────────────────────────────────────────────────────────
function ReasoningPanel({ reasoning }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--bg4)' }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Why this session?</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
      </div>
      {open && (
        <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {reasoning.map((r, i) => (
            <div key={i} style={{
              fontSize: '0.8125rem', lineHeight: 1.5,
              color: r.type === 'skip' ? 'var(--text3)' : r.type === 'priority' ? 'var(--text)' : 'var(--text2)',
              fontStyle: r.type === 'skip' ? 'italic' : 'normal',
            }}>
              {r.icon} {r.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── One workout plan card ─────────────────────────────────────────────────────
function WorkoutCard({ plan, defaultOpen, sessionTypeId, onStartSession }) {
  const [open, setOpen]         = useState(defaultOpen)
  const [equipIdx, setEquipIdx] = useState(0)
  const [swaps, setSwaps]       = useState({})       // { [originalId]: replacementExercise }
  const [swapping, setSwapping] = useState(null)     // exercise being swapped

  // Apply swaps to a variant
  const applySwaps = (v) => {
    if (!v || !Object.keys(swaps).length) return v
    const mapEx = ex => swaps[ex.id] ? { ...swaps[ex.id], sets: ex.sets, reps: ex.reps, rest: ex.rest, rir: ex.rir, _phase: ex._phase } : ex
    return {
      ...v,
      solo: v.solo?.map(mapEx) || [],
      pairs: v.pairs?.map(p => ({ ...p, exercises: p.exercises.map(mapEx) })) || [],
    }
  }

  const rawVariant   = plan.variants[equipIdx]
  const variant      = applySwaps(rawVariant)
  const equipTypes   = EQUIPMENT_PROFILES[equipIdx]?.types
  const hasEx        = variant && (variant.solo?.length > 0 || variant.pairs?.length > 0)
  const prioColor    = PRIORITY_COLOR[plan.priority] || 'var(--text3)'
  const summary      = hasEx ? calcSummary(variant, plan.warmup || [], SESSION_TYPES[sessionTypeId] || {}) : []
  const totalMins    = summary.find(s => s[1] === 'Est. Time')?.[0] || ''
  const swapCount    = Object.keys(swaps).length

  return (
    <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden', border: `1px solid ${defaultOpen ? 'var(--green)' : 'var(--border)'}` }}>
      {/* ── Header ── */}
      <div onClick={() => setOpen(o => !o)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '1.5rem' }}>{plan.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{plan.name}</span>
            <Badge color={prioColor}>{plan.priority}</Badge>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>{plan.description}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{totalMins}</div>
        </div>
        <span style={{ color: 'var(--text3)', fontSize: '0.8rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
      </div>

      {open && (
        <>
          {/* Reasoning */}
          {plan.reasoning?.length > 0 && <ReasoningPanel reasoning={plan.reasoning} />}

          {/* Equipment selector */}
          <div style={{ padding: '10px 16px 10px', borderBottom: '1px solid var(--bg4)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EQUIPMENT_PROFILES.map((ep, i) => (
              <button
                key={ep.id}
                onClick={e => { e.stopPropagation(); setEquipIdx(i) }}
                style={{
                  padding: '5px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.8125rem',
                  background: equipIdx === i ? 'var(--green)' : 'var(--bg3)',
                  color: equipIdx === i ? '#000' : 'var(--text2)',
                  fontWeight: equipIdx === i ? 700 : 400, transition: 'all 0.12s',
                }}
              >
                {ep.emoji} {ep.label}
              </button>
            ))}
          </div>

          {/* Muscles chips */}
          <div style={{ padding: '10px 16px 6px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {plan.muscles.map(m => (
              <span key={m} style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 999, background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                {MUSCLE_GROUPS[m]?.label}
              </span>
            ))}
          </div>

          {/* Session body */}
          <div style={{ padding: '4px 16px 12px' }}>
            {swapCount > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                🔄 {swapCount} exercise{swapCount > 1 ? 's' : ''} swapped
                <button onClick={() => setSwaps({})} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '0.7rem', textDecoration: 'underline', padding: 0 }}>Reset</button>
              </div>
            )}
            {!hasEx ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text3)', fontSize: '0.875rem' }}>
                No exercises for this equipment — try Full Gym or Dumbbells.
              </div>
            ) : (
              <SessionBody
                variant={variant}
                warmup={plan.warmup || []}
                sessionTypeId={sessionTypeId}
                onSwapRequest={ex => setSwapping(ex)}
              />
            )}
          </div>

          {/* Swap Modal */}
          {swapping && (
            <SwapModal
              ex={swapping}
              equipmentTypes={equipTypes}
              onSwap={replacement => setSwaps(s => ({ ...s, [swapping.id]: replacement }))}
              onClose={() => setSwapping(null)}
            />
          )}

          {/* Summary bar + Start button */}
          {hasEx && (
            <div style={{ padding: '10px 16px 14px', background: 'var(--bg3)' }}>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                {summary.map(([val, lbl]) => (
                  <div key={lbl} style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--green)' }}>{val}</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lbl}</div>
                  </div>
                ))}
              </div>
              {onStartSession && (
                <button
                  className="btn btn-primary btn-full"
                  onClick={() => {
                    const allEx = [
                      ...(variant.pairs || []).flatMap(p => p.exercises),
                      ...(variant.solo || []),
                    ]
                    onStartSession(planExercisesToSession(allEx))
                  }}
                >
                  ▶ Start This Session
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Recommendations({ onStartSession }) {
  const { profile, sessions, goals } = useStore()
  const [sessionTypeId, setSessionTypeId] = useState('standard')

  if (!profile) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', gap: 12 }}>
        <div style={{ fontSize: 48 }}>🎯</div>
        <h2>Complete Onboarding</h2>
        <p style={{ color: 'var(--text2)' }}>Set up your profile to get personalised workout recommendations.</p>
      </div>
    )
  }

  const customWeights = Object.keys(goals).length > 0 ? goals : null
  const { workoutPlans, topMuscles, message, insights, muscleScores } =
    getRecommendations(sessions, profile, customWeights, sessionTypeId)
  const deloadAlerts = detectDeloadNeed(sessions)

  const sessionType = SESSION_TYPES[sessionTypeId]

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Next Session</h1>
        <p>Smart sessions — adapts to your recovery, goals &amp; time.</p>
      </div>

      {/* Auto-deload banner */}
      {deloadAlerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            background: deloadAlerts[0].severity === 'urgent' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${deloadAlerts[0].severity === 'urgent' ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)'}`,
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 6, color: deloadAlerts[0].severity === 'urgent' ? '#f87171' : '#f59e0b' }}>
              {deloadAlerts[0].severity === 'urgent' ? '🚨 Deload Recommended' : '⚠️ Deload Suggested'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: 8 }}>
              {deloadAlerts.length === 1
                ? `${deloadAlerts[0].label} has been trained at or above ${deloadAlerts[0].severity === 'urgent' ? 'MRV' : 'MAV'} for ${deloadAlerts[0].severity === 'urgent' ? deloadAlerts[0].weeksAboveMRV : deloadAlerts[0].weeksAboveMAV} consecutive weeks.`
                : `${deloadAlerts.length} muscle groups (${deloadAlerts.slice(0,3).map(a => a.label).join(', ')}) are consistently above volume landmarks.`}
              {' '}Running a deload week reduces injury risk and allows full recovery.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {deloadAlerts.slice(0, 4).map(a => (
                <span key={a.muscle} style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 999, background: a.severity === 'urgent' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: a.severity === 'urgent' ? '#f87171' : '#f59e0b', border: `1px solid ${a.severity === 'urgent' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                  {a.label} · {a.severity === 'urgent' ? `${a.weeksAboveMRV}w ≥ MRV` : `${a.weeksAboveMAV}w ≥ MAV`}
                </span>
              ))}
            </div>
            <button
              onClick={() => setSessionTypeId('deload')}
              style={{ marginTop: 10, padding: '7px 16px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: 600 }}
            >
              🧘 Switch to Deload Session
            </button>
          </div>
        </div>
      )}

      {/* Session type picker */}
      <SessionTypePicker selected={sessionTypeId} onChange={setSessionTypeId} />

      {/* Active session type info */}
      <div style={{
        background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.20)',
        borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16,
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <span style={{ fontSize: '1.25rem' }}>{sessionType.emoji}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{sessionType.label}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>{sessionType.desc}</div>
        </div>
      </div>

      {/* Weekly challenge gamification */}
      <WeeklyChallenge sessions={sessions} goals={goals} goalId={profile.physiqueGoal || 'overall_size'} />

      {/* Volume focus banner */}
      <div style={{
        background: topMuscles.length ? 'rgba(34,197,94,0.06)' : 'var(--bg2)',
        border: `1px solid ${topMuscles.length ? 'rgba(34,197,94,0.20)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 20,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '1.125rem' }}>🎯</span>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.875rem' }}>Volume Focus</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.6 }}>{message}</div>
          {topMuscles.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {topMuscles.map((m, i) => (
                <Badge key={m} color={i === 0 ? 'var(--red)' : i === 1 ? 'var(--yellow)' : 'var(--blue)'}>
                  {MUSCLE_GROUPS[m]?.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workout plans */}
      <div className="section-title" style={{ marginBottom: 12 }}>
        Generated Sessions — ranked by your deficits &amp; recovery
      </div>

      {sessions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: '0.875rem', marginBottom: 16 }}>
          Log your first workout for data-driven recommendations. Showing goal-based plans for now.
        </div>
      )}

      {workoutPlans.map((plan, i) => (
        <WorkoutCard
          key={`${plan.id}-${sessionTypeId}`}
          plan={plan}
          defaultOpen={i === 0}
          sessionTypeId={sessionTypeId}
          onStartSession={onStartSession}
        />
      ))}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="section" style={{ marginTop: 8 }}>
          <div className="section-title">Training Insights</div>
          {insights.slice(0, 5).map((ins, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              background: ins.type === 'warning' ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)',
              border: `1px solid ${ins.type === 'warning' ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.25)'}`,
              borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 8,
            }}>
              <span style={{ flexShrink: 0 }}>{ins.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
              <span style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{ins.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Volume urgency ranking */}
      <div className="section">
        <div className="section-title">Volume Urgency by Muscle</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {muscleScores.slice(0, 10).map(({ muscle, label, status, urgency }) => (
            <div key={muscle} className="card card-sm">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: urgency > 60 ? 'var(--red)' : urgency > 20 ? 'var(--yellow)' : 'var(--green)' }} />
                <span style={{ flex: 1, fontSize: '0.9375rem' }}>{label}</span>
                <span className={`badge ${status.cls}`}>{status.label}</span>
                <div style={{ width: 60 }}>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{
                      width: `${Math.min(100, urgency)}%`,
                      background: urgency > 60 ? 'var(--red)' : urgency > 20 ? 'var(--yellow)' : 'var(--green)',
                    }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
