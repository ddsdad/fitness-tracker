const KEYS = {
  PROFILE:   'ft_profile',
  SESSIONS:  'ft_sessions',
  CHECKINS:  'ft_checkins',
  GOALS:     'ft_goals',
  NUTRITION: 'ft_nutrition',
}

function get(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

function set(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

export const storage = {
  getProfile: () => get(KEYS.PROFILE),
  setProfile: (p) => set(KEYS.PROFILE, p),

  getSessions: () => get(KEYS.SESSIONS) || [],
  setSessions: (s) => set(KEYS.SESSIONS, s),
  addSession: (session) => {
    const sessions = storage.getSessions()
    sessions.unshift(session)
    storage.setSessions(sessions)
  },
  updateSession: (id, updates) => {
    const sessions = storage.getSessions()
    const idx = sessions.findIndex(s => s.id === id)
    if (idx !== -1) { sessions[idx] = { ...sessions[idx], ...updates }; storage.setSessions(sessions) }
  },
  deleteSession: (id) => {
    storage.setSessions(storage.getSessions().filter(s => s.id !== id))
  },

  getCheckins: () => get(KEYS.CHECKINS) || [],
  setCheckins: (c) => set(KEYS.CHECKINS, c),
  addCheckin: (checkin) => {
    const checkins = storage.getCheckins()
    const existing = checkins.findIndex(c => c.week === checkin.week)
    if (existing !== -1) checkins[existing] = checkin
    else checkins.push(checkin)
    checkins.sort((a,b) => a.week - b.week)
    storage.setCheckins(checkins)
  },

  getGoals: () => get(KEYS.GOALS) || {},
  setGoals: (g) => set(KEYS.GOALS, g),

  // Nutrition logs: { [dateStr]: { meals: {breakfast,lunch,dinner,snacks}, extraActivities } }
  getNutritionLogs: () => get(KEYS.NUTRITION) || {},
  getNutritionLog: (dateStr) => (get(KEYS.NUTRITION) || {})[dateStr] || { meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, extraActivities: [] },
  setNutritionLog: (dateStr, log) => {
    const all = get(KEYS.NUTRITION) || {}
    all[dateStr] = log
    set(KEYS.NUTRITION, all)
  },
  addFoodEntry: (dateStr, meal, entry) => {
    const all = get(KEYS.NUTRITION) || {}
    if (!all[dateStr]) all[dateStr] = { meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, extraActivities: [] }
    if (!all[dateStr].meals[meal]) all[dateStr].meals[meal] = []
    all[dateStr].meals[meal].push(entry)
    set(KEYS.NUTRITION, all)
  },
  removeFoodEntry: (dateStr, meal, entryId) => {
    const all = get(KEYS.NUTRITION) || {}
    if (all[dateStr]?.meals?.[meal]) {
      all[dateStr].meals[meal] = all[dateStr].meals[meal].filter(e => e.id !== entryId)
      set(KEYS.NUTRITION, all)
    }
  },
  addExtraActivity: (dateStr, activity) => {
    const all = get(KEYS.NUTRITION) || {}
    if (!all[dateStr]) all[dateStr] = { meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, extraActivities: [] }
    if (!all[dateStr].extraActivities) all[dateStr].extraActivities = []
    all[dateStr].extraActivities.push(activity)
    set(KEYS.NUTRITION, all)
  },
  removeExtraActivity: (dateStr, actId) => {
    const all = get(KEYS.NUTRITION) || {}
    if (all[dateStr]?.extraActivities) {
      all[dateStr].extraActivities = all[dateStr].extraActivities.filter(a => a.id !== actId)
      set(KEYS.NUTRITION, all)
    }
  },

  clearAll: () => Object.values(KEYS).forEach(k => localStorage.removeItem(k)),
}
