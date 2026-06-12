import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { getCurrentWeek, buildWeekSummary, weekRangeLabel } from '../../utils/weekly.js'

// One compact recap card (used for both the live current week and archived weeks)
function RecapCard({ s, live }) {
  const u = s.unit || 'kg'
  const volK = s.volume >= 1000 ? `${(s.volume / 1000).toFixed(1)}k` : s.volume
  return (
    <div className="card" style={{ marginBottom: 12, borderColor: live ? 'rgba(34,197,94,0.3)' : 'var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
          Week {s.week}{live && <span className="badge badge-green" style={{ marginLeft: 8 }}>In progress</span>}
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{s.label}</span>
      </div>

      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{s.headline}</div>

      {/* Key numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
        {[
          { v: s.sessionCount, l: 'sessions' },
          { v: volK, l: `${u} vol` },
          { v: s.prs?.length || 0, l: 'PRs' },
          // protein chip only when there were actual food logs that week (logger removed)
          ...(s.daysLogged > 0 ? [{ v: `${s.proteinDays}/7`, l: 'protein' }] : [{ v: s.onTrack?.length ?? 0, l: 'on track' }]),
        ].map(x => (
          <div key={x.l} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--green)' }}>{x.v}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{x.l}</div>
          </div>
        ))}
      </div>

      {/* Volume change vs prior week */}
      {s.volChange != null && (
        <div style={{ fontSize: '0.75rem', color: s.volChange >= 0 ? 'var(--green)' : '#f59e0b', marginBottom: 8 }}>
          {s.volChange >= 0 ? '▲' : '▼'} {Math.abs(s.volChange)}% volume vs week {s.week - 1}
        </div>
      )}

      {/* PRs */}
      {s.prs?.length > 0 && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: 6 }}>
          🏆 {s.prs.slice(0, 3).map(p => `${p.name} ${p.value}${u} (+${p.gain})`).join(' · ')}
        </div>
      )}

      {/* Coverage */}
      {s.behind?.length > 0 && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: 6 }}>
          ⚠️ Lagging: <span style={{ color: '#f59e0b' }}>{s.behind.slice(0, 4).join(', ')}</span>
        </div>
      )}

      <div style={{ fontSize: '0.78rem', color: 'var(--text2)', borderTop: '1px solid var(--bg3)', paddingTop: 8, marginTop: 4 }}>
        <strong style={{ color: 'var(--text)' }}>Focus:</strong> {s.focus}
      </div>
    </div>
  )
}

export default function WeeklySummary() {
  const { profile, sessions, nutritionLogs, weekSummaries } = useStore()
  const [showAll, setShowAll] = useState(false)
  if (!profile?.startDate) return null

  const currentWeek = getCurrentWeek(profile.startDate)
  // Live, recomputed summary for the in-progress week
  const liveSummary = buildWeekSummary(currentWeek, sessions, nutritionLogs, profile)

  const archived = (weekSummaries || []).filter(s => s.week < currentWeek).sort((a, b) => b.week - a.week)
  const shown = showAll ? archived : archived.slice(0, 2)

  return (
    <div className="section">
      <div className="section-title">Weekly Summary</div>

      {/* Current week (live) */}
      <RecapCard s={liveSummary} live />

      {/* Archived weeks */}
      {archived.length > 0 && (
        <>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 0 10px' }}>
            Past Weeks · auto-saved
          </div>
          {shown.map(s => <RecapCard key={s.week} s={s} />)}
          {archived.length > 2 && (
            <button
              onClick={() => setShowAll(v => !v)}
              style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              {showAll ? 'Show less' : `Show all ${archived.length} weeks`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
