import { describe, it, expect } from 'vitest'
import { deriveEarned, gameStats, levelFromXp, levelTitle, dailyQuests, buildCookbookRecipes, openMysteryBox } from '../gamification.js'
import { computePRs, exerciseDetail, detectPlateau, projectStrength } from '../analytics.js'

const profile = { bodyweight: 82, unit: 'kg', liftMaxes: { bench: 100, squat: 140, deadlift: 180 }, game: {} }
const mkSession = (date, ex) => ({ date, exercises: ex })
const sessions = [
  mkSession('2026-04-01', [{ exerciseId: 'bench', name: 'Bench', sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }] }]),
  mkSession('2026-04-08', [{ exerciseId: 'bench', name: 'Bench', sets: [{ weight: 85, reps: 8 }] }]),
]

describe('levels', () => {
  it('level rises with xp', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(400)).toBe(3)
    expect(levelFromXp(1600)).toBe(5)
  })
  it('titles escalate', () => {
    expect(levelTitle(1).title).toBe('Rookie')
    expect(levelTitle(30).title).toBe('Legend')
  })
})

describe('coin earning', () => {
  it('derives positive coins from training + milestones', () => {
    const { coins, breakdown } = deriveEarned(profile, sessions, [{ metric: 'bodyweight', date: '2026-04-01', value: 82 }], {})
    expect(coins).toBeGreaterThan(0)
    expect(breakdown.milestones).toBeGreaterThan(0)   // bench≥bw etc.
    expect(breakdown.achievements).toBeGreaterThan(0)
  })
  it('balance = earned − spent', () => {
    const p2 = { ...profile, game: { questCoins: 100, spent: 50 } }
    const s = gameStats(p2, sessions, [], {})
    const earnedOnly = gameStats({ ...profile, game: {} }, sessions, [], {})
    expect(s.coins).toBe(earnedOnly.xp + 100 - 50)
  })
})

describe('daily quests', () => {
  it('are stable for a given date', () => {
    expect(dailyQuests('2026-05-26', 80).map(q => q.id)).toEqual(dailyQuests('2026-05-26', 80).map(q => q.id))
  })
  it('switch to recovery quests when readiness is low', () => {
    const low = dailyQuests('2026-05-26', 30).map(q => q.id)
    expect(low.some(id => ['walk', 'stretch', 'sleep', 'hydrate'].includes(id))).toBe(true)
  })
})

describe('shop', () => {
  it('mystery box always returns a positive reward', () => {
    for (let i = 0; i < 20; i++) expect(openMysteryBox().amount).toBeGreaterThan(0)
  })
  it('cookbook builds recipes with computed macros', () => {
    const recs = buildCookbookRecipes('bulk')
    expect(recs.length).toBeGreaterThan(0)
    recs.forEach(r => { expect(r.perServing.kcal).toBeGreaterThan(0); expect(r.ingredients.length).toBeGreaterThan(0) })
  })
})

describe('analytics PRs & trends', () => {
  it('records best 1RM and a PR feed', () => {
    const { records, feed } = computePRs(sessions)
    expect(records[0].best1RM.value).toBeGreaterThan(0)
    expect(feed.length).toBeGreaterThan(0)
  })
  it('exerciseDetail returns recent sessions newest-first', () => {
    const rows = exerciseDetail(sessions, 'bench')
    expect(rows.length).toBe(2)
    expect(new Date(rows[0].date) >= new Date(rows[1].date)).toBe(true)
  })
  it('projection trends up for improving lifts', () => {
    const trend = [{ full: '2026-04-01', e1rm: 76 }, { full: '2026-04-08', e1rm: 80 }, { full: '2026-04-15', e1rm: 84 }]
    expect(projectStrength(trend).trending).toBe('up')
  })
})
