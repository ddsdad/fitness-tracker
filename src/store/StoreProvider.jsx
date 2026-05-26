import { useState, useEffect, useCallback } from 'react'
import { storage } from './storage.js'
import { StoreContext } from './useStore.js'

export function StoreProvider({ children }) {
  const [profile, setProfileState] = useState(null)
  const [sessions, setSessionsState] = useState([])
  const [checkins, setCheckinsState] = useState([])
  const [goals, setGoalsState] = useState({})
  const [nutritionLogs, setNutritionLogsState] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setProfileState(storage.getProfile())
    setSessionsState(storage.getSessions())
    setCheckinsState(storage.getCheckins())
    setGoalsState(storage.getGoals())
    setNutritionLogsState(storage.getNutritionLogs())
    setLoaded(true)
  }, [])

  const setProfile = useCallback((p) => {
    storage.setProfile(p)
    setProfileState(p)
  }, [])

  const addSession = useCallback((session) => {
    storage.addSession(session)
    setSessionsState(storage.getSessions())
  }, [])

  const updateSession = useCallback((id, updates) => {
    storage.updateSession(id, updates)
    setSessionsState(storage.getSessions())
  }, [])

  const deleteSession = useCallback((id) => {
    storage.deleteSession(id)
    setSessionsState(storage.getSessions())
  }, [])

  const addCheckin = useCallback((checkin) => {
    storage.addCheckin(checkin)
    setCheckinsState(storage.getCheckins())
  }, [])

  const setGoals = useCallback((g) => {
    storage.setGoals(g)
    setGoalsState(g)
  }, [])

  const addFoodEntry = useCallback((dateStr, meal, entry) => {
    storage.addFoodEntry(dateStr, meal, entry)
    setNutritionLogsState(storage.getNutritionLogs())
  }, [])

  const removeFoodEntry = useCallback((dateStr, meal, entryId) => {
    storage.removeFoodEntry(dateStr, meal, entryId)
    setNutritionLogsState(storage.getNutritionLogs())
  }, [])

  const addExtraActivity = useCallback((dateStr, activity) => {
    storage.addExtraActivity(dateStr, activity)
    setNutritionLogsState(storage.getNutritionLogs())
  }, [])

  const removeExtraActivity = useCallback((dateStr, actId) => {
    storage.removeExtraActivity(dateStr, actId)
    setNutritionLogsState(storage.getNutritionLogs())
  }, [])

  const resetApp = useCallback(() => {
    storage.clearAll()
    setProfileState(null)
    setSessionsState([])
    setCheckinsState([])
    setGoalsState({})
    setNutritionLogsState({})
  }, [])

  return (
    <StoreContext.Provider value={{
      profile, setProfile,
      sessions, addSession, updateSession, deleteSession,
      checkins, addCheckin,
      goals, setGoals,
      nutritionLogs, addFoodEntry, removeFoodEntry, addExtraActivity, removeExtraActivity,
      loaded, resetApp,
    }}>
      {children}
    </StoreContext.Provider>
  )
}
