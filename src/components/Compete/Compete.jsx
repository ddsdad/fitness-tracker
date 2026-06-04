import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore.js'
import { fetchLeaderboard, createLeague, joinLeague, leaveLeague, getMyLeagues, getLeagueMemberIds } from '../../lib/db.js'
import { LEADERBOARD_CATEGORIES, getClimbHint, getRankEmoji } from '../../utils/leaderboard.js'
import { computeAchievements, achievementSummary } from '../../utils/achievements.js'
import { gameStats, SHOP, THEMES } from '../../utils/gamification.js'

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

// ── Achievements grid ─────────────────────────────────────────────────────────
function AchievementsView() {
  const { sessions, profile, measurementHistory, nutritionLogs } = useStore()
  const achievements = computeAchievements({ sessions, profile, measurementHistory, nutritionLogs: nutritionLogs || {} })
  const { earned, total } = achievementSummary(achievements)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>Achievements</div>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--green)', fontWeight: 700 }}>{earned}/{total} unlocked</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {achievements.map(a => (
          <div key={a.id} style={{
            background: a.earned ? 'rgba(34,197,94,0.08)' : 'var(--bg2)',
            border: `1px solid ${a.earned ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
            borderRadius: 12, padding: '12px', opacity: a.earned ? 1 : 0.85,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.5rem', filter: a.earned ? 'none' : 'grayscale(1)' }}>{a.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: a.earned ? 'var(--green)' : 'var(--text)' }}>{a.label}</div>
              </div>
              {a.earned && <span style={{ color: 'var(--green)' }}>✓</span>}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 4, lineHeight: 1.3 }}>{a.desc}</div>
            {!a.earned && (
              <>
                <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${a.pct}%`, background: 'var(--blue)', borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text3)', marginTop: 3 }}>{a.current}/{a.target}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── League create/join modal ──────────────────────────────────────────────────
function LeagueModal({ userId, onClose, onChanged }) {
  const [mode, setMode] = useState('join') // 'join' | 'create'
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  const submit = async () => {
    setBusy(true); setErr('')
    try {
      if (mode === 'create') { if (!name.trim()) { setErr('Enter a league name'); setBusy(false); return } await createLeague(userId, name.trim()) }
      else { if (!code.trim()) { setErr('Enter a join code'); setBusy(false); return } await joinLeague(userId, code) }
      onChanged(); onClose()
    } catch (e) { setErr(e.message || 'Something went wrong') }
    setBusy(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 400, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'var(--bg2)', width: '100%', maxWidth: 480, margin: '0 auto', padding: '20px 16px 32px', borderRadius: '16px 16px 0 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Friend League</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 999, padding: 3, marginBottom: 16 }}>
          {[['join','Join'],['create','Create']].map(([id,l]) => (
            <button key={id} onClick={() => { setMode(id); setErr('') }} style={{ flex: 1, padding: '8px', borderRadius: 999, border: 'none', cursor: 'pointer', background: mode === id ? 'var(--bg2)' : 'transparent', color: mode === id ? 'var(--green)' : 'var(--text3)', fontWeight: mode === id ? 700 : 400, fontSize: '0.875rem' }}>{l}</button>
          ))}
        </div>
        {mode === 'create' ? (
          <input className="input" placeholder="League name (e.g. Gym Bros)" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 12 }} />
        ) : (
          <input className="input" placeholder="Enter 5-char join code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={5} style={{ marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
        )}
        {err && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginBottom: 10 }}>{err}</p>}
        <button className="btn btn-primary btn-full" onClick={submit} disabled={busy}>{busy ? '…' : mode === 'create' ? 'Create League' : 'Join League'}</button>
      </div>
    </div>
  )
}

// ── Shop view ─────────────────────────────────────────────────────────────────
function ShopView() {
  const { profile, sessions, measurementHistory, nutritionLogs, buyShopItem, equipTheme } = useStore()
  const [toast, setToast] = useState(null)
  const stats = gameStats(profile, sessions, measurementHistory, nutritionLogs)
  const owned = profile?.game?.owned || []
  const activeTheme = profile?.game?.theme || 'green'

  const buy = (item) => { const r = buyShopItem(item); setToast(r.message); setTimeout(() => setToast(null), 2500) }

  return (
    <div>
      {/* Balance */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(34,197,94,0.12), var(--bg2))' }}>
        <div><div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase' }}>Balance</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--green)' }}>🪙 {stats.coins}</div></div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{stats.title.emoji} Level {stats.level}</div><div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{stats.title.title}</div></div>
      </div>

      {toast && <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid var(--green)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, color: 'var(--green)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>{toast}</div>}

      {SHOP.map(item => {
        const isOwned = !item.repeatable && owned.includes(item.id)
        const isEquipped = item.kind === 'theme' && activeTheme === item.themeId
        const afford = stats.coins >= item.price
        return (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8, border: `1px solid ${isEquipped ? 'var(--green)' : 'var(--border)'}`, borderRadius: 12, background: 'var(--bg2)' }}>
            <span style={{ fontSize: '1.5rem' }}>{item.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{item.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{item.desc || (item.kind === 'theme' ? 'Re-skins the whole app' : '')}</div>
            </div>
            {isOwned && item.kind === 'theme' ? (
              isEquipped
                ? <span style={{ fontSize: '0.72rem', color: 'var(--green)', fontWeight: 700 }}>Equipped</span>
                : <button onClick={() => equipTheme(item.themeId)} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid var(--green)', background: 'transparent', color: 'var(--green)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Equip</button>
            ) : isOwned ? (
              <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Owned</span>
            ) : (
              <button onClick={() => afford && buy(item)} disabled={!afford} style={{ padding: '6px 12px', borderRadius: 999, border: 'none', background: afford ? 'var(--green)' : 'var(--bg4)', color: afford ? '#000' : 'var(--text3)', fontSize: '0.72rem', fontWeight: 700, cursor: afford ? 'pointer' : 'default', flexShrink: 0 }}>🪙 {item.price}</button>
            )}
          </div>
        )
      })}
      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text3)', marginTop: 12 }}>Earn coins by training, hitting PRs, logging nutrition & completing quests.</p>
    </div>
  )
}

// ── Main Compete view ─────────────────────────────────────────────────────────
export default function Compete() {
  const { user, profile }    = useStore()
  const [view, setView]      = useState('leaderboard') // 'leaderboard' | 'achievements'
  const [catId, setCatId]    = useState(LEADERBOARD_CATEGORIES[0].id)
  const [board, setBoard]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]    = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  // Leagues
  const [leagues, setLeagues]       = useState([])
  const [activeLeague, setActiveLeague] = useState(null) // null = Global
  const [leagueMembers, setLeagueMembers] = useState(null) // Set of user_ids or null
  const [showLeagueModal, setShowLeagueModal] = useState(false)

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

  const loadLeagues = useCallback(async () => {
    if (!user) return
    try { setLeagues(await getMyLeagues(user.id)) } catch {}
  }, [user])

  useEffect(() => { load(); loadLeagues() }, [load, loadLeagues])

  // When a league is selected, fetch its member ids to filter the board
  useEffect(() => {
    if (!activeLeague) { setLeagueMembers(null); return }
    getLeagueMemberIds(activeLeague.id).then(ids => setLeagueMembers(new Set(ids))).catch(() => setLeagueMembers(new Set()))
  }, [activeLeague])

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
        <h2 style={{ marginBottom: 8 }}>Sign In to Compete</h2>
        <p style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>
          Create an account to appear on the leaderboard, earn achievements, and join friend leagues.
        </p>
      </div>
    )
  }

  // Filter to active league members (if any), then sort by category
  const scoped = (activeLeague && leagueMembers) ? board.filter(r => leagueMembers.has(r.user_id)) : board
  const sorted = [...scoped].sort((a, b) => {
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
      {/* View toggle */}
      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 999, padding: 3, marginBottom: 16, gap: 2 }}>
        {[['leaderboard', '🏆'], ['achievements', '🎖️'], ['shop', '🛒 Shop']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{ flex: 1, padding: '8px', borderRadius: 999, border: 'none', cursor: 'pointer', background: view === id ? 'var(--bg2)' : 'transparent', color: view === id ? 'var(--green)' : 'var(--text3)', fontWeight: view === id ? 700 : 400, fontSize: '0.8125rem' }}>
            {label}
          </button>
        ))}
      </div>

      {view === 'achievements' && <AchievementsView />}
      {view === 'shop' && <ShopView />}

      {view === 'leaderboard' && <>
      {showLeagueModal && <LeagueModal userId={user.id} onClose={() => setShowLeagueModal(false)} onChanged={loadLeagues} />}

      {/* League selector */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        <button onClick={() => setActiveLeague(null)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 999, border: `1px solid ${!activeLeague ? 'var(--green)' : 'var(--border)'}`, background: !activeLeague ? 'rgba(34,197,94,0.12)' : 'var(--bg3)', color: !activeLeague ? 'var(--green)' : 'var(--text2)', fontSize: '0.78rem', fontWeight: !activeLeague ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>🌍 Global</button>
        {leagues.map(lg => (
          <button key={lg.id} onClick={() => setActiveLeague(lg)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 999, border: `1px solid ${activeLeague?.id === lg.id ? 'var(--green)' : 'var(--border)'}`, background: activeLeague?.id === lg.id ? 'rgba(34,197,94,0.12)' : 'var(--bg3)', color: activeLeague?.id === lg.id ? 'var(--green)' : 'var(--text2)', fontSize: '0.78rem', fontWeight: activeLeague?.id === lg.id ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>👥 {lg.name}</button>
        ))}
        <button onClick={() => setShowLeagueModal(true)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 999, border: '1px dashed var(--border)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>＋ League</button>
      </div>

      {/* Active league info */}
      {activeLeague && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>Join code:</span>
          <span style={{ fontWeight: 800, letterSpacing: '0.12em', color: 'var(--green)' }}>{activeLeague.code}</span>
          <button onClick={() => { try { navigator.clipboard?.writeText(activeLeague.code) } catch {} }} style={{ background: 'var(--bg3)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', color: 'var(--text2)', cursor: 'pointer' }}>Copy</button>
          <button onClick={async () => { if (confirm(`Leave ${activeLeague.name}?`)) { await leaveLeague(user.id, activeLeague.id); setActiveLeague(null); loadLeagues() } }} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '0.7rem', color: 'var(--text3)', cursor: 'pointer', textDecoration: 'underline' }}>Leave</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{activeLeague ? activeLeague.name : 'Global Leaderboard'}</h2>
          <p style={{ color: 'var(--text2)', fontSize: '0.8rem', marginTop: 2 }}>
            {scoped.length} athlete{scoped.length !== 1 ? 's' : ''} competing
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
              borderRadius: 12, padding: '16px', marginTop: 8, textAlign: 'center',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 4 }}>You're not ranked yet</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.5 }}>
                Log a workout to appear here. Your stats sync automatically when you sign in.
              </div>
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
      </>}
    </div>
  )
}
