import { supabase } from './supabase.js'

// ─── Load all user data from Supabase ────────────────────────────────────────
export async function loadUserData(userId) {
  const [profileRes, sessionsRes, checkinsRes, goalsRes, nutritionRes] = await Promise.all([
    supabase.from('profiles').select('data').eq('user_id', userId).maybeSingle(),
    supabase.from('workout_sessions').select('id, data').eq('user_id', userId),
    supabase.from('checkins').select('week, data').eq('user_id', userId),
    supabase.from('goals').select('data').eq('user_id', userId).maybeSingle(),
    supabase.from('nutrition_logs').select('date, data').eq('user_id', userId),
  ])

  return {
    profile:       profileRes.data?.data    || null,
    sessions:      (sessionsRes.data  || []).map(s => ({ id: s.id, ...s.data })),
    checkins:      (checkinsRes.data  || []).map(c => ({ week: c.week, ...c.data })),
    goals:         goalsRes.data?.data      || {},
    nutritionLogs: Object.fromEntries((nutritionRes.data || []).map(n => [n.date, n.data])),
  }
}

// ─── Write helpers (all fire-and-forget safe) ─────────────────────────────────
export async function saveProfile(userId, data) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function saveSession(userId, session) {
  const { id, ...data } = session
  const { error } = await supabase
    .from('workout_sessions')
    .upsert({ id, user_id: userId, data, synced_at: new Date().toISOString() })
  if (error) throw error
}

export async function removeSession(userId, sessionId) {
  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function saveCheckin(userId, checkin) {
  const { week, ...data } = checkin
  const { error } = await supabase
    .from('checkins')
    .upsert({ user_id: userId, week, data })
  if (error) throw error
}

export async function saveGoals(userId, data) {
  const { error } = await supabase
    .from('goals')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function saveNutritionLog(userId, date, data) {
  const { error } = await supabase
    .from('nutrition_logs')
    .upsert({ user_id: userId, date, data, updated_at: new Date().toISOString() })
  if (error) throw error
}

// ─── Upload local data to Supabase (first sign-in migration) ─────────────────
export async function uploadLocalData(userId, { profile, sessions, checkins, goals, nutritionLogs }) {
  const ops = []
  if (profile)                         ops.push(saveProfile(userId, profile))
  for (const s of sessions)            ops.push(saveSession(userId, s))
  for (const c of checkins)            ops.push(saveCheckin(userId, c))
  if (Object.keys(goals).length > 0)   ops.push(saveGoals(userId, goals))
  for (const [date, log] of Object.entries(nutritionLogs)) ops.push(saveNutritionLog(userId, date, log))
  await Promise.allSettled(ops)
}
