import { useState, useEffect, useCallback, useRef } from 'react'
import { storage } from './storage.js'
import { StoreContext } from './useStore.js'
import { supabase } from '../lib/supabase.js'
import {
  loadUserData, uploadLocalData,
  saveProfile, saveSession, removeSession,
  saveCheckin, saveGoals, saveNutritionLog,
  saveMeasurementEntries, upsertLeaderboardStats, saveRecipes,
} from '../lib/db.js'
import { computeLeaderboardStats } from '../utils/leaderboard.js'

export function StoreProvider({ children }) {
  const [profile,            setProfileState]         = useState(null)
  const [sessions,           setSessionsState]        = useState([])
  const [checkins,           setCheckinsState]        = useState([])
  const [goals,              setGoalsState]           = useState({})
  const [nutritionLogs,      setNutritionLogsState]   = useState({})
  const [measurementHistory, setMeasurementHistoryState] = useState([])
  const [recipes,            setRecipesState]         = useState([])
  const [customExercises,    setCustomExercisesState] = useState([])
  const [routines,           setRoutinesState]        = useState([])
  const [loaded,             setLoaded]               = useState(false)
  const [user,               setUser]                 = useState(null)
  const [syncStatus,         setSyncStatus]           = useState('idle')

  const userRef    = useRef(null)
  const stateRef   = useRef({}) // live snapshot for leaderboard pushes

  // Keep stateRef current
  useEffect(() => {
    stateRef.current = { profile, sessions, checkins, measurementHistory }
  }, [profile, sessions, checkins, measurementHistory])

  // ── 1. Load localStorage immediately ──────────────────────────────────────
  useEffect(() => {
    setProfileState(storage.getProfile())
    setSessionsState(storage.getSessions())
    setCheckinsState(storage.getCheckins())
    setGoalsState(storage.getGoals())
    setNutritionLogsState(storage.getNutritionLogs())
    setMeasurementHistoryState(storage.getMeasurementHistory())
    setRecipesState(storage.getRecipes())
    setCustomExercisesState(storage.getCustomExercises())
    setRoutinesState(storage.getRoutines())
    setLoaded(true)
  }, [])

  // ── 2. Auth listener ───────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u); userRef.current = u
      if (u) handleSignIn(u.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u); userRef.current = u
      if (event === 'SIGNED_IN')  handleSignIn(u.id)
      if (event === 'SIGNED_OUT') setSyncStatus('idle')
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  // ── 3. On sign-in: sync down (or upload local if first time) ──────────────
  async function handleSignIn(userId) {
    setSyncStatus('syncing')
    try {
      const remote = await loadUserData(userId)
      const hasRemote = remote.profile || remote.sessions.length > 0

      if (hasRemote) {
        if (remote.profile)  { storage.setProfile(remote.profile);   setProfileState(remote.profile) }
        if (remote.sessions.length)  { storage.setSessions(remote.sessions); setSessionsState(remote.sessions) }
        if (remote.checkins.length)  { storage.setCheckins(remote.checkins); setCheckinsState(remote.checkins) }
        if (Object.keys(remote.goals).length) { storage.setGoals(remote.goals); setGoalsState(remote.goals) }
        if (Object.keys(remote.nutritionLogs).length) {
          Object.entries(remote.nutritionLogs).forEach(([d,l]) => storage.setNutritionLog(d,l))
          setNutritionLogsState(storage.getNutritionLogs())
        }
        if (remote.measurementHistory.length) {
          storage.setMeasurementHistory(remote.measurementHistory)
          setMeasurementHistoryState(remote.measurementHistory)
        }
        if (remote.recipes?.length) {
          storage.setRecipes(remote.recipes)
          setRecipesState(remote.recipes)
        }
      } else {
        await uploadLocalData(userId, {
          profile:            storage.getProfile()            || {},
          sessions:           storage.getSessions()           || [],
          checkins:           storage.getCheckins()           || [],
          goals:              storage.getGoals()              || {},
          nutritionLogs:      storage.getNutritionLogs()      || {},
          measurementHistory: storage.getMeasurementHistory() || [],
          recipes:            storage.getRecipes()            || [],
        })
      }
      setSyncStatus('synced')
      // Push leaderboard stats on every sign-in
      pushLeaderboard(userId)
    } catch (err) {
      console.error('[sync]', err)
      setSyncStatus('error')
    }
  }

  // ── 4. Leaderboard push (debounced) ───────────────────────────────────────
  const lbTimerRef = useRef(null)
  function scheduleLeaderboardPush() {
    if (!userRef.current) return
    clearTimeout(lbTimerRef.current)
    lbTimerRef.current = setTimeout(() => pushLeaderboard(userRef.current.id), 3000)
  }
  function pushLeaderboard(userId) {
    const { profile: p, sessions: s, checkins: c, measurementHistory: mh } = stateRef.current
    if (!p) return
    const stats = computeLeaderboardStats(p, s || [], c || [], mh || [])
    const name  = p.name || `Athlete`
    upsertLeaderboardStats(userId, name, stats).catch(e => console.warn('[lb]', e))
  }

  // ── 5. Fire-and-forget helper ──────────────────────────────────────────────
  function push(fn) {
    if (userRef.current) fn(userRef.current.id).catch(e => console.warn('[push]', e))
  }

  // ── 6. Store actions ───────────────────────────────────────────────────────
  const setProfile = useCallback((p) => {
    storage.setProfile(p); setProfileState(p)
    push(uid => saveProfile(uid, p))
    scheduleLeaderboardPush()
  }, [])

  const addSession = useCallback((session) => {
    storage.addSession(session)
    setSessionsState(storage.getSessions())
    push(uid => saveSession(uid, session))
    scheduleLeaderboardPush()
  }, [])

  const updateSession = useCallback((id, updates) => {
    storage.updateSession(id, updates)
    const all = storage.getSessions(); setSessionsState(all)
    const updated = all.find(s => s.id === id)
    if (updated) push(uid => saveSession(uid, updated))
    scheduleLeaderboardPush()
  }, [])

  const deleteSession = useCallback((id) => {
    storage.deleteSession(id); setSessionsState(storage.getSessions())
    push(uid => removeSession(uid, id))
    scheduleLeaderboardPush()
  }, [])

  const addCheckin = useCallback((checkin) => {
    storage.addCheckin(checkin); setCheckinsState(storage.getCheckins())
    push(uid => saveCheckin(uid, checkin))
    scheduleLeaderboardPush()
  }, [])

  const setGoals = useCallback((g) => {
    storage.setGoals(g); setGoalsState(g)
    push(uid => saveGoals(uid, g))
  }, [])

  const addFoodEntry = useCallback((dateStr, meal, entry) => {
    storage.addFoodEntry(dateStr, meal, entry)
    const logs = storage.getNutritionLogs(); setNutritionLogsState(logs)
    push(uid => saveNutritionLog(uid, dateStr, logs[dateStr]))
  }, [])

  const removeFoodEntry = useCallback((dateStr, meal, entryId) => {
    storage.removeFoodEntry(dateStr, meal, entryId)
    const logs = storage.getNutritionLogs(); setNutritionLogsState(logs)
    push(uid => saveNutritionLog(uid, dateStr, logs[dateStr] ?? { meals: { breakfast:[], lunch:[], dinner:[], snacks:[] }, extraActivities:[] }))
  }, [])

  const addExtraActivity = useCallback((dateStr, activity) => {
    storage.addExtraActivity(dateStr, activity)
    const logs = storage.getNutritionLogs(); setNutritionLogsState(logs)
    push(uid => saveNutritionLog(uid, dateStr, logs[dateStr]))
  }, [])

  const removeExtraActivity = useCallback((dateStr, actId) => {
    storage.removeExtraActivity(dateStr, actId)
    const logs = storage.getNutritionLogs(); setNutritionLogsState(logs)
    push(uid => saveNutritionLog(uid, dateStr, logs[dateStr] ?? { meals: { breakfast:[], lunch:[], dinner:[], snacks:[] }, extraActivities:[] }))
  }, [])

  // Measurement history
  const addMeasurementEntry = useCallback((entry) => {
    storage.addMeasurementEntry(entry)
    const history = storage.getMeasurementHistory()
    setMeasurementHistoryState(history)
    push(uid => saveMeasurementEntries(uid, [entry]))
    scheduleLeaderboardPush()
  }, [])

  // Recipes
  const addRecipe = useCallback((recipe) => {
    storage.addRecipe(recipe)
    const r = storage.getRecipes()
    setRecipesState(r)
    push(uid => saveRecipes(uid, r))
  }, [])

  const deleteRecipe = useCallback((id) => {
    storage.deleteRecipe(id)
    const r = storage.getRecipes()
    setRecipesState(r)
    push(uid => saveRecipes(uid, r))
  }, [])

  const addCustomExercise = useCallback((ex) => {
    storage.addCustomExercise(ex)
    setCustomExercisesState(storage.getCustomExercises())
  }, [])

  const addRoutine = useCallback((r) => { storage.addRoutine(r); setRoutinesState(storage.getRoutines()) }, [])
  const deleteRoutine = useCallback((id) => { storage.deleteRoutine(id); setRoutinesState(storage.getRoutines()) }, [])

  const resetApp = useCallback(async () => {
    storage.clearAll()
    setProfileState(null); setSessionsState([]); setCheckinsState([])
    setGoalsState({}); setNutritionLogsState({}); setMeasurementHistoryState([]); setRecipesState([]); setCustomExercisesState([]); setRoutinesState([])
    if (userRef.current) { await supabase.auth.signOut(); setUser(null); userRef.current = null }
    localStorage.removeItem('ft_auth_skipped')
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null); userRef.current = null; setSyncStatus('idle')
    localStorage.removeItem('ft_auth_skipped')
  }, [])

  return (
    <StoreContext.Provider value={{
      profile, setProfile,
      sessions, addSession, updateSession, deleteSession,
      checkins, addCheckin,
      goals, setGoals,
      nutritionLogs, addFoodEntry, removeFoodEntry, addExtraActivity, removeExtraActivity,
      measurementHistory, addMeasurementEntry,
      recipes, addRecipe, deleteRecipe,
      customExercises, addCustomExercise,
      routines, addRoutine, deleteRoutine,
      loaded, resetApp,
      user, syncStatus, signOut,
    }}>
      {children}
    </StoreContext.Provider>
  )
}
