import { describe, it, expect } from 'vitest'
import { epley1RM, navyBF, lbmAndFat, ffmi, kgToLbs, lbsToKg } from '../calculations.js'
import { dotsScore, dotsTier, bigThreeTotalKg, acwr } from '../strength.js'

describe('epley1RM (blended)', () => {
  it('returns the weight at 1 rep', () => {
    expect(epley1RM(100, 1)).toBe(100)
  })
  it('estimates higher for more reps', () => {
    expect(epley1RM(100, 8)).toBeGreaterThan(100)
    expect(epley1RM(100, 8)).toBeGreaterThan(epley1RM(100, 5))
  })
  it('caps reps at 12 so high-rep sets do not inflate', () => {
    expect(epley1RM(100, 20)).toBe(epley1RM(100, 12))
  })
  it('handles invalid input', () => {
    expect(epley1RM(0, 5)).toBe(0)
    expect(epley1RM(100, 0)).toBe(0)
  })
})

describe('unit conversions', () => {
  it('round-trips kg↔lbs', () => {
    expect(lbsToKg(kgToLbs(100))).toBeCloseTo(100, 5)
  })
})

describe('body composition', () => {
  it('splits LBM and fat', () => {
    const { lbm, fat } = lbmAndFat(80, 20)
    expect(lbm).toBeCloseTo(64, 1)
    expect(fat).toBeCloseTo(16, 1)
  })
  it('navyBF returns a plausible percentage', () => {
    const bf = navyBF(85, 38, 180, 'male', 0)
    expect(bf).toBeGreaterThan(5)
    expect(bf).toBeLessThan(40)
  })
  it('ffmi normalizes for height', () => {
    const f = ffmi(64, 180)
    expect(f.normalized).toBeGreaterThan(15)
    expect(f.rating).toBeTruthy()
  })
})

describe('DOTS strength score', () => {
  it('is positive for a real total', () => {
    expect(dotsScore(400, 80, 'male')).toBeGreaterThan(0)
  })
  it('rewards relative strength — lighter lifter scores higher for same total', () => {
    expect(dotsScore(400, 70, 'male')).toBeGreaterThan(dotsScore(400, 110, 'male'))
  })
  it('tiers escalate', () => {
    expect(dotsTier(150).label).toBe('Beginner')
    expect(dotsTier(550).label).toBe('Elite')
  })
  it('bigThreeTotalKg converts lbs', () => {
    const kg = bigThreeTotalKg({ unit: 'lbs', liftMaxes: { bench: 220, squat: 300, deadlift: 400 } })
    expect(kg).toBeCloseTo((220 + 300 + 400) / 2.2046, 1)
  })
})

describe('ACWR injury risk', () => {
  const mk = (daysAgo, vol) => ({ date: new Date(Date.now() - daysAgo * 86400000).toISOString(), exercises: [{ sets: [{ weight: vol, reps: 1 }] }] })
  it('returns null without enough history', () => {
    expect(acwr([])).toBeNull()
  })
  it('flags a big spike as high risk', () => {
    const r = acwr([mk(1, 20000), mk(3, 15000), mk(20, 3000), mk(25, 3000)])
    expect(r.zone).toBe('High Risk')
    expect(r.ratio).toBeGreaterThan(1.5)
  })
})
