import { useState, useEffect, useCallback, useRef } from 'react'
import { storage } from './storage.js'
import { StoreContext } from './useStore.js'
import { supabase } from '../lib/supabase.js'
import {
  loadUserData, uploadLocalData,
  saveProfile, saveSession, removeSession,
  saveCheckin, saveGoals, saveNutritionLog,
  saveMeasurementEntries, upsertLeaderboardStats, saveRecipes,
  saveCustomExercises, saveRoutines,
} from '../lib/db.js'
import { computeLeaderboardStats } from '../utils/leaderboard.js'
import { gameStats, buildCookbookRecipes, openMysteryBox, THEMES } from '../utils/gamification.js'

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
        if (remote.profile)  {
          const localP = storage.getProfile()
          const useRemote = !localP?._ts || (remote.profile._ts || 0) >= localP._ts
          const chosen = useRemote ? remote.profile : localP
          storage.setProfile(chosen); setProfileState(chosen)
          if (!useRemote) saveProfile(userId, chosen).catch(() => {})
        }
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
        if (remote.customExercises?.length) {
          storage.setCustomExercises(remote.customExercises)
          setCustomExercisesState(remote.customExercises)
        }
        if (remote.routines?.length) {
          storage.setRoutines(remote.routines)
          setRoutinesState(remote.routines)
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
          customExercises:    storage.getCustomExercises()    || [],
          routines:           storage.getRoutines()           || [],
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

  // ── 5. Fire-and-forget helper (surfaces sync failures) ─────────────────────
  function push(fn) {
    if (!userRef.current) return
    fn(userRef.current.id)
      .then(() => setSyncStatus(s => (s === 'error' ? 'synced' : s)))   // recover on next success
      .catch(e => { console.warn('[push]', e); setSyncStatus('error') })
  }

  // ── 6. Store actions ───────────────────────────────────────────────────────
  const setProfile = useCallback((p) => {
    const stamped = { ...p, _ts: Date.now() }   // for last-writer conflict resolution
    storage.setProfile(stamped); setProfileState(stamped)
    push(uid => saveProfile(uid, stamped))
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
    const c = storage.getCustomExercises()
    setCustomExercisesState(c)
    push(uid => saveCustomExercises(uid, c))
  }, [])

  const addRoutine = useCallback((r) => { storage.addRoutine(r); const a = storage.getRoutines(); setRoutinesState(a); push(uid => saveRoutines(uid, a)) }, [])
  const deleteRoutine = useCallback((id) => { storage.deleteRoutine(id); const a = storage.getRoutines(); setRoutinesState(a); push(uid => saveRoutines(uid, a)) }, [])

  // ── Gamification actions (mutate profile.game) ─────────────────────────────
  const completeQuest = useCallback((dateStr, quest) => {
    const p = storage.getProfile(); if (!p) return
    const game = { ...(p.game || {}) }
    const log = { ...(game.questLog || {}) }
    const done = log[dateStr] || []
    if (done.includes(quest.id)) return
    log[dateStr] = [...done, quest.id]
    game.questLog = log
    game.questCoins = (game.questCoins || 0) + quest.reward
    setProfile({ ...p, game })
  }, [setProfile])

  // Record the level the user has acknowledged + grant a level-up bonus
  const markLevelSeen = useCallback((level) => {
    const p = storage.getProfile(); if (!p) return
    const game = { ...(p.game || {}) }
    if ((game.seenLevel || 1) >= level) return
    game.seenLevel = level
    game.questCoins = (game.questCoins || 0) + 30   // level-up bonus
    setProfile({ ...p, game })
  }, [setProfile])

  const useStreakShield = useCallback((dateStr) => {
    const p = storage.getProfile(); if (!p) return false
    const game = { ...(p.game || {}) }
    if ((game.shields || 0) <= 0) return false
    const covered = game.shieldDates || []
    if (covered.includes(dateStr)) return false
    game.shields -= 1
    game.shieldDates = [...covered, dateStr]
    setProfile({ ...p, game })
    return true
  }, [setProfile])

  const equipTheme = useCallback((themeId) => {
    const p = storage.getProfile(); if (!p) return
    const game = p.game || {}
    if (themeId !== 'green' && !(game.owned || []).some(id => id === `theme_${themeId}`)) return
    setProfile({ ...p, game: { ...game, theme: themeId } })
  }, [setProfile])

  const buyShopItem = useCallback((item) => {
    const p = storage.getProfile(); if (!p) return { ok: false, message: 'No profile' }
    const stats = gameStats(p, storage.getSessions(), storage.getMeasurementHistory(), storage.getNutritionLogs())
    const owned = p.game?.owned || []
    if (!item.repeatable && owned.includes(item.id)) return { ok: false, message: 'Already owned' }
    if (stats.coins < item.price) return { ok: false, message: `Need ${item.price - stats.coins} more coins` }
    const game = { ...(p.game || {}) }
    game.spent = (game.spent || 0) + item.price
    let message = `Purchased ${item.name}`
    if (item.kind === 'theme')      { game.owned = [...owned, item.id]; game.theme = item.themeId; message = `${THEMES[item.themeId].name} unlocked & equipped!` }
    else if (item.kind === 'title') { game.owned = [...owned, item.id]; game.title = item.title; message = `Title "${item.title}" equipped!` }
    else if (item.kind === 'shield')  { game.shields = (game.shields || 0) + 1; message = `🛡️ Streak Shield added (${game.shields} owned)` }
    else if (item.kind === 'mystery') { const box = openMysteryBox(); game.questCoins = (game.questCoins || 0) + box.amount; message = `🎁 ${box.label === 'JACKPOT 🎉' ? box.label + ' ' : 'You won '}${box.amount} coins!` }
    else if (item.kind === 'cookbook') {
      const recs = buildCookbookRecipes(item.pack)
      recs.forEach(r => storage.addRecipe(r))
      const all = storage.getRecipes(); setRecipesState(all); push(uid => saveRecipes(uid, all))
      game.owned = [...owned, item.id]; message = `${recs.length} recipes added to your cookbook!`
    }
    setProfile({ ...p, game })
    return { ok: true, message }
  }, [setProfile])

  // Convert ALL stored weights/lengths when the user switches kg↔lbs
  const convertAllUnits = useCallback((toUnit) => {
    const p = storage.getProfile()
    if (!p || (p.unit || 'kg') === toUnit) return
    const wf = toUnit === 'lbs' ? 2.2046 : 1 / 2.2046   // weight factor
    const lf = toUnit === 'lbs' ? 1 / 2.54 : 2.54        // length factor (cm↔in)
    const cw = v => (v ? +(v * wf).toFixed(1) : v)
    const cl = v => (v ? +(v * lf).toFixed(1) : v)
    const mapO = (o, fn) => (o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fn(v)])) : o)

    const np = { ...p, unit: toUnit,
      bodyweight: cw(p.bodyweight), height: cl(p.height), wrist: cl(p.wrist), ankle: cl(p.ankle), neck: cl(p.neck),
      measurements: mapO(p.measurements, cl), liftMaxes: mapO(p.liftMaxes, cw),
      milestones: (p.milestones || []).map(m => ({ ...m, bodyweight: cw(m.bodyweight), measurements: mapO(m.measurements, cl), liftMaxes: mapO(m.liftMaxes, cw) })),
    }
    storage.setProfile(np); setProfileState(np)

    const sess = storage.getSessions().map(s => ({ ...s, totalVolume: cw(s.totalVolume),
      exercises: (s.exercises || []).map(ex => ({ ...ex, bestE1RM: cw(ex.bestE1RM),
        sets: (ex.sets || []).map(st => ({ ...st, weight: cw(st.weight) })) })) }))
    storage.setSessions(sess); setSessionsState(sess)

    const cks = storage.getCheckins().map(c => ({ ...c, bodyweight: cw(c.bodyweight), measurements: mapO(c.measurements, cl), liftMaxes: mapO(c.liftMaxes, cw) }))
    storage.setCheckins(cks); setCheckinsState(cks)

    const WMETRICS = new Set(['bodyweight', 'bench', 'squat', 'deadlift', 'row', 'ohp'])
    const mh = storage.getMeasurementHistory().map(r => ({ ...r, value: WMETRICS.has(r.metric) ? cw(r.value) : cl(r.value), unit: toUnit }))
    storage.setMeasurementHistory(mh); setMeasurementHistoryState(mh)

    if (userRef.current) {
      const uid = userRef.current.id
      saveProfile(uid, np).catch(() => {})
      sess.forEach(s => saveSession(uid, s).catch(() => {}))
      cks.forEach(c => saveCheckin(uid, c).catch(() => {}))
      if (mh.length) saveMeasurementEntries(uid, mh).catch(() => {})
    }
    scheduleLeaderboardPush()
  }, [])

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
      convertAllUnits,
      completeQuest, equipTheme, buyShopItem, useStreakShield, markLevelSeen,
      loaded, resetApp,
      user, syncStatus, signOut,
    }}>
      {children}
    </StoreContext.Provider>
  )
}
