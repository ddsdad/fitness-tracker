import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { e1rmTrend, exerciseDetail } from '../../utils/analytics.js'

export default function ExerciseDetailModal({ sessions, exerciseId, name, unit, onClose }) {
  const rows    = exerciseDetail(sessions, exerciseId).slice(0, 10)
  const allTime = rows.reduce((m, r) => Math.max(m, r.e1rm), 0)
  const trend   = e1rmTrend(sessions, exerciseId)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--bg2)', marginTop: 'auto', borderRadius: '16px 16px 0 0', maxHeight: '88dvh', overflowY: 'auto', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3>{name}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
              All-time est. 1RM: <strong style={{ color: 'var(--green)' }}>{allTime}{unit}</strong>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: '1.25rem' }}>✕</button>
        </div>
        {trend.length >= 2 && (
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg4)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem' }} />
              <Line type="monotone" dataKey="e1rm" stroke="var(--green)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', margin: '12px 0 6px' }}>
          Last {rows.length} sessions
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--bg3)' }}>
            <div style={{ flex: 1, fontSize: '0.8125rem' }}>{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text2)' }}>{r.sets} sets</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>top {r.topSet.weight}×{r.topSet.reps}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--yellow)' }}>{r.e1rm}{unit}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
