import { useState } from 'react'
import { IconCheck } from '../shared/Icons.jsx'

export default function EditMeasurementModal({ metric, label, currentValue, unit, onSave, onClose }) {
  const [value, setValue] = useState('')

  const save = () => {
    const v = parseFloat(value)
    if (isNaN(v) || v <= 0) return
    onSave(metric, v)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: 'var(--bg2)', borderRadius: '16px 16px 0 0', padding: '24px 20px 36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3>Update {label}</h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 12px' }}>✕</button>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: 12 }}>
          Current: <strong>{currentValue} {unit}</strong>
        </div>
        <div className="input-unit" style={{ marginBottom: 16 }}>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder={String(currentValue)}
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
          />
          <span>{unit}</span>
        </div>
        {value && parseFloat(value) > 0 && (
          <div style={{ fontSize: '0.8rem', color: parseFloat(value) > currentValue ? 'var(--green)' : 'var(--red)', marginBottom: 14 }}>
            {parseFloat(value) > currentValue ? '▲' : '▼'} {Math.abs(parseFloat(value) - currentValue).toFixed(1)} {unit} from current
          </div>
        )}
        <button className="btn btn-primary btn-full" onClick={save} disabled={!value || parseFloat(value) <= 0}>
          <IconCheck /> Save Update
        </button>
      </div>
    </div>
  )
}
