import { IconCheck } from '../shared/Icons.jsx'

const SET_TYPES = ['normal', 'drop', 'amrap', 'failure']
const SET_TYPE_META = {
  normal:  { color: 'var(--text3)' },
  drop:    { label: 'D', color: 'var(--blue)',   title: 'Drop set' },
  amrap:   { label: 'A', color: 'var(--green)',  title: 'AMRAP (as many reps as possible)' },
  failure: { label: 'F', color: 'var(--red)',    title: 'To failure' },
}

function plateConfig(unit) {
  return unit === 'lbs'
    ? { plates: [45, 35, 25, 10, 5, 2.5], bar: 45 }
    : { plates: [25, 20, 15, 10, 5, 2.5, 1.25], bar: 20 }
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

export default function SetRow({ set, idx, onUpdate, onDelete, onSetComplete, suggestedWeight, showPlates, unit = 'kg' }) {
  const plates = showPlates && set.weight > 0 ? platesPerSide(set.weight, unit) : null
  const type = set.type || 'normal'
  const meta = SET_TYPE_META[type]
  const cycleType = () => {
    if (set.warmup) return
    const i = SET_TYPES.indexOf(type)
    onUpdate({ ...set, type: SET_TYPES[(i + 1) % SET_TYPES.length] })
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: plates ? 2 : 8 }}>
        <button onClick={cycleType} title={set.warmup ? 'Warm-up' : (meta.title || 'Tap to tag set type')}
          style={{ background: 'none', border: 'none', cursor: set.warmup ? 'default' : 'pointer', color: set.warmup ? 'var(--yellow)' : meta.color, fontSize: '0.8125rem', textAlign: 'center', fontWeight: (set.warmup || type !== 'normal') ? 700 : 400, padding: 0 }}>
          {set.warmup ? 'W' : (meta.label || idx + 1)}
        </button>

        <div className="input-unit" style={{ position: 'relative' }}>
          <input
            className="input"
            type="number" inputMode="decimal"
            placeholder={suggestedWeight ? String(suggestedWeight) : '0'}
            value={set.weight || ''}
            style={{ padding: '8px 36px 8px 10px', fontSize: '0.9375rem', background: set.done ? 'rgba(34,197,94,0.08)' : undefined }}
            onChange={e => onUpdate({ ...set, weight: Math.min(2000, Math.max(0, parseFloat(e.target.value) || 0)) })}
          />
          <span style={{ right: 8, fontSize: '0.75rem', position: 'absolute', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }}>{unit}</span>
        </div>

        <input
          className="input"
          type="number" inputMode="numeric"
          placeholder="0"
          value={set.reps || ''}
          style={{ padding: '8px 10px', fontSize: '0.9375rem', textAlign: 'center', background: set.done ? 'rgba(34,197,94,0.08)' : undefined }}
          onChange={e => onUpdate({ ...set, reps: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
        />

        <input
          className="input"
          type="number" inputMode="numeric"
          placeholder="90"
          value={set.restSeconds || ''}
          style={{ padding: '8px 10px', fontSize: '0.9375rem', textAlign: 'center' }}
          onChange={e => onUpdate({ ...set, restSeconds: parseInt(e.target.value) || 90 })}
        />

        <button
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: set.done ? 'var(--green)' : 'var(--bg4)', color: set.done ? '#000' : 'var(--text2)', transition: 'all 0.15s' }}
          onClick={() => onSetComplete(set)}
        >
          <IconCheck />
        </button>
      </div>
      {plates && (
        <div style={{ gridColumn: '2 / 5', fontSize: '0.7rem', color: 'var(--text3)', marginBottom: 8, paddingLeft: 4 }}>
          🏋️ Per side: {plates.length ? plates.map(p => `${p}`).join(' + ') + ` ${unit}` : `just the bar (${plateConfig(unit).bar}${unit})`}
        </div>
      )}
    </>
  )
}
