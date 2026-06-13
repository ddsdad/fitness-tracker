import { useMemo, useState, useEffect } from 'react'
import { useStore } from '../../store/useStore.js'
import { getProgramStatus, SPLIT_META, splitVariant, generateProgramWorkout, readinessAdjustment } from '../../utils/program.js'
import { calculateTDEE, calculateMacroTargets, adaptiveTDEE, effectiveTDEE } from '../../utils/nutrition.js'
import { computePRs } from '../../utils/analytics.js'
import { gameStats } from '../../utils/gamification.js'
import { currentStreak } from '../../utils/streak.js'
import { computeAura } from '../../utils/aura.js'
import { notifyState, requestNotify, scheduleDailyNudges } from '../../utils/notify.js'
import { planExercisesToSession } from '../../utils/planSession.js'
import SystemPanel from './SystemPanel.jsx'
import HeroBanner from './HeroBanner.jsx'

const TODAY = new Date().toISOString().slice(0, 10)

export default function Today({ onNavigate, onStartSession, embedded = false }) {
  const { profile, sessions, nutritionLogs, measurementHistory, useStreakShield, markLevelSeen } = useStore()
  const [levelUp, setLevelUp] = useState(null)

  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' })()
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // ── Program / today's workout ──
  const prog = profile?.program ? getProgramStatus(profile.program) : null
  const split = prog && !prog.notStarted && !prog.finished ? prog.split : null
  const splitMeta = split ? SPLIT_META[split] : null
  const trainedToday = sessions.some(s => s.date?.slice(0, 10) === TODAY)
  const readiness = (() => { try { return (JSON.parse(localStorage.getItem('ft_readiness')) || {})[TODAY] || null } catch { return null } })()

  // ── Nutrition ──
  const bwKg = profile?.unit === 'kg' ? profile.bodyweight : profile.bodyweight / 2.2046
  const todayLog = nutritionLogs[TODAY] || { meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, extraActivities: [] }
  const todaySessions = sessions.filter(s => s.date?.startsWith(TODAY))
  const tdee = calculateTDEE(profile, todaySessions, todayLog.extraActivities || [])
  const adaptive = useMemo(() => adaptiveTDEE(nutritionLogs, measurementHistory, profile?.unit), [nutritionLogs, measurementHistory, profile?.unit])
  const effT = effectiveTDEE(tdee.total, adaptive)
  const nutritionGoal = (profile?.caloricMode === 'cut' || profile?.physiqueGoal === 'lean_athletic') ? 'fat_loss' : profile?.physiqueGoal === 'stronger_legs' ? 'strength' : 'muscle'
  const targets = calculateMacroTargets(effT.value, nutritionGoal, bwKg, profile?.caloricMode || 'lean_bulk')

  // ── Streak + next PR ──
  const streak = currentStreak(sessions, profile?.game?.shieldDates || [])
  const { feed } = useMemo(() => computePRs(sessions), [sessions])
  const lastPR = feed[0]
  const u = profile?.unit || 'kg'

  // weigh-in today?
  const weighedToday = measurementHistory.some(r => r.metric === 'bodyweight' && r.date === TODAY)

  // ── Gamification ──
  const game = useMemo(() => gameStats(profile, sessions, measurementHistory, nutritionLogs), [profile, sessions, measurementHistory, nutritionLogs])

  // Detect level-up → celebrate + grant bonus (once)
  const seenLevel = profile?.game?.seenLevel || 1
  useEffect(() => {
    if (game.level > seenLevel) { setLevelUp(game.level); markLevelSeen(game.level) }
  }, [game.level, seenLevel, markLevelSeen])

  // Schedule local "pull-back-in" notifications (only if user granted permission)
  const [notifPerm, setNotifPerm] = useState(notifyState())
  useEffect(() => {
    if (notifPerm !== 'granted') return
    const aura = computeAura(sessions, profile?.game?.shieldDates || [])
    scheduleDailyNudges({ hour: 18, trainedToday, aura, split })
  }, [notifPerm, trainedToday, split, sessions])
  const enableNotifs = async () => setNotifPerm(await requestNotify())

  const body = (
    <>
      {/* ── Level-up celebration ── */}
      {levelUp && (
        <div onClick={() => setLevelUp(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 12, animation: 'fadeIn 0.4s' }}>{game.title.emoji}</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--green)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Level Up!</div>
          <h1 style={{ margin: '8px 0' }}>Level {levelUp} · {game.title.title}</h1>
          <p style={{ color: 'var(--text2)', maxWidth: 320, marginBottom: 8 }}>You've put in the work. Keep stacking PRs and streaks to keep climbing.</p>
          <div style={{ display: 'inline-block', background: 'rgba(34,197,94,0.12)', border: '1px solid var(--green)', borderRadius: 999, padding: '6px 16px', marginBottom: 24, fontWeight: 800, color: 'var(--green)' }}>+30 🪙 bonus</div>
          <button className="btn btn-primary" style={{ minWidth: 200 }} onClick={() => setLevelUp(null)}>Let's go 💪</button>
        </div>
      )}

      {/* ── HERO — rank, power, today's mission ── */}
      {(() => {
        // Mission label + action depend on program/rest/done state
        let label = '▶ Begin Today\'s Mission', sub = null, ready = true
        let action = () => onNavigate?.('recommend')
        if (trainedToday) { label = '✅ Mission Complete'; sub = 'Recovery & fuel from here — your shadow rests.'; ready = false }
        else if (split === 'rest') { label = '😴 Rest Day'; sub = 'Recover, eat protein, sleep. Strength is built in rest.'; ready = false }
        else if (splitMeta) {
          label = `▶ Begin ${splitMeta.label}`
          sub = `Week ${prog.week} · ${prog.weekPlan.phase}${readiness ? ` · Readiness ${readiness.score}/100` : ''}`
          action = () => {
            const variant = splitVariant(profile.program.schedule, prog.dayInWeek)
            const wk = generateProgramWorkout(split, prog.weekPlan, variant)
            onStartSession?.(planExercisesToSession(wk))
          }
        } else {
          sub = 'A smart session tailored to your recovery awaits.'
        }
        return <HeroBanner onPrimary={action} primaryLabel={label} primaryReady={ready} subtitle={sub} />
      })()}

      {/* ── The System — smart daily quests ── */}
      <SystemPanel readinessScore={readiness?.score} />

      {/* Notification opt-in (only when not yet decided) */}
      {notifPerm === 'default' && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.5rem' }}>🔔</span>
          <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text2)' }}>Let the System summon you — daily mission reminders & aura-danger alerts.</div>
          <button className="btn btn-secondary" style={{ flexShrink: 0, padding: '8px 14px', fontSize: '0.8rem' }} onClick={enableNotifs}>Enable</button>
        </div>
      )}

      {/* readiness warning (when low) */}
      {!trainedToday && splitMeta && (() => {
        const adj = readiness ? readinessAdjustment(readiness.score) : null
        if (adj && adj.label !== 'Primed' && adj.label !== 'Ready') {
          return (
            <div style={{ background: `${adj.color}18`, border: `1px solid ${adj.color}44`, borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: '0.8rem', color: adj.color, lineHeight: 1.5 }}>
              <strong>{adj.label}:</strong> {adj.message}
            </div>
          )
        }
        return null
      })()}

      {/* ── Fuel targets (logger removed — see Plan → Fuel for the full recommender) ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fuel Targets</span>
          <button onClick={() => onNavigate?.('recommend')} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer' }}>🥩 What to eat →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[[targets.kcal, 'kcal'], [`${targets.protein}g`, 'protein'], [`${targets.carbs}g`, 'carbs'], [`${targets.fat}g`, 'fat']].map(([v, l]) => (
            <div key={l} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '8px 4px', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--green)' }}>{v}</div>
              <div style={{ fontSize: '0.58rem', color: 'var(--text3)', textTransform: 'uppercase' }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 8 }}>
          ~{Math.round(bwKg * 0.4)}g protein per main meal{effT.source !== 'estimate' && ` · adaptive TDEE ${effT.value}`}
        </div>
      </div>

      {/* ── Stat row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: streak >= 3 ? 'var(--green)' : 'var(--text)' }}>{streak === 0 ? '—' : `${streak}🔥`}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: 2 }}>DAY STREAK</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 14, cursor: 'pointer' }} onClick={() => onNavigate?.('progress')}>
          {lastPR ? (
            <>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastPR.e1rm}{u}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: 2 }}>LATEST PR · {lastPR.name.slice(0, 14)}</div>
            </>
          ) : (
            <><div style={{ fontSize: '1.5rem' }}>🏆</div><div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: 2 }}>NO PRs YET</div></>
          )}
        </div>
      </div>

      {/* ── Streak shield ── */}
      {!trainedToday && (profile?.game?.shields || 0) > 0 && !(profile?.game?.shieldDates || []).includes(TODAY) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 10 }}>
          <span>🛡️</span>
          <div style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text2)' }}>Can't train today? Use a Streak Shield to protect your {streak}-day streak ({profile.game.shields} owned).</div>
          <button onClick={() => useStreakShield(TODAY)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 999, border: 'none', background: 'var(--blue)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Use</button>
        </div>
      )}

      {/* ── Nudges ── */}
      {!weighedToday && (
        <div onClick={() => onNavigate?.('progress')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 10, cursor: 'pointer' }}>
          <span>⚖️</span><div style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text2)' }}>Log this morning's weigh-in to keep your trend & adaptive TDEE sharp.</div><span style={{ color: 'var(--text3)' }}>›</span>
        </div>
      )}
    </>
  )

  if (embedded) return body
  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>{greeting}{profile?.name ? `, ${profile.name}` : ''} 👋</h1>
        <p>{dateLabel}</p>
      </div>
      {body}
    </div>
  )
}
