import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore.js'
import { fetchLeaderboard } from '../../lib/db.js'
import { LEADERBOARD_CATEGORIES, getClimbHint, getRankEmoji } from '../../utils/leaderboard.js'

// ── Helpers ───────────────────────────────────────────────────────────────────
function since(ts) {
  if (!ts) return ''
  const mins = Math.round((Date.now() - new Date(ts)) / 60000)
  if (mins < 2)    return 'just now'
  if (mins < 60)   return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24)    return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

// ── Category chip row ─────────────────────────────────────────────────────────
function CategoryBar({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20, scrollbarWidth: 'none' }}>
      {LEADERBOARD_CATEGORIES.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 999,
            border: `1px solid ${selected === cat.id ? 'var(--green)' : 'var(--border)'}`,
            background: selected === cat.id ? 'rgba(34,197,94,0.12)' : 'var(--bg3)',
            color: selected === cat.id ? 'var(--green)' : 'var(--text2)',
            fontSize: '0.8125rem', fontWeight: selected === cat.id ? 600 : 400,
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
        >
          {cat.emoji} {cat.label}
        </button>
      ))}
    </div>
  )
}

// ── Single rank row ───────────────────────────────────────────────────────────
function RankRow({ entry, rank, isMe, cat, leaderValue }) {
  const val    = entry?.stats?.[cat.key] ?? 0
  const unit   = entry?.stats?.unit || 'kg'
  const pct    = leaderValue > 0 ? Math.max(4, Math.round((val / leaderValue) * 100)) : 4
  const rankEl = getRankEmoji(rank)
  const isTop  = rank <= 3

  return (
    <div style={{
      background: isMe ? 'rgba(34,197,94,0.08)' : 'var(--bg2)',
      border: `1px solid ${isMe ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
      borderRadius: 12, padding: '14px 16px', marginBottom: 8,
      transition: 'border-color 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Rank badge */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: isTop ? (rank === 1 ? '#f59e0b20' : rank === 2 ? '#94a3b820' : '#cd7c2220') : 'var(--bg3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isTop ? '1.125rem' : '0.875rem',
          fontWeight: 700, color: isTop ? undefined : 'var(--text3)',
        }}>
          {rankEl}
        </div>

        {/* Name + stat */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontWeight: isMe ? 700 : 500,
              fontSize: '0.9375rem',
              color: isMe ? 'var(--green)' : 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%',
            }}>
              {entry.display_name}{isMe ? ' (you)' : ''}
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: isMe ? 'var(--green)' : 'var(--text)' }}>
              {cat.format(val, unit)}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 6, height: 4, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${pct}%`,
              background: isMe ? 'var(--green)' : rank === 1 ? '#f59e0b' : 'var(--blue)',
              transition: 'width 0.6s ease',
            }} />
          </div>

          {/* Updated label */}
          <div style={{ fontSize: '0.6875rem', color: 'var(--text3)', marginTop: 4 }}>
            Updated {since(entry.updated_at)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Compete view ─────────────────────────────────────────────────────────
export default function Compete() {
  const { user, profile }    = useStore()
  const [catId, setCatId]    = useState(LEADERBOARD_CATEGORIES[0].id)
  const [board, setBoard]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]    = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const cat = LEADERBOARD_CATEGORIES.find(c => c.id === catId) || LEADERBOARD_CATEGORIES[0]

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await fetchLeaderboard()
      setBoard(data)
      setLastRefresh(new Date())
    } catch (e) {
      setError('Could not load leaderboard. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
        <h2 style={{ marginBottom: 8 }}>Sign In to Compete</h2>
        <p style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>
          Create an account to appear on the leaderboard and compete with other athletes.
        </p>
      </div>
    )
  }

  // Sort by selected category (higher = better for all current cats)
  const sorted = [...board].sort((a, b) => {
    const av = a.stats?.[cat.key] ?? 0
    const bv = b.stats?.[cat.key] ?? 0
    return cat.higherIsBetter ? bv - av : av - bv
  })

  const myUserId    = user?.id
  const myRank      = sorted.findIndex(r => r.user_id === myUserId) + 1
  const climbHint   = getClimbHint(sorted, myUserId, cat)
  const leaderValue = sorted[0]?.stats?.[cat.key] ?? 0
  const myEntry     = sorted.find(r => r.user_id === myUserId)
  const myVal       = myEntry?.stats?.[cat.key] ?? 0

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Leaderboard</h2>
          <p style={{ color: 'var(--text2)', fontSize: '0.8rem', marginTop: 2 }}>
            {board.length} athlete{board.length !== 1 ? 's' : ''} competing
          </p>
        </div>
        <button
          onClick={load}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: '0.8rem', color: 'var(--text2)', cursor: 'pointer' }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Category chips */}
      <CategoryBar selected={catId} onSelect={setCatId} />

      {/* Current category header */}
      <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.25rem' }}>{cat.emoji}</div>
          <div style={{ fontWeight: 700, marginTop: 2 }}>{cat.label}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 1 }}>{cat.period}</div>
        </div>
        {myRank > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: myRank <= 3 ? 'var(--green)' : 'var(--text)' }}>
              {getRankEmoji(myRank)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginTop: 2 }}>Your rank</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--green)', marginTop: 1 }}>
              {cat.format(myVal, myEntry?.stats?.unit || 'kg')}
            </div>
          </div>
        )}
      </div>

      {/* Climb hint */}
      {climbHint && climbHint !== "🥇 You're leading!" && (
        <div style={{
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          fontSize: '0.8125rem', color: 'var(--blue)', lineHeight: 1.4,
        }}>
          🎯 {climbHint} to climb to rank #{myRank - 1}
        </div>
      )}
      {climbHint === "🥇 You're leading!" && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          fontSize: '0.8125rem', color: '#f59e0b',
        }}>
          🥇 You're leading this category — defend your spot!
        </div>
      )}

      {/* Rankings */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
          Loading leaderboard…
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--red)', fontSize: '0.875rem' }}>{error}</div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏁</div>
          <p style={{ fontWeight: 600 }}>No athletes yet</p>
          <p style={{ fontSize: '0.875rem', marginTop: 6 }}>You'll appear here automatically once you log a workout.</p>
        </div>
      ) : (
        <div>
          {sorted.map((entry, i) => (
            <RankRow
              key={entry.user_id}
              entry={entry}
              rank={i + 1}
              isMe={entry.user_id === myUserId}
              cat={cat}
              leaderValue={leaderValue}
            />
          ))}

          {/* Not on board yet */}
          {myRank === 0 && (
            <div style={{
              background: 'rgba(34,197,94,0.06)', border: '1px dashed rgba(34,197,94,0.3)',
              borderRadius: 12, padding: '14px 16px', marginTop: 8,
              fontSize: '0.875rem', color: 'var(--text2)', textAlign: 'center',
            }}>
              Log a workout to appear on the leaderboard! Your stats sync automatically.
            </div>
          )}
        </div>
      )}

      {/* Last refreshed */}
      {lastRefresh && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text3)', marginTop: 16 }}>
          Last updated {lastRefresh.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}
