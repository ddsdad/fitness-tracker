import { useState } from 'react'
import { useStore } from './store/useStore.js'
import { StoreProvider } from './store/StoreProvider.jsx'
import Onboarding from './components/Onboarding/Onboarding.jsx'
import Dashboard from './components/Dashboard/Dashboard.jsx'
import WorkoutLog from './components/WorkoutLog/WorkoutLog.jsx'
import Progress from './components/Progress/Progress.jsx'
import Goals from './components/Goals/Goals.jsx'
import Recommendations from './components/Recommendations/Recommendations.jsx'
import Nutrition from './components/Nutrition/Nutrition.jsx'
import Nav from './components/shared/Nav.jsx'
import AuthGate from './components/Auth/AuthGate.jsx'

function AppInner() {
  const { profile, setProfile, loaded, user, syncStatus, signOut } = useStore()
  const [tab, setTab]                   = useState('dashboard')
  const [preloadedPlan, setPreloadedPlan] = useState(null)
  const [skippedAuth, setSkippedAuth]   = useState(() => !!localStorage.getItem('ft_auth_skipped'))

  const handleStartSession = (planExercises) => {
    setPreloadedPlan(planExercises)
    setTab('workout')
  }

  const handleSkipAuth = () => {
    localStorage.setItem('ft_auth_skipped', '1')
    setSkippedAuth(true)
  }

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
    return <Onboarding onComplete={setProfile} />
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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
          background:'rgba(239,68,68,0.15)', borderBottom:'1px solid rgba(239,68,68,0.35)',
          padding:'4px 16px', fontSize:'0.7rem', color:'var(--red)',
          display:'flex', alignItems:'center', gap:6,
        }}>
          ⚠️ Sync failed — saved on this device, will retry.
        </div>
      )}

      {tab === 'dashboard'  && <Dashboard onSignOut={signOut} onNavigate={setTab} onStartSession={handleStartSession} />}
      {tab === 'workout'    && (
        <WorkoutLog
          onNavigate={setTab}
          preloadedPlan={preloadedPlan}
          onPreloadConsumed={() => setPreloadedPlan(null)}
        />
      )}
      {tab === 'progress'   && <Progress />}
      {tab === 'goals'      && <Goals />}
      {tab === 'recommend'  && <Recommendations onStartSession={handleStartSession} />}
      {tab === 'nutrition'  && <Nutrition />}

      <Nav active={tab} onNavigate={setTab} />
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
