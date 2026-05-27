import { describe, it, expect } from 'vitest'
import { generateProgram, getProgramStatus, readinessScore, readinessAdjustment, generateProgramWorkout, splitVariant } from '../program.js'
import { computeLeaderboardStats, getClimbHint, LEADERBOARD_CATEGORIES } from '../leaderboard.js'
import { getRegion, represcribe, weeklyDelta, suggestComplementary } from '../variations.js'
import { EXERCISES } from '../../data/exercises.js'

describe('3-month program', () => {
  const prog = generateProgram({}, '2026-05-25')
  it('has 12 weeks with deloads at 5 and 10', () => {
    expect(prog.weeks).toHaveLength(12)
    expect(prog.weeks[4].deload).toBe(true)
    expect(prog.weeks[9].deload).toBe(true)
  })
  it('maps dates to the right week/split', () => {
    const s = getProgramStatus(prog, new Date('2026-05-25'))
    expect(s.week).toBe(1)
    expect(s.split).toBe('push')
  })
  it('marks finished after 12 weeks', () => {
    expect(getProgramStatus(prog, new Date('2026-08-20')).finished).toBe(true)
  })
  it('generates A/B variants', () => {
    const a = generateProgramWorkout('push', prog.weeks[0], 0)
    const b = generateProgramWorkout('push', prog.weeks[0], 1)
    expect(a[0].id).not.toBe(b[0].id)
  })
})

describe('readiness', () => {
  it('scores higher with better recovery', () => {
    expect(readinessScore({ sleep: 8, soreness: 1, energy: 5 })).toBeGreaterThan(readinessScore({ sleep: 4, soreness: 4, energy: 2 }))
  })
  it('low readiness reduces load and skips finisher', () => {
    const adj = readinessAdjustment(20)
    expect(adj.loadPct).toBeLessThan(1)
    expect(adj.skipFinisher).toBe(true)
  })
})

describe('leaderboard', () => {
  const profile = { bodyweight: 82, unit: 'kg', liftMaxes: { bench: 100, squat: 140, deadlift: 180 } }
  it('caps absurd values (anti-cheat)', () => {
    const cheat = { ...profile, liftMaxes: { bench: 9999, squat: 9999, deadlift: 9999 } }
    const stats = computeLeaderboardStats(cheat, [], [], [])
    expect(stats.benchPR).toBeLessThanOrEqual(600)
  })
  it('includes a DOTS score', () => {
    const stats = computeLeaderboardStats(profile, [], [], [])
    expect(stats.dots).toBeGreaterThan(0)
  })
  it('climb hint tells you how to pass the next rank', () => {
    const board = [
      { user_id: 'a', display_name: 'A', stats: { sessionsWeek: 5, unit: 'kg' } },
      { user_id: 'b', display_name: 'B', stats: { sessionsWeek: 3, unit: 'kg' } },
    ]
    const cat = LEADERBOARD_CATEGORIES.find(c => c.id === 'sessionsWeek')
    expect(getClimbHint(board, 'b', cat)).toMatch(/more session/)
  })
})

describe('exercise variations', () => {
  it('infers chest sub-regions', () => {
    expect(getRegion(EXERCISES.find(e => e.id === 'incline_bench'))).toBe('Upper Chest')
    expect(getRegion(EXERCISES.find(e => e.id === 'decline_bench'))).toBe('Lower Chest')
  })
  it('represcribes compound vs isolation rep ranges', () => {
    const comp = represcribe({ category: 'compound' }, 'hypertrophy')
    const iso = represcribe({ category: 'isolation' }, 'hypertrophy')
    expect(comp.reps).not.toBe(iso.reps)
  })
  it('suggests complementary exercises for uncovered regions', () => {
    const incline = EXERCISES.find(e => e.id === 'incline_bench')
    const sugg = suggestComplementary([incline], 'chest', new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight']), 'hypertrophy', 3)
    expect(sugg.length).toBeGreaterThan(0)
    expect(sugg.every(s => s._region !== 'Upper Chest')).toBe(true)  // fills gaps, not the covered region
  })
})
