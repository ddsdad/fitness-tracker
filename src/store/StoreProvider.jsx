import { useState, useEffect, useCallback, useRef } from 'react'
import { storage } from './storage.js'
import { StoreContext } from './useStore.js'
import { supabase } from '../lib/supabase.js'
import {
  loadUserData, uploadLocalData,
  saveProfile, saveSession, removeSession,
  saveCheckin, saveGoals, saveNutritionLog,
} from '../lib/db.js'

export function StoreProvider({ children }) {
  const [profile,       setProfileState]    = useState(null)
  const [sessions,      setSessionsState]   = useState([])
  const [checkins,      setCheckinsState]   = useState([])
  const [goals,         setGoalsState]      = useState({})
  const [nutritionLogs, setNutritionLogsState] = useState({})
  const [loaded,        setLoaded]          = useState(false)
  const [user,          setUser]            = useState(null)
  const [syncStatus,    setSyncStatus]      = useState('idle') // 'idle'|'syncing'|'synced'|'error'

  const userRef = useRef(null)

  // ── 1. Load localStorage immediately (instant) ──────────────────────────────
  useEffect(() => {
    setProfileState(storage.getProfile())
    setSessionsState(storage.getSessions())
    setCheckinsState(storage.getCheckins())
    setGoalsState(storage.getGoals())
    setNutritionLogsState(storage.getNutritionLogs())
    setLoaded(true)
  }, [])

  // ── 2. Supabase auth listener ────────────────────────────────────────────────
  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      userRef.current = u
      if (u) handleSignIn(u.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)
      userRef.current = u
      if (event === 'SIGNED_IN')  handleSignIn(u.id)
      if (event === 'SIGNED_OUT') setSyncStatus('idle')
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  // ── 3. On sign-in: pull from Supabase; on first login upload local data ─────
  async function handleSignIn(userId) {
    setSyncStatus('syncing')
    try {
      const remote = await loadUserData(userId)
      const hasRemote = remote.profile || remote.sessions.length > 0

      if (hasRemote) {
        // Remote wins — overwrite local state & storage
        if (remote.profile) {
          storage.setProfile(remote.profile)
          setProfileState(remote.profile)
        }
        if (remote.sessions.length > 0) {
          storage.setSessions(remote.sessions)
          setSessionsState(remote.sessions)
        }
        if (remote.checkins.length > 0) {
          storage.setCheckins(remote.checkins)
          setCheckinsState(remote.checkins)
        }
        if (Object.keys(remote.goals).length > 0) {
          storage.setGoals(remote.goals)
          setGoalsState(remote.goals)
        }
        if (Object.keys(remote.nutritionLogs).length > 0) {
          Object.entries(remote.nutritionLogs).forEach(([date, log]) => storage.setNutritionLog(date, log))
          setNutritionLogsState(storage.getNutritionLogs())
        }
      } else {
        // First sign-in — migrate local data up to Supabase
        await uploadLocalData(userId, {
          profile:       storage.getProfile()       || {},
          sessions:      storage.getSessions()      || [],
          checkins:      storage.getCheckins()      || [],
          goals:         storage.getGoals()         || {},
          nutritionLogs: storage.getNutritionLogs() || {},
        })
      }
      setSyncStatus('synced')
    } catch (err) {
      console.error('[Supabase sync]', err)
      setSyncStatus('error')
    }
  }

  // ── 4. Fire-and-forget helper ────────────────────────────────────────────────
  function push(fn) {
    if (userRef.current) fn(userRef.current.id).catch(e => console.warn('[push]', e))
  }

  // ── 5. Store actions ─────────────────────────────────────────────────────────
  const setProfile = useCallback((p) => {
    storage.setProfile(p)
    setProfileState(p)
    push(uid => saveProfile(uid, p))
  }, [])

  const addSession = useCallback((session) => {
    storage.addSession(session)
    setSessionsState(storage.getSessions())
    push(uid => saveSession(uid, session))
  }, [])

  const updateSession = useCallback((id, updates) => {
    storage.updateSession(id, updates)
    const all = storage.getSessions()
    setSessionsState(all)
    const updated = all.find(s => s.id === id)
    if (updated) push(uid => saveSession(uid, updated))
  }, [])

  const deleteSession = useCallback((id) => {
    storage.deleteSession(id)
    setSessionsState(storage.getSessions())
    push(uid => removeSession(uid, id))
  }, [])

  const addCheckin = useCallback((checkin) => {
    storage.addCheckin(checkin)
    setCheckinsState(storage.getCheckins())
    push(uid => saveCheckin(uid, checkin))
  }, [])

  const setGoals = useCallback((g) => {
    storage.setGoals(g)
    setGoalsState(g)
    push(uid => saveGoals(uid, g))
  }, [])

  const addFoodEntry = useCallback((dateStr, meal, entry) => {
    storage.addFoodEntry(dateStr, meal, entry)
    const logs = storage.getNutritionLogs()
    setNutritionLogsState(logs)
    push(uid => saveNutritionLog(uid, dateStr, logs[dateStr]))
  }, [])

  const removeFoodEntry = useCallback((dateStr, meal, entryId) => {
    storage.removeFoodEntry(dateStr, meal, entryId)
    const logs = storage.getNutritionLogs()
    setNutritionLogsState(logs)
    push(uid => saveNutritionLog(uid, dateStr, logs[dateStr] ?? { meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, extraActivities: [] }))
  }, [])

  const addExtraActivity = useCallback((dateStr, activity) => {
    storage.addExtraActivity(dateStr, activity)
    const logs = storage.getNutritionLogs()
    setNutritionLogsState(logs)
    push(uid => saveNutritionLog(uid, dateStr, logs[dateStr]))
  }, [])

  const removeExtraActivity = useCallback((dateStr, actId) => {
    storage.removeExtraActivity(dateStr, actId)
    const logs = storage.getNutritionLogs()
    setNutritionLogsState(logs)
    push(uid => saveNutritionLog(uid, dateStr, logs[dateStr] ?? { meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, extraActivities: [] }))
  }, [])

  const resetApp = useCallback(async () => {
    storage.clearAll()
    setProfileState(null)
    setSessionsState([])
    setCheckinsState([])
    setGoalsState({})
    setNutritionLogsState({})
    if (userRef.current) {
      await supabase.auth.signOut()
      setUser(null)
      userRef.current = null
    }
    localStorage.removeItem('ft_auth_skipped')
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    userRef.current = null
    setSyncStatus('idle')
    localStorage.removeItem('ft_auth_skipped')
  }, [])

  return (
    <StoreContext.Provider value={{
      profile, setProfile,
      sessions, addSession, updateSession, deleteSession,
      checkins, addCheckin,
      goals, setGoals,
      nutritionLogs, addFoodEntry, removeFoodEntry, addExtraActivity, removeExtraActivity,
      loaded, resetApp,
      user, syncStatus, signOut,
    }}>
      {children}
    </StoreContext.Provider>
  )
}
