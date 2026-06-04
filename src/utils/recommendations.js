import { getMuscleVolume, getMuscleStatus } from './heatmap.js'
import { MUSCLE_GROUPS, GOAL_MUSCLE_WEIGHTS, RP_VOLUME } from '../data/muscles.js'
import { EXERCISES } from '../data/exercises.js'
import { getCurrentWeek, getWeekRange, sessionsInWeek, muscleVolumeForSessions } from './weekly.js'

// Working-set volume per muscle for the CURRENT program week (anchored to the
// user's start date). Falls back to a rolling 7-day window if no program start
// is set. This replaces the old always-rolling getMuscleVolume(sessions, 7),
// which kept counting last week's sessions at the start of a new week.
export function currentWeekVolume(sessions, profile) {
  if (!profile?.startDate) return getMuscleVolume(sessions, 7)
  const week = getCurrentWeek(profile.startDate)
  return muscleVolumeForSessions(sessionsInWeek(sessions, profile.startDate, week))
}

// ── Session type definitions ──────────────────────────────────────────────────
export const SESSION_TYPES = {
  standard: {
    id: 'standard', label: 'Hypertrophy', emoji: '💪',
    targetMins: 50, maxEx: 6, sets: 3, format: 'straight',
    goalLabel: 'Hypertrophy', repRange: '6–12 reps',
    bestFor: 'Building muscle size',
    desc: 'Straight sets · 6–12 reps · 2–3 min rest · balanced volume',
    repScheme: 'hypertrophy',
  },
  performance: {
    id: 'performance', label: 'Strength', emoji: '🏆',
    targetMins: 78, maxEx: 8, sets: 4, format: 'straight',
    goalLabel: 'Strength', repRange: '3–5 reps',
    bestFor: 'Getting stronger / lifting heavier',
    desc: 'Heavy compounds · 3–5 reps · 4–5 min rest · progressive overload',
    repScheme: 'strength',
  },
  quick: {
    id: 'quick', label: 'Quick Blast', emoji: '⚡',
    targetMins: 22, maxEx: 4, sets: 2, format: 'superset',
    goalLabel: 'Hypertrophy', repRange: '8–15 reps',
    bestFor: 'Short on time — better than skipping',
    desc: 'Supersets · 8–15 reps · minimal rest · time-efficient',
    repScheme: 'hypertrophy',
  },
  superset: {
    id: 'superset', label: 'Supersets', emoji: '🔀',
    targetMins: 40, maxEx: 6, sets: 3, format: 'superset',
    goalLabel: 'Hypertrophy', repRange: '8–15 reps',
    bestFor: 'Pump & efficiency (great for legs)',
    desc: 'Antagonist pairs · 8–15 reps · short rest · time-efficient',
    repScheme: 'hypertrophy',
  },
  circuit: {
    id: 'circuit', label: 'Conditioning', emoji: '🔄',
    targetMins: 35, maxEx: 8, sets: 3, format: 'circuit',
    goalLabel: 'Conditioning', repRange: '12–20 reps',
    bestFor: 'Fat loss & work capacity (not max size)',
    desc: 'Full-body stations · 12–20 reps · 30–45 s rest',
    repScheme: 'endurance',
  },
  deload: {
    id: 'deload', label: 'Deload', emoji: '🧘',
    targetMins: 30, maxEx: 5, sets: 2, format: 'deload',
    goalLabel: 'Recovery', repRange: '10–12 reps',
    bestFor: 'Recovery week — let muscles heal',
    desc: '60% intensity · 10–12 reps · active recovery',
    repScheme: 'deload',
  },
}

// ── Rep schemes ───────────────────────────────────────────────────────────────
const REP_SCHEMES = {
  strength: {
    compound: '3–5',   isolation: '5–8',
    compRest: '4–5 min', isoRest: '2–3 min',
    compRIR: '3–4 RIR', isoRIR: '2–3 RIR',
  },
  hypertrophy: {
    compound: '6–10',  isolation: '10–15',
    compRest: '2–3 min', isoRest: '60–90 s',
    compRIR: '2–3 RIR', isoRIR: '0–2 RIR',
  },
  endurance: {
    compound: '12–15', isolation: '15–20',
    compRest: '45 s',  isoRest: '30 s',
    compRIR: '1 RIR',  isoRIR: '0 RIR',
  },
  deload: {
    compound: '10–12', isolation: '12–15',
    compRest: '90 s',  isoRest: '60 s',
    compRIR: '4–5 RIR', isoRIR: '3–4 RIR',
  },
}

// ── Splits ────────────────────────────────────────────────────────────────────
const SPLITS = {
  push:       { id: 'push',       name: 'Push Day',        emoji: '💪', muscles: ['chest','front_delts','side_delts','triceps'],                            description: 'Chest · Shoulders · Triceps' },
  pull:       { id: 'pull',       name: 'Pull Day',        emoji: '🔙', muscles: ['lats','rhomboids','traps','rear_delts','biceps','forearms'],              description: 'Back · Rear Delts · Biceps' },
  legs:       { id: 'legs',       name: 'Leg Day',         emoji: '🦵', muscles: ['quads','hamstrings','glutes','calves','lower_back'],                      description: 'Quads · Hams · Glutes · Calves' },
  upper:      { id: 'upper',      name: 'Upper Body',      emoji: '⬆️', muscles: ['chest','lats','rhomboids','front_delts','side_delts','biceps','triceps'], description: 'Full upper-body session' },
  lower:      { id: 'lower',      name: 'Lower Body',      emoji: '⬇️', muscles: ['quads','hamstrings','glutes','calves','abs','lower_back'],               description: 'Full lower-body session' },
  full_body:  { id: 'full_body',  name: 'Full Body',       emoji: '🏋️', muscles: ['chest','lats','quads','hamstrings','glutes','front_delts','abs'],        description: 'Hit everything in one session' },
  back_bis:   { id: 'back_bis',   name: 'Back & Biceps',   emoji: '🦅', muscles: ['lats','rhomboids','traps','rear_delts','biceps'],                        description: 'Back thickness · width · arm curl' },
  chest_tris: { id: 'chest_tris', name: 'Chest & Triceps', emoji: '🤜', muscles: ['chest','front_delts','triceps'],                                          description: 'Push muscles + arm thickness' },
  shoulders:  { id: 'shoulders',  name: 'Shoulder Focus',  emoji: '🔝', muscles: ['front_delts','side_delts','rear_delts','traps','biceps'],                description: 'Width · caps · rear-delt health' },
  glutes_hams:{ id: 'glutes_hams',name: 'Glutes & Hams',  emoji: '🍑', muscles: ['glutes','hamstrings','lower_back','calves'],                              description: 'Posterior-chain focus' },
  arms:       { id: 'arms',       name: 'Arm Day',         emoji: '💥', muscles: ['biceps','triceps','forearms'],                                            description: 'Biceps · Triceps · Forearms' },
  core:       { id: 'core',       name: 'Core & Cardio',   emoji: '🎯', muscles: ['abs','lower_back'],                                                      description: 'Abs · Lower-back stability' },
}

// ── Equipment profiles ────────────────────────────────────────────────────────
export const EQUIPMENT_PROFILES = [
  { id: 'gym',        label: 'Full Gym',   emoji: '🏋️', types: new Set(['barbell','dumbbell','cable','machine','bodyweight','kettlebell']) },
  { id: 'dumbbells',  label: 'Dumbbells',  emoji: '🔵', types: new Set(['dumbbell','cable','bodyweight','bands']) },
  { id: 'bodyweight', label: 'Bodyweight', emoji: '🤸', types: new Set(['bodyweight','bands']) },
]

// ── Antagonist pairs (push muscle → pull muscle) ──────────────────────────────
const ANTAGONIST_PAIRS = [
  ['chest',       'lats'],
  ['chest',       'rhomboids'],
  ['front_delts', 'rear_delts'],
  ['biceps',      'triceps'],
  ['quads',       'hamstrings'],
  ['side_delts',  'rhomboids'],
  ['abs',         'lower_back'],
  ['glutes',      'quads'],
]

// ── Warmup library by split ───────────────────────────────────────────────────
const WARMUP_BY_SPLIT = {
  push:       [{ name: 'Band Pull-Apart', sets: 2, reps: '15–20', rest: '30 s', notes: 'Retract scapula, keep arms straight' },
               { name: 'Empty Bar Bench Press', sets: 2, reps: '10', rest: '45 s', notes: 'Groove the path, full ROM' }],
  pull:       [{ name: 'Scapular Pull-Up', sets: 2, reps: '8', rest: '30 s', notes: 'Depress & retract — no elbow bend' },
               { name: 'Facepull (light)', sets: 2, reps: '15', rest: '30 s', notes: 'External rotation focus' }],
  legs:       [{ name: 'Hip Circle (each side)', sets: 2, reps: '10', rest: '20 s', notes: 'Loosen hip flexors & piriformis' },
               { name: 'Bodyweight Squat', sets: 2, reps: '12', rest: '30 s', notes: 'Hit depth — feel the stretch' }],
  upper:      [{ name: 'Arm Circle', sets: 1, reps: '15 each dir', rest: '20 s', notes: 'Shoulder prep' },
               { name: 'Band Pull-Apart', sets: 2, reps: '15', rest: '30 s', notes: 'Warm rotator cuff' }],
  lower:      [{ name: 'Glute Bridge', sets: 2, reps: '12', rest: '30 s', notes: 'Activate glutes before loading' },
               { name: 'Leg Swing (each side)', sets: 1, reps: '10', rest: '20 s', notes: 'Hamstring & hip flexor mobility' }],
  full_body:  [{ name: 'Jump Rope / March', sets: 1, reps: '90 s', rest: '30 s', notes: 'Raise core temp' },
               { name: "World's Greatest Stretch", sets: 1, reps: '5 each side', rest: '20 s', notes: 'T-spine & hip opener' }],
  back_bis:   [{ name: 'Scapular Pull-Up', sets: 2, reps: '8', rest: '30 s', notes: 'Activate lats before loading' },
               { name: 'Facepull (light)', sets: 2, reps: '15', rest: '30 s', notes: 'Rear-delt & rotator cuff' }],
  chest_tris: [{ name: 'Band Pull-Apart', sets: 2, reps: '15', rest: '30 s', notes: 'Antagonist warm-up for chest' },
               { name: 'Empty Bar Bench Press', sets: 2, reps: '10', rest: '45 s', notes: 'Groove path, feel the pec stretch' }],
  shoulders:  [{ name: 'Shoulder Dislocate (band)', sets: 2, reps: '10', rest: '30 s', notes: 'Increase shoulder mobility' },
               { name: 'Facepull (light)', sets: 2, reps: '15', rest: '30 s', notes: 'Prime rear delts & external rotation' }],
  glutes_hams:[{ name: 'Glute Bridge', sets: 2, reps: '15', rest: '30 s', notes: 'Fire glutes before any loading' },
               { name: 'Nordic Curl (eccentric)', sets: 1, reps: '5', rest: '45 s', notes: 'Hamstring injury prevention' }],
  arms:       [{ name: 'Wrist Circle', sets: 1, reps: '15 each dir', rest: '20 s', notes: 'Protect wrists & elbows' },
               { name: 'Light DB Curl', sets: 2, reps: '15', rest: '30 s', notes: 'Pump blood into biceps tendons' }],
  core:       [{ name: 'Dead Bug', sets: 2, reps: '8 each side', rest: '30 s', notes: 'Brace & breathe — lower back flush' },
               { name: 'Cat-Cow', sets: 1, reps: '10', rest: '20 s', notes: 'Spine mobilisation' }],
}

// ── Recovery tracking ─────────────────────────────────────────────────────────
function getLastTrainedHours(muscle, sessions) {
  for (const s of sessions) {
    if (s.exercises?.some(e =>
      e.primaryMuscle === muscle ||
      (e.secondaryMuscles || []).includes(muscle)
    )) return (Date.now() - new Date(s.date)) / 3_600_000
  }
  return Infinity
}

function recoveryMult(hours) {
  if (hours < 36) return 0.05   // still sore — heavily penalise
  if (hours < 48) return 0.30   // not quite there
  if (hours < 72) return 0.80   // close to ready
  return 1.0                    // fully fresh
}

function recoveryLabel(hours) {
  if (hours === Infinity) return 'Never trained'
  if (hours < 36)  return `${Math.round(hours)}h ago — recovering`
  if (hours < 48)  return `${Math.round(hours)}h ago — almost ready`
  if (hours < 72)  return `${Math.round(hours)}h ago — ready`
  return `${Math.round(hours)}h ago — fully fresh`
}

// ── Weekly goal target per muscle ─────────────────────────────────────────────
// slider 0.3 → MEV,  slider 1.0 → lerp(MEV,MRV, 0.41),  slider 2.0 → MRV
export function getMuscleWeeklyTarget(muscle, sliderWeight = 1.0) {
  const { MEV, MRV } = RP_VOLUME[muscle] || { MEV: 8, MRV: 20 }
  const t = Math.min(1, Math.max(0, (sliderWeight - 0.3) / 1.7))
  return Math.max(1, Math.round(MEV + t * (MRV - MEV)))
}

// ── Smart urgency score per muscle ────────────────────────────────────────────
function buildSmartScoreMap(sessions, volume7, customWeights, goalId) {
  const goalWeights = GOAL_MUSCLE_WEIGHTS[goalId] || GOAL_MUSCLE_WEIGHTS.overall_size
  const map = {}
  for (const muscle of Object.keys(MUSCLE_GROUPS)) {
    const sliderW = customWeights?.[muscle] ?? goalWeights[muscle] ?? 1.0
    const target  = getMuscleWeeklyTarget(muscle, sliderW)
    const current = volume7[muscle] || 0
    const deficit = Math.max(0, (target - current) / Math.max(1, target))
    const hours   = getLastTrainedHours(muscle, sessions)
    const recov   = recoveryMult(hours)
    map[muscle] = {
      score:   deficit * sliderW * recov,
      deficit,
      sliderW,
      hours,
      target,
      current,
      recovLabel: recoveryLabel(hours),
    }
  }
  return map
}

// ── Score a split by summed smart scores ──────────────────────────────────────
function scoreSplit(split, scoreMap) {
  return split.muscles.reduce((t, m) => t + (scoreMap[m]?.score || 0), 0)
}

// ── Build superset session ────────────────────────────────────────────────────
function buildSupersets(splitMuscles, equipProfile, scoreMap, customWeights, sessionType) {
  const allowed = equipProfile.types
  const scheme  = REP_SCHEMES[sessionType.repScheme] || REP_SCHEMES.hypertrophy
  const sets    = sessionType.sets

  // Best exercise per muscle
  const bestEx = {}
  for (const m of splitMuscles) {
    bestEx[m] = EXERCISES
      .filter(e => allowed.has(e.equipment) && e.primary === m)
      .sort((a, b) =>
        (scoreMap[b.primary]?.score || 0) * (b.category === 'compound' ? 1.3 : 1) -
        (scoreMap[a.primary]?.score || 0) * (a.category === 'compound' ? 1.3 : 1)
      )[0]
  }

  const pairs = []
  const used  = new Set()

  // True antagonist pairs first
  for (const [a, b] of ANTAGONIST_PAIRS) {
    if (pairs.length >= Math.floor(sessionType.maxEx / 2)) break
    if (!used.has(a) && !used.has(b) && splitMuscles.includes(a) && splitMuscles.includes(b)) {
      const exA = bestEx[a]
      const exB = bestEx[b]
      if (exA && exB) {
        pairs.push({
          label: `Superset ${pairs.length + 1}`,
          restNote: 'Rest 90 s after completing both',
          exercises: [exA, exB].map(ex => ({
            ...ex,
            sets,
            reps: ex.category === 'compound' ? scheme.compound : scheme.isolation,
            rest: 'No rest — go straight to partner',
            rir:  ex.category === 'compound' ? scheme.compRIR : scheme.isoRIR,
          })),
        })
        used.add(a); used.add(b)
      }
    }
  }

  // Agonist fallback: compound + isolation from same muscle
  for (const m of splitMuscles) {
    if (pairs.length >= Math.floor(sessionType.maxEx / 2)) break
    if (used.has(m)) continue
    const exList = EXERCISES.filter(e => allowed.has(e.equipment) && e.primary === m)
    const compound  = exList.find(e => e.category === 'compound')
    const isolation = exList.find(e => e.category !== 'compound')
    if (compound && isolation && compound.id !== isolation.id) {
      pairs.push({
        label: `Superset ${pairs.length + 1}`,
        restNote: 'Rest 60 s after completing both',
        exercises: [compound, isolation].map((ex, idx) => ({
          ...ex,
          sets,
          reps: idx === 0 ? scheme.compound : scheme.isolation,
          rest: 'No rest — go straight to partner',
          rir:  idx === 0 ? scheme.compRIR : scheme.isoRIR,
        })),
      })
      used.add(m)
    }
  }

  // Remaining muscles as solo
  const solo = []
  for (const m of splitMuscles) {
    if (used.has(m)) continue
    const ex = bestEx[m]
    if (ex) {
      solo.push({
        ...ex,
        sets,
        reps: ex.category === 'compound' ? scheme.compound : scheme.isolation,
        rest: ex.category === 'compound' ? scheme.compRest : scheme.isoRest,
        rir:  ex.category === 'compound' ? scheme.compRIR  : scheme.isoRIR,
        _phase: 'solo',
      })
    }
  }

  return { format: 'superset', pairs, solo }
}

// ── Build circuit session ─────────────────────────────────────────────────────
function buildCircuit(equipProfile, scoreMap, sessionType) {
  const allowed = equipProfile.types
  const scheme  = REP_SCHEMES[sessionType.repScheme] || REP_SCHEMES.endurance
  const rounds  = sessionType.sets

  // Sort muscles by score, pick one beginner-friendly exercise per muscle
  const sorted = Object.keys(MUSCLE_GROUPS).sort(
    (a, b) => (scoreMap[b]?.score || 0) - (scoreMap[a]?.score || 0)
  )

  const stations = []
  const usedPattern = new Set()

  for (const m of sorted) {
    if (stations.length >= sessionType.maxEx) break
    const ex = EXERCISES
      .filter(e => allowed.has(e.equipment) && e.primary === m && !usedPattern.has(e.pattern))
      .sort((a, b) => a.difficulty - b.difficulty)[0]  // prefer easiest — circuit = pace over load
    if (ex) {
      stations.push({
        ...ex,
        sets: rounds,
        reps: ex.category === 'compound' ? scheme.compound : scheme.isolation,
        rest: '0 s — straight to next station',
        rir:  scheme.isoRIR,
        _phase: 'station',
      })
      usedPattern.add(ex.pattern)
    }
  }

  return { format: 'circuit', pairs: [], solo: stations, rounds }
}

// ── Build straight sets session ───────────────────────────────────────────────
function buildStraight(split, equipProfile, scoreMap, customWeights, sessionType) {
  const allowed = equipProfile.types
  const scheme  = REP_SCHEMES[sessionType.repScheme] || REP_SCHEMES.hypertrophy

  const pool = EXERCISES.filter(e =>
    allowed.has(e.equipment) &&
    (split.muscles.includes(e.primary) ||
     split.muscles.some(m => (e.secondary || []).includes(m)))
  )

  const scored = pool.map(e => ({
    ...e,
    _score: (scoreMap[e.primary]?.score || 0) *
            (e.category === 'compound' ? 1.5 : 1.0) *
            (1 / (e.difficulty || 1)),
  })).sort((a, b) => b._score - a._score)

  const selected    = []
  const usedPattern = new Set()
  const perMuscle   = {}

  const maxCompounds = Math.min(4, Math.ceil(sessionType.maxEx * 0.55))
  for (const ex of scored.filter(e => e.category === 'compound')) {
    if (selected.length >= maxCompounds) break
    const pat = ex.pattern || 'isolation'
    if (!usedPattern.has(pat)) {
      selected.push({ ...ex, _phase: 'main' })
      usedPattern.add(pat)
      perMuscle[ex.primary] = (perMuscle[ex.primary] || 0) + 1
    }
  }

  for (const ex of scored.filter(e => e.category !== 'compound')) {
    if (selected.length >= sessionType.maxEx) break
    const cnt = perMuscle[ex.primary] || 0
    if (cnt < 2) {
      selected.push({ ...ex, _phase: 'finisher' })
      perMuscle[ex.primary] = cnt + 1
    }
  }

  const exercises = selected.map(ex => {
    const compound = ex.category === 'compound'
    const sliderW  = customWeights?.[ex.primary] ?? 1.0
    const urgency  = scoreMap[ex.primary]?.score || 0
    const base     = sessionType.sets
    const wBonus   = sliderW >= 1.8 ? 2 : sliderW >= 1.4 ? 1 : 0
    const uBonus   = urgency > 0.65 ? 1 : 0
    const sets     = Math.min(compound ? 6 : 4, base + wBonus + uBonus)
    return {
      ...ex,
      sets,
      reps: compound ? scheme.compound  : scheme.isolation,
      rest: compound ? scheme.compRest  : scheme.isoRest,
      rir:  compound ? scheme.compRIR   : scheme.isoRIR,
    }
  })

  return { format: 'straight', pairs: [], solo: exercises, rounds: null }
}

// ── Build one session (format-aware) ──────────────────────────────────────────
function buildSession(split, equipProfile, scoreMap, customWeights, sessionType) {
  switch (sessionType.format) {
    case 'superset': return buildSupersets(split.muscles, equipProfile, scoreMap, customWeights, sessionType)
    case 'circuit':  return buildCircuit(equipProfile, scoreMap, sessionType)
    default:         return buildStraight(split, equipProfile, scoreMap, customWeights, sessionType)
  }
}

// ── Per-muscle reasoning ──────────────────────────────────────────────────────
function buildReasoning(split, scoreMap, sessionType) {
  const items = []

  const muscleMeta = split.muscles.map(m => ({ m, ...scoreMap[m] }))
    .sort((a, b) => (b.score || 0) - (a.score || 0))

  for (const { m, score, deficit, hours, target, current, recovLabel } of muscleMeta.slice(0, 4)) {
    const label = MUSCLE_GROUPS[m]?.label
    if (hours < 48 && hours !== Infinity) {
      items.push({ icon: '💤', text: `${label} skipped — ${recovLabel}`, type: 'skip' })
    } else if ((score || 0) > 0.6) {
      items.push({ icon: '🎯', text: `${label} — ${current}/${target} sets (${Math.round((deficit||0)*100)}% deficit, priority ×${(scoreMap[m]?.sliderW||1).toFixed(1)})`, type: 'priority' })
    } else {
      items.push({ icon: '✅', text: `${label} — ${recovLabel}`, type: 'ready' })
    }
  }

  items.push({ icon: '⚡', text: `${sessionType.label}: ${sessionType.desc}`, type: 'format' })
  return items
}

// ── Gamification: weekly challenge data ───────────────────────────────────────
export function getWeeklyChallengeData(sessions, customWeights, goalId = 'overall_size', profile = null) {
  const volume7     = profile ? currentWeekVolume(sessions, profile) : getMuscleVolume(sessions, 7)
  const goalWeights = GOAL_MUSCLE_WEIGHTS[goalId] || GOAL_MUSCLE_WEIGHTS.overall_size

  return Object.keys(MUSCLE_GROUPS)
    .map(muscle => {
      const sliderW  = customWeights?.[muscle] ?? goalWeights[muscle] ?? 1.0
      const target   = getMuscleWeeklyTarget(muscle, sliderW)
      const current  = +(volume7[muscle] || 0).toFixed(1)
      const pct      = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0
      const hours    = getLastTrainedHours(muscle, sessions)
      return {
        muscle,
        label:   MUSCLE_GROUPS[muscle].label,
        current,
        target,
        pct,
        sliderW,
        hours,
        color:   pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--yellow)' : 'var(--red)',
        done:    pct >= 100,
      }
    })
    .filter(m => m.sliderW > 0.4)           // only muscles the user cares about
    .sort((a, b) => a.pct - b.pct)          // most-needed first
}

// ── Main export ───────────────────────────────────────────────────────────────
export function getRecommendations(sessions, profile, customWeights = null, sessionTypeId = 'standard') {
  const goalId      = profile?.physiqueGoal || 'overall_size'
  const sessionType = SESSION_TYPES[sessionTypeId] || SESSION_TYPES.standard
  // Current PROGRAM-WEEK volume (not a rolling 7-day window) so plans reflect
  // what you've done THIS week, not leftovers from last week.
  const volume7     = currentWeekVolume(sessions, profile)

  // Smart score map combining deficit × slider priority × recovery
  const scoreMap = buildSmartScoreMap(sessions, volume7, customWeights, goalId)

  // For circuit/deload prefer wider splits
  let rankedSplits
  if (sessionType.format === 'circuit') {
    rankedSplits = [SPLITS.full_body, SPLITS.upper, SPLITS.lower]
  } else if (sessionType.format === 'deload') {
    rankedSplits = [SPLITS.full_body, SPLITS.upper, SPLITS.lower]
  } else {
    rankedSplits = Object.values(SPLITS)
      .map(s => ({ ...s, _score: scoreSplit(s, scoreMap) }))
      .sort((a, b) => b._score - a._score)
  }

  const chosenSplits = rankedSplits.slice(0, 3)

  const workoutPlans = chosenSplits.map((split, i) => ({
    id:          split.id,
    name:        split.name,
    emoji:       split.emoji,
    description: split.description,
    muscles:     split.muscles,
    priority:    i === 0 ? 'Best Match' : i === 1 ? 'Variation' : 'Wildcard',
    warmup:      (sessionType.format === 'straight' || sessionType.format === 'deload')
                   ? (WARMUP_BY_SPLIT[split.id] || [])
                   : [],
    reasoning:   buildReasoning(split, scoreMap, sessionType),
    variants:    EQUIPMENT_PROFILES.map(ep => ({
      equipId:    ep.id,
      equipLabel: ep.label,
      equipEmoji: ep.emoji,
      ...buildSession(split, ep, scoreMap, customWeights, sessionType),
    })),
  }))

  // Insights (weekly volume health check)
  const insights = []
  const volume30  = getMuscleVolume(sessions, 30)
  const goalW     = customWeights || GOAL_MUSCLE_WEIGHTS[goalId] || GOAL_MUSCLE_WEIGHTS.overall_size

  Object.keys(MUSCLE_GROUPS).forEach(m => {
    const s7 = getMuscleStatus(m, volume7[m] || 0, goalId, customWeights)
    if (s7.pct === 0 || s7.label === 'Neglected')
      insights.push({ type: 'warning', text: `${MUSCLE_GROUPS[m].label} is critically undertrained this week — add direct work.` })
    else if (s7.label === 'Below MEV')
      insights.push({ type: 'info', text: `${MUSCLE_GROUPS[m].label} below MEV — add 1–2 sets this week.` })
    const avgWeekly = (volume30[m] || 0) / 4
    if (getMuscleStatus(m, avgWeekly, goalId, customWeights).label === 'Overtrained')
      insights.push({ type: 'warning', text: `${MUSCLE_GROUPS[m].label} may be overtrained (30-day avg) — consider a deload.` })
  })

  // Top muscles for banner
  const muscleScores = Object.keys(MUSCLE_GROUPS).map(muscle => {
    const status   = getMuscleStatus(muscle, volume7[muscle] || 0, goalId, customWeights)
    const priority = (customWeights || goalW)[muscle] || 1
    const base     = status.pct === 0 ? 100 : status.label === 'Neglected' ? 80 : status.label === 'Below MEV' ? 50 : status.label === 'Working' ? 10 : 0
    return { muscle, label: MUSCLE_GROUPS[muscle].label, urgency: base * priority, status, volume: volume7[muscle] || 0 }
  }).sort((a, b) => b.urgency - a.urgency)

  const topMuscles  = muscleScores.filter(m => m.urgency > 0).slice(0, 4).map(m => m.muscle)
  const focusLabels = topMuscles.slice(0, 3).map(m => MUSCLE_GROUPS[m]?.label).join(', ')
  const message     = topMuscles.length === 0
    ? 'Your training looks well-balanced — keep it up!'
    : `Prioritise ${focusLabels} to rebalance your volume.`

  return { workoutPlans, topMuscles, message, insights, muscleScores, scoreMap }
}

// ── Auto-deload detection ─────────────────────────────────────────────────────
/**
 * Returns muscles that need a deload based on 4-week rolling volume.
 * Alert if:  ≥ MAV for 3 of last 4 weeks  (warning)
 *            ≥ MRV for 2 of last 4 weeks   (urgent)
 */
export function detectDeloadNeed(sessions) {
  const now = new Date()

  // Build per-muscle weekly set counts for last 4 weeks
  const weeklyVols = Array.from({ length: 4 }, (_, w) => {
    const end   = new Date(now); end.setDate(end.getDate() - w * 7)
    const start = new Date(end); start.setDate(start.getDate() - 7)
    const weekSessions = sessions.filter(s => {
      const d = new Date(s.date); return d >= start && d < end
    })
    const vol = {}
    for (const s of weekSessions) {
      for (const ex of (s.exercises || [])) {
        const m = ex.primaryMuscle || ex.primary
        if (m) vol[m] = (vol[m] || 0) + (ex.sets?.length || 0)
      }
    }
    return vol
  })

  const alerts = []
  for (const [muscle, rp] of Object.entries(RP_VOLUME)) {
    const weeksAboveMAV = weeklyVols.filter(v => (v[muscle] || 0) >= rp.MAV).length
    const weeksAboveMRV = weeklyVols.filter(v => (v[muscle] || 0) >= rp.MRV).length
    if (weeksAboveMRV >= 2) {
      alerts.push({ muscle, label: MUSCLE_GROUPS[muscle]?.label, weeksAboveMAV, weeksAboveMRV, MAV: rp.MAV, MRV: rp.MRV, severity: 'urgent' })
    } else if (weeksAboveMAV >= 3) {
      alerts.push({ muscle, label: MUSCLE_GROUPS[muscle]?.label, weeksAboveMAV, weeksAboveMRV, MAV: rp.MAV, MRV: rp.MRV, severity: 'warning' })
    }
  }
  return alerts.sort((a, b) => (b.severity === 'urgent' ? 1 : 0) - (a.severity === 'urgent' ? 1 : 0))
}

// ── Weekly schedule data ──────────────────────────────────────────────────────
/**
 * Returns an array of 7 day objects (Mon–Sun of the current week).
 * Each day has:  date, dayLabel, isToday, isPast, sessions[], muscleGroups[]
 */
export function getWeekScheduleData(sessions) {
  const today   = new Date(); today.setHours(0,0,0,0)
  const dow     = today.getDay()                          // 0=Sun
  const monday  = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))

  const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday); date.setDate(monday.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const isToday = date.getTime() === today.getTime()
    const isPast  = date < today

    const daySessions = sessions.filter(s => s.date && s.date.startsWith(dateStr))
    const muscleGroups = [...new Set(
      daySessions.flatMap(s => (s.exercises || []).map(e => e.primaryMuscle || e.primary).filter(Boolean))
    )]
    const totalVolume = daySessions.reduce((s, sess) => s + (sess.totalVolume || 0), 0)
    const totalMins   = daySessions.reduce((s, sess) => s + (sess.duration || 0), 0)

    return { date, dateStr, dayLabel: DAY_LABELS[i], isToday, isPast, sessions: daySessions, muscleGroups, totalVolume, totalMins }
  })
}
