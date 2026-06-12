import { useState, useEffect, lazy, Suspense } from 'react'
import { useStore } from './store/useStore.js'
import { THEMES } from './utils/gamification.js'
import { StoreProvider } from './store/StoreProvider.jsx'
import Dashboard from './components/Dashboard/Dashboard.jsx'
import Nav from './components/shared/Nav.jsx'

// Code-split every non-default tab so the initial bundle stays small — heavy
// dependencies (recharts, the food DB, the workout logger) load on demand.
const Onboarding      = lazy(() => import('./components/Onboarding/Onboarding.jsx'))
const WorkoutLog      = lazy(() => import('./components/WorkoutLog/WorkoutLog.jsx'))
const Progress        = lazy(() => import('./components/Progress/Progress.jsx'))
const Goals           = lazy(() => import('./components/Goals/Goals.jsx'))
const Recommendations = lazy(() => import('./components/Recommendations/Recommendations.jsx'))
const Nutrition       = lazy(() => import('./components/Nutrition/Nutrition.jsx'))

function TabFallback() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--bg3)', borderTop: '3px solid var(--green)', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}
import AuthGate from './components/Auth/AuthGate.jsx'
import ErrorBoundary from './components/shared/ErrorBoundary.jsx'
import { useDeviceType } from './utils/useDeviceType.js'
import { computeHunter, RANKS } from './utils/hunter.js'
import AriseOverlay from './components/Hunter/AriseOverlay.jsx'

function AppInner() {
  const { profile, setProfile, sessions, loaded, user, syncStatus, syncFailCount, retrySync, signOut } = useStore()
  const device = useDeviceType()
  const isDesktop = device === 'desktop'
  const [tab, setTab]                   = useState('dashboard')
  const [preloadedPlan, setPreloadedPlan] = useState(null)
  const [skippedAuth, setSkippedAuth]   = useState(() => !!localStorage.getItem('ft_auth_skipped'))
  const [ariseRank, setAriseRank]       = useState(null)

  // ── Hunter rank-up detection → ARISE cinematic + weekly stat snapshot ──
  useEffect(() => {
    if (!profile || !loaded) return
    const h = computeHunter(profile, sessions || [])
    const curIdx = RANKS.findIndex(r => r.tier === h.rank.tier)
    const game = profile.game || {}
    const updates = {}

    const seenIdx = game.seenRankIdx
    if (seenIdx === undefined) {
      // First compute for this profile → baseline silently (no false cinematic).
      updates.seenRankIdx = curIdx
    } else if (curIdx > seenIdx) {
      setAriseRank(h.rank)
      updates.seenRankIdx = curIdx
    }

    // Weekly attribute snapshot → powers the "+STR this week" deltas on Status.
    const snap = game.hunterSnap
    if (!snap || Date.now() - snap.ts > 7 * 86_400_000) {
      updates.hunterSnap = { ts: Date.now(), stats: h.stats, power: h.power }
    }

    if (Object.keys(updates).length) setProfile({ ...profile, game: { ...game, ...updates } })
  }, [profile, sessions, loaded]) // eslint-disable-line

  const handleStartSession = (planExercises) => {
    setPreloadedPlan(planExercises)
    setTab('workout')
  }

  const handleSkipAuth = () => {
    localStorage.setItem('ft_auth_skipped', '1')
    setSkippedAuth(true)
  }

  // Apply the unlocked accent theme app-wide (re-skins via CSS vars)
  useEffect(() => {
    const t = THEMES[profile?.game?.theme] || THEMES.green
    document.documentElement.style.setProperty('--green', t.color)
    document.documentElement.style.setProperty('--green-dim', t.dim)
    document.documentElement.style.setProperty('--accent', t.color)
  }, [profile?.game?.theme])

  // Flag the layout mode on <html> so CSS (backdrop, framing) can respond
  useEffect(() => {
    document.documentElement.dataset.device = device
  }, [device])

  // Loading spinner
  if (!loaded) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', flexDirection:'column', gap:16 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid var(--bg3)', borderTop:'3px solid var(--green)', animation:'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  // Auth gate — shown if not signed in and hasn't skipped
  if (!user && !skippedAuth) {
    return <AuthGate onSkip={handleSkipAuth} />
  }

  // Onboarding — shown if profile not set up yet
  if (!profile) {
    return <Suspense fallback={<TabFallback />}><Onboarding onComplete={setProfile} /></Suspense>
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Hunter rank-up cinematic */}
      {ariseRank && <AriseOverlay rank={ariseRank} onClose={() => setAriseRank(null)} />}

      {/* Sync indicator strip */}
      {user && syncStatus === 'syncing' && (
        <div style={{
          position:'fixed', top:0, left:'50%', transform:'translateX(-50%)',
          width:'100%', maxWidth:480, zIndex:200,
          background:'rgba(59,130,246,0.15)', borderBottom:'1px solid rgba(59,130,246,0.3)',
          padding:'4px 16px', fontSize:'0.7rem', color:'var(--blue)',
          display:'flex', alignItems:'center', gap:6,
        }}>
          <div style={{ width:8, height:8, borderRadius:'50%', border:'1.5px solid var(--blue)', borderTopColor:'transparent', animation:'spin 0.6s linear infinite' }} />
          Syncing…
        </div>
      )}
      {user && syncStatus === 'error' && (
        <div style={{
          position:'fixed', top:0, left:'50%', transform:'translateX(-50%)',
          width:'100%', maxWidth:480, zIndex:200,
          background: syncFailCount >= 3 ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.15)',
          borderBottom:'1px solid rgba(239,68,68,0.35)',
          padding:'6px 16px', fontSize:'0.7rem', color:'var(--red)',
          display:'flex', alignItems:'center', gap:6,
        }}>
          <span style={{ flex: 1 }}>
            {syncFailCount >= 3
              ? `⚠️ Sync failing (${syncFailCount}×) — your data is safe on this device.`
              : '⚠️ Sync failed — saved on this device.'}
          </span>
          <button
            onClick={retrySync}
            style={{ background:'rgba(239,68,68,0.2)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:6, color:'var(--red)', fontSize:'0.7rem', padding:'2px 8px', cursor:'pointer', fontWeight:600 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Desktop sidebar nav is portaled to <body> (see Nav.jsx) so the #root
          transform that constrains modals doesn't displace it. */}
      {isDesktop && <Nav active={tab} onNavigate={setTab} variant="desktop" />}

      <Suspense fallback={<TabFallback />}>
        {tab === 'dashboard'  && <ErrorBoundary fallbackLabel="Dashboard"><Dashboard onSignOut={signOut} onNavigate={setTab} onStartSession={handleStartSession} /></ErrorBoundary>}
        {tab === 'workout'    && (
          <ErrorBoundary fallbackLabel="Workout">
            <WorkoutLog
              onNavigate={setTab}
              preloadedPlan={preloadedPlan}
              onPreloadConsumed={() => setPreloadedPlan(null)}
            />
          </ErrorBoundary>
        )}
        {tab === 'progress'   && <ErrorBoundary fallbackLabel="Progress"><Progress /></ErrorBoundary>}
        {tab === 'goals'      && <ErrorBoundary fallbackLabel="Goals"><Goals /></ErrorBoundary>}
        {tab === 'recommend'  && <ErrorBoundary fallbackLabel="Recommendations"><Recommendations onStartSession={handleStartSession} /></ErrorBoundary>}
        {tab === 'nutrition'  && <ErrorBoundary fallbackLabel="Nutrition"><Nutrition /></ErrorBoundary>}
      </Suspense>

      {!isDesktop && <Nav active={tab} onNavigate={setTab} />}
    </>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  )
}
