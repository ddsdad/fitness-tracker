import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { sanitize } from '../../utils/sanitize.js'
import { FIBER_PROFILES } from '../../utils/weekPlanner.js'

const ACTIVITY = [
  { id: 'sedentary',   label: 'Sedentary' },
  { id: 'light',       label: 'Light' },
  { id: 'moderate',    label: 'Moderate' },
  { id: 'active',      label: 'Active' },
  { id: 'very_active', label: 'Very Active' },
]

export default function Settings({ onClose }) {
  const store = useStore()
  const { profile, setProfile, user, signOut, resetApp, convertAllUnits,
          sessions, checkins, goals, nutritionLogs, measurementHistory, recipes,
          customExercises, routines } = store

  const [name, setName]       = useState(profile?.name || '')
  const [age, setAge]         = useState(profile?.age || '')
  const [gender, setGender]   = useState(profile?.gender || 'male')
  const [unit, setUnit]       = useState(profile?.unit || 'kg')
  const [activity, setActivity] = useState(profile?.activityLevel || 'moderate')
  const [saved, setSaved]     = useState(false)

  const save = () => {
    const curUnit = profile?.unit || 'kg'
    // Save non-weight fields keeping the current unit; conversion handles the unit switch
    setProfile({ ...profile, name: sanitize(name), age: parseInt(age) || profile?.age, gender, activityLevel: activity, unit: curUnit })
    if (unit !== curUnit) convertAllUnits(unit)   // converts every stored weight & length
    setSaved(true); setTimeout(() => setSaved(false), 1500)
  }

  const exportData = () => {
    const payload = { exportedAt: new Date().toISOString(), profile, sessions, checkins, goals, nutritionLogs, measurementHistory, recipes, customExercises, routines }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `fittrack-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  const Field = ({ label, children }) => (
    <div style={{ marginBottom: 14 }}>
      <label>{label}</label>
      {children}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 500, overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1>Settings</h1>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: '1.25rem', padding: '4px 12px' }}>✕</button>
        </div>

        {/* Account */}
        <div className="section">
          <div className="section-title">Account</div>
          <div className="card">
            {user ? (
              <>
                <div style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>Signed in as</div>
                <div style={{ fontWeight: 600, marginBottom: 12, wordBreak: 'break-all' }}>{user.email}</div>
                <button className="btn btn-secondary btn-full" onClick={async () => { await signOut(); onClose() }}>Sign Out</button>
              </>
            ) : (
              <div style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>
                Not signed in — your data is on this device only. Sign in from the welcome screen to sync across devices.
              </div>
            )}
          </div>
        </div>

        {/* Profile */}
        <div className="section">
          <div className="section-title">Profile</div>
          <div className="card">
            <Field label="Name"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></Field>
            <div className="grid-2">
              <Field label="Age"><input className="input" type="number" inputMode="numeric" value={age} onChange={e => setAge(e.target.value)} placeholder="25" /></Field>
              <Field label="Units">
                <div style={{ display: 'flex', gap: 6 }}>
                  {['kg','lbs'].map(u => (
                    <button key={u} onClick={() => setUnit(u)} style={{ flex: 1, padding: '11px', borderRadius: 8, border: `1px solid ${unit === u ? 'var(--green)' : 'var(--border)'}`, background: unit === u ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: unit === u ? 'var(--green)' : 'var(--text2)', fontWeight: unit === u ? 700 : 400, cursor: 'pointer' }}>{u}</button>
                  ))}
                </div>
              </Field>
            </div>
            <Field label="Gender">
              <div style={{ display: 'flex', gap: 6 }}>
                {['male','female'].map(g => (
                  <button key={g} onClick={() => setGender(g)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${gender === g ? 'var(--green)' : 'var(--border)'}`, background: gender === g ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: gender === g ? 'var(--green)' : 'var(--text2)', textTransform: 'capitalize', cursor: 'pointer' }}>{g}</button>
                ))}
              </div>
            </Field>
            <Field label="Activity level (for TDEE)">
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {ACTIVITY.map(a => (
                  <button key={a.id} onClick={() => setActivity(a.id)} style={{ padding: '7px 10px', borderRadius: 999, border: `1px solid ${activity === a.id ? 'var(--green)' : 'var(--border)'}`, background: activity === a.id ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: activity === a.id ? 'var(--green)' : 'var(--text2)', fontSize: '0.75rem', cursor: 'pointer' }}>{a.label}</button>
                ))}
              </div>
            </Field>
            <Field label="Training response (volume tolerance)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.values(FIBER_PROFILES).map(f => {
                  const active = (profile?.fiberType || 'balanced') === f.id
                  return (
                    <button key={f.id} onClick={() => setProfile({ ...profile, fiberType: f.id })}
                      style={{ textAlign: 'left', padding: '9px 12px', borderRadius: 8, border: `1px solid ${active ? 'var(--green)' : 'var(--border)'}`, background: active ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', cursor: 'pointer' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: active ? 700 : 600, color: active ? 'var(--green)' : 'var(--text)' }}>{f.emoji} {f.label}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: 2, lineHeight: 1.4 }}>{f.desc}</div>
                    </button>
                  )
                })}
              </div>
            </Field>
            <button className="btn btn-primary btn-full" style={{ marginTop: 4 }} onClick={save}>{saved ? '✓ Saved' : 'Save Profile'}</button>
          </div>
        </div>

        {/* Data */}
        <div className="section">
          <div className="section-title">Data</div>
          <div className="card">
            <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: 8 }}>
              {sessions.length} workouts · {checkins.length} check-ins · {recipes.length} recipes
            </div>
            {(() => {
              try {
                const keys = ['ft_profile','ft_sessions','ft_checkins','ft_goals','ft_nutrition','ft_measurements','ft_recipes','ft_custom_exercises','ft_routines']
                const bytes = keys.reduce((t, k) => t + (localStorage.getItem(k) || '').length, 0)
                const mb = (bytes / 1024 / 1024).toFixed(2)
                const pct = Math.round(bytes / (5 * 1024 * 1024) * 100)
                const warn = bytes > 4 * 1024 * 1024
                return (
                  <div style={{ fontSize: '0.75rem', color: warn ? 'var(--red)' : 'var(--text3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {warn && <span>⚠️</span>}
                    <span>Local storage: {mb} MB used ({pct}% of ~5 MB limit){warn ? ' — export a backup soon.' : ''}</span>
                  </div>
                )
              } catch { return null }
            })()}
            <button className="btn btn-secondary btn-full" onClick={exportData}>⬇ Export Backup (JSON)</button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="section">
          <div className="section-title">Danger Zone</div>
          <div className="card">
            <button className="btn btn-danger btn-full" onClick={async () => {
              if (confirm('Reset everything? This wipes all local data and signs you out. Export a backup first if you want to keep it.')) {
                await resetApp(); onClose()
              }
            }}>Reset App & Sign Out</button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '0.7rem', marginTop: 8 }}>FitTrack v1.0</p>
      </div>
    </div>
  )
}
