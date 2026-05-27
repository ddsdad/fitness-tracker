import { supabase } from './supabase.js'

// ─── Load all user data from Supabase ────────────────────────────────────────
export async function loadUserData(userId) {
  const [profileRes, sessionsRes, checkinsRes, goalsRes, nutritionRes, mhistoryRes] = await Promise.all([
    supabase.from('profiles').select('data').eq('user_id', userId).maybeSingle(),
    supabase.from('workout_sessions').select('id, data').eq('user_id', userId),
    supabase.from('checkins').select('week, data').eq('user_id', userId),
    supabase.from('goals').select('data').eq('user_id', userId).maybeSingle(),
    supabase.from('nutrition_logs').select('date, data').eq('user_id', userId),
    supabase.from('measurement_history').select('id, date, metric, value, unit').eq('user_id', userId),
  ])

  return {
    profile:            profileRes.data?.data    || null,
    sessions:           (sessionsRes.data  || []).map(s => ({ id: s.id, ...s.data })),
    checkins:           (checkinsRes.data  || []).map(c => ({ week: c.week, ...c.data })),
    goals:              goalsRes.data?.data      || {},
    nutritionLogs:      Object.fromEntries((nutritionRes.data || []).map(n => [n.date, n.data])),
    measurementHistory: mhistoryRes.data || [],
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

// ─── Measurement history ──────────────────────────────────────────────────────
export async function saveMeasurementEntries(userId, entries) {
  if (!entries.length) return
  const rows = entries.map(e => ({ ...e, user_id: userId }))
  const { error } = await supabase.from('measurement_history').upsert(rows)
  if (error) throw error
}

export async function loadMeasurementHistory(userId) {
  const { data, error } = await supabase
    .from('measurement_history')
    .select('id, date, metric, value, unit')
    .eq('user_id', userId)
    .order('date', { ascending: true })
  if (error) throw error
  return data || []
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export async function upsertLeaderboardStats(userId, displayName, stats) {
  const { error } = await supabase
    .from('leaderboard_stats')
    .upsert({ user_id: userId, display_name: displayName, stats, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function fetchLeaderboard() {
  const { data, error } = await supabase
    .from('leaderboard_stats')
    .select('user_id, display_name, stats, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ─── Friend leagues ───────────────────────────────────────────────────────────
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createLeague(userId, name) {
  let code, attempt = 0
  // retry on rare code collision
  while (attempt < 5) {
    code = genCode()
    const { data, error } = await supabase.from('leagues').insert({ name, code, owner_id: userId }).select().maybeSingle()
    if (!error && data) {
      await supabase.from('league_members').insert({ league_id: data.id, user_id: userId })
      return data
    }
    if (error && !String(error.message).includes('duplicate')) throw error
    attempt++
  }
  throw new Error('Could not create league')
}

export async function joinLeague(userId, code) {
  const { data: league, error } = await supabase.from('leagues').select('*').eq('code', code.toUpperCase().trim()).maybeSingle()
  if (error) throw error
  if (!league) throw new Error('No league found with that code')
  const { error: mErr } = await supabase.from('league_members').upsert({ league_id: league.id, user_id: userId })
  if (mErr) throw mErr
  return league
}

export async function leaveLeague(userId, leagueId) {
  const { error } = await supabase.from('league_members').delete().eq('league_id', leagueId).eq('user_id', userId)
  if (error) throw error
}

export async function getMyLeagues(userId) {
  const { data: memberships, error } = await supabase.from('league_members').select('league_id').eq('user_id', userId)
  if (error) throw error
  const ids = (memberships || []).map(m => m.league_id)
  if (!ids.length) return []
  const { data: leagues, error: lErr } = await supabase.from('leagues').select('*').in('id', ids)
  if (lErr) throw lErr
  return leagues || []
}

export async function getLeagueMemberIds(leagueId) {
  const { data, error } = await supabase.from('league_members').select('user_id').eq('league_id', leagueId)
  if (error) throw error
  return (data || []).map(m => m.user_id)
}

// ─── Upload local data to Supabase (first sign-in migration) ─────────────────
export async function uploadLocalData(userId, { profile, sessions, checkins, goals, nutritionLogs, measurementHistory = [] }) {
  const ops = []
  if (profile)                         ops.push(saveProfile(userId, profile))
  for (const s of sessions)            ops.push(saveSession(userId, s))
  for (const c of checkins)            ops.push(saveCheckin(userId, c))
  if (Object.keys(goals).length > 0)   ops.push(saveGoals(userId, goals))
  for (const [date, log] of Object.entries(nutritionLogs)) ops.push(saveNutritionLog(userId, date, log))
  if (measurementHistory.length > 0)   ops.push(saveMeasurementEntries(userId, measurementHistory))
  await Promise.allSettled(ops)
}
