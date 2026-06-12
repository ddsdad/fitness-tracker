import { describe, it, expect } from 'vitest'
import { deriveEarned, gameStats, levelFromXp, levelTitle, openMysteryBox } from '../gamification.js'
import { generateSystemQuests } from '../system.js'
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

describe('System daily quests', () => {
  it('are deterministic for a given date', () => {
    const a = generateSystemQuests('2026-05-26', sessions, profile, 80).quests.map(q => q.id)
    const b = generateSystemQuests('2026-05-26', sessions, profile, 80).quests.map(q => q.id)
    expect(a).toEqual(b)
    expect(a.length).toBeGreaterThanOrEqual(3)
  })
  it('drops the hard overload quest when readiness is low', () => {
    const low = generateSystemQuests('2026-05-26', sessions, profile, 30).quests
    expect(low.some(q => q.kind === 'overload')).toBe(false)
  })
  it('issues a history-based overload quest when readiness is fine', () => {
    const qs = generateSystemQuests('2026-05-26', sessions, profile, 80).quests
    const o = qs.find(q => q.kind === 'overload')
    expect(o).toBeTruthy()
    expect(o.target.exerciseId).toBe('bench')   // pulled from real logged history
  })
})

describe('shop', () => {
  it('mystery box always returns a positive reward', () => {
    for (let i = 0; i < 20; i++) expect(openMysteryBox().amount).toBeGreaterThan(0)
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
