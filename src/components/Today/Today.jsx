import { useMemo, useState, useEffect } from 'react'
import { useStore } from '../../store/useStore.js'
import { getProgramStatus, SPLIT_META, splitVariant, generateProgramWorkout } from '../../utils/program.js'
import { calculateTDEE, calculateMacroTargets, sumLogMacros, adaptiveTDEE, effectiveTDEE } from '../../utils/nutrition.js'
import { computePRs } from '../../utils/analytics.js'
import { gameStats, dailyQuests } from '../../utils/gamification.js'
import { planExercisesToSession } from '../WorkoutLog/WorkoutSession.jsx'

const TODAY = new Date().toISOString().slice(0, 10)

function calcStreak(sessions, shieldDates = []) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const set = new Set(sessions.map(s => { const d = new Date(s.date); d.setHours(0,0,0,0); return d.getTime() }))
  const shields = new Set(shieldDates.map(ds => { const d = new Date(ds + 'T00:00:00'); d.setHours(0,0,0,0); return d.getTime() }))
  const covered = (t) => set.has(t) || shields.has(t)
  let streak = 0, check = new Date(today)
  for (let i = 0; i < 365; i++) {
    if (covered(check.getTime())) { streak++; check.setDate(check.getDate() - 1) }
    else if (i === 0) check.setDate(check.getDate() - 1)
    else break
  }
  return streak
}

function Ring({ pct, color, size = 64, children }) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg4)" strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={`${Math.min(1, pct) * c} ${c}`} style={{ transition: 'stroke-dasharray 0.5s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  )
}

export default function Today({ onNavigate, onStartSession, embedded = false }) {
  const { profile, sessions, nutritionLogs, measurementHistory, completeQuest, useStreakShield, markLevelSeen } = useStore()
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
  const consumed = sumLogMacros(todayLog.meals)
  const kcalLeft = Math.max(0, targets.kcal - consumed.kcal)
  const pLeft = Math.max(0, targets.protein - consumed.protein)

  // ── Streak + next PR ──
  const streak = calcStreak(sessions, profile?.game?.shieldDates || [])
  const { feed } = useMemo(() => computePRs(sessions), [sessions])
  const lastPR = feed[0]
  const u = profile?.unit || 'kg'

  // weigh-in today?
  const weighedToday = measurementHistory.some(r => r.metric === 'bodyweight' && r.date === TODAY)

  // ── Gamification ──
  const game = useMemo(() => gameStats(profile, sessions, measurementHistory, nutritionLogs), [profile, sessions, measurementHistory, nutritionLogs])
  const quests = dailyQuests(TODAY, readiness?.score)
  const questDone = profile?.game?.questLog?.[TODAY] || []

  // Detect level-up → celebrate + grant bonus (once)
  const seenLevel = profile?.game?.seenLevel || 1
  useEffect(() => {
    if (game.level > seenLevel) { setLevelUp(game.level); markLevelSeen(game.level) }
  }, [game.level, seenLevel, markLevelSeen])

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

      {/* ── Level / coins banner ── */}
      <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(34,197,94,0.12), var(--bg2))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{game.title.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700 }}>Level {game.level} · {game.title.title}</span>
              <span style={{ fontWeight: 800, color: 'var(--green)' }}>🪙 {game.coins}</span>
            </div>
            <div style={{ height: 5, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
              <div style={{ height: '100%', width: `${game.levelProgress * 100}%`, background: 'var(--green)', borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text3)', marginTop: 3 }}>{game.xpIntoLevel}/{game.xpForNext} XP to level {game.level + 1}</div>
          </div>
        </div>
      </div>

      {/* ── Daily quests ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Quests</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>{questDone.length}/{quests.length} done · resets at midnight</span>
        </div>
        {quests.map(q => {
          const done = questDone.includes(q.id)
          return (
            <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--bg3)', opacity: done ? 0.55 : 1 }}>
              <span style={{ fontSize: '1.1rem' }}>{q.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, textDecoration: done ? 'line-through' : 'none' }}>{q.text}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--green)' }}>+{q.reward} 🪙</div>
              </div>
              {done
                ? <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓</span>
                : <button onClick={() => completeQuest(TODAY, q)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 999, border: 'none', background: 'var(--green)', color: '#000', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Claim</button>}
            </div>
          )
        })}
      </div>

      {/* ── Today's training ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Today's Training</div>
        {split === 'rest' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '2rem' }}>😴</span>
            <div><div style={{ fontWeight: 700 }}>Rest Day</div><div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>Recover, eat protein, sleep. Back at it tomorrow.</div></div>
          </div>
        ) : trainedToday ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '2rem' }}>✅</span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--green)' }}>Workout done</div><div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>Nice work today. Recovery & nutrition from here.</div></div>
          </div>
        ) : splitMeta ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: '2rem' }}>{splitMeta.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{splitMeta.label} <span style={{ fontSize: '0.7rem', color: 'var(--text3)', fontWeight: 400 }}>· Week {prog.week}, {prog.weekPlan.phase}</span></div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{readiness ? `Readiness ${readiness.score} logged` : 'Do a quick readiness check in Plan'}</div>
              </div>
            </div>
            <button className="btn btn-primary btn-full" onClick={() => {
              const variant = splitVariant(profile.program.schedule, prog.dayInWeek)
              const wk = generateProgramWorkout(split, prog.weekPlan, variant)
              onStartSession?.(planExercisesToSession(wk))
            }}>▶ Start {splitMeta.label}</button>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '2rem' }}>🏋️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{trainedToday ? 'Trained today' : 'Ready to train?'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>Get a smart session tailored to your recovery.</div>
            </div>
            <button className="btn btn-secondary" style={{ flexShrink: 0 }} onClick={() => onNavigate?.('recommend')}>Plan</button>
          </div>
        )}
      </div>

      {/* ── Nutrition snapshot ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nutrition</span>
          <button onClick={() => onNavigate?.('nutrition')} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer' }}>+ Log food</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Ring pct={consumed.kcal / targets.kcal} color={consumed.kcal > targets.kcal ? '#f87171' : 'var(--green)'} size={72}>
            <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1 }}>{kcalLeft}</div>
            <div style={{ fontSize: '0.55rem', color: 'var(--text3)' }}>kcal left</div>
          </Ring>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
              <span style={{ color: 'var(--text2)' }}>Protein</span>
              <span style={{ fontWeight: 700, color: pLeft > 0 ? 'var(--text)' : 'var(--green)' }}>{Math.round(consumed.protein)}/{targets.protein}g</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${Math.min(100, consumed.protein/targets.protein*100)}%`, background: 'var(--green)', borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>
              {pLeft > 0 ? `${Math.round(pLeft)}g protein to go` : 'Protein goal hit 💪'}
              {effT.source !== 'estimate' && ` · adaptive TDEE ${effT.value}`}
            </div>
          </div>
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
        <div onClick={() => onNavigate?.('nutrition')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 10, cursor: 'pointer' }}>
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
