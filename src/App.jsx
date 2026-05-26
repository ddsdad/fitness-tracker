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

function AppInner() {
  const { profile, setProfile, loaded } = useStore()
  const [tab, setTab] = useState('dashboard')
  const [preloadedPlan, setPreloadedPlan] = useState(null)

  const handleStartSession = (planExercises) => {
    setPreloadedPlan(planExercises)
    setTab('workout')
  }

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--bg3)', borderTop: '3px solid var(--green)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!profile) {
    return <Onboarding onComplete={setProfile} />
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'workout' && (
        <WorkoutLog
          onNavigate={setTab}
          preloadedPlan={preloadedPlan}
          onPreloadConsumed={() => setPreloadedPlan(null)}
        />
      )}
      {tab === 'progress' && <Progress />}
      {tab === 'goals' && <Goals />}
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
