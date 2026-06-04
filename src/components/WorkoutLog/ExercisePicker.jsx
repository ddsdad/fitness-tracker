import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { EXERCISES } from '../../data/exercises.js'
import { MUSCLE_GROUPS } from '../../data/muscles.js'
import { sanitize } from '../../utils/sanitize.js'
import { IconPlus, IconX } from '../shared/Icons.jsx'

const MUSCLE_OPTIONS = Object.keys(MUSCLE_GROUPS)

export default function ExercisePicker({ onSelect, onClose }) {
  const { customExercises, addCustomExercise } = useStore()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [cName, setCName]   = useState('')
  const [cPrim, setCPrim]   = useState('chest')
  const [cEquip, setCEquip] = useState('barbell')
  const [cCat, setCCat]     = useState('compound')

  const all = [...customExercises, ...EXERCISES]
  const results = query.length > 1
    ? all.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    : all

  const createAndSelect = () => {
    if (!cName.trim()) return
    const ex = {
      id: 'custom_' + Math.random().toString(36).slice(2, 9),
      name: sanitize(cName.trim()),
      primary: cPrim,
      secondary: [],
      category: cCat,
      equipment: cEquip,
      custom: true,
      notes: '',
    }
    addCustomExercise(ex)
    onSelect(ex)
  }

  if (creating) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 210, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'var(--bg2)', flex: 1, marginTop: 'auto', borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>New Custom Exercise</h3>
            <button className="btn btn-ghost" style={{ padding: 8 }} onClick={() => setCreating(false)}><IconX /></button>
          </div>
          <label>Name</label>
          <input className="input" value={cName} onChange={e => setCName(e.target.value)} placeholder="e.g. Smith Machine Press" autoFocus style={{ marginBottom: 12 }} />
          <label>Primary muscle</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {MUSCLE_OPTIONS.map(m => (
              <button key={m} onClick={() => setCPrim(m)} style={{ padding: '5px 10px', borderRadius: 999, border: `1px solid ${cPrim === m ? 'var(--green)' : 'var(--border)'}`, background: cPrim === m ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: cPrim === m ? 'var(--green)' : 'var(--text2)', fontSize: '0.7rem', cursor: 'pointer' }}>{MUSCLE_GROUPS[m].label}</button>
            ))}
          </div>
          <label>Equipment</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {['barbell','dumbbell','machine','cable','bodyweight','bands','kettlebell'].map(eq => (
              <button key={eq} onClick={() => setCEquip(eq)} style={{ padding: '5px 10px', borderRadius: 999, border: `1px solid ${cEquip === eq ? 'var(--green)' : 'var(--border)'}`, background: cEquip === eq ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: cEquip === eq ? 'var(--green)' : 'var(--text2)', fontSize: '0.7rem', cursor: 'pointer', textTransform: 'capitalize' }}>{eq}</button>
            ))}
          </div>
          <label>Type</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {['compound','isolation'].map(c => (
              <button key={c} onClick={() => setCCat(c)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${cCat === c ? 'var(--green)' : 'var(--border)'}`, background: cCat === c ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: cCat === c ? 'var(--green)' : 'var(--text2)', textTransform: 'capitalize', cursor: 'pointer' }}>{c}</button>
            ))}
          </div>
          <button className="btn btn-primary btn-full" onClick={createAndSelect} disabled={!cName.trim()}>Create & Add</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--bg2)', flex: 1, display: 'flex', flexDirection: 'column', marginTop: 'auto', borderRadius: '20px 20px 0 0', maxHeight: '85vh' }}>
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Select Exercise</h3>
            <button className="btn btn-ghost" style={{ padding: 8 }} onClick={onClose}><IconX /></button>
          </div>
          <input className="input" placeholder="Search exercises..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          <button className="btn btn-secondary btn-full" style={{ marginTop: 8 }} onClick={() => { setCName(query); setCreating(true) }}>
            <IconPlus /> Create custom exercise
          </button>
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
