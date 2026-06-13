import { describe, it, expect } from 'vitest'
import { loadFactor, effectiveWeight, hasLoadOffset } from '../effectiveLoad.js'
import { computeAura } from '../aura.js'
import { getInvolvement } from '../involvement.js'

describe('effective load', () => {
  it('single-pulley cable movements feel ~half the stack', () => {
    const f = loadFactor({ id: 'tricep_pushdown', name: 'Cable Tricep Pushdown', equipment: 'cable' })
    expect(f).toBe(0.5)
    expect(effectiveWeight(75, { id: 'tricep_pushdown', name: 'Pushdown', equipment: 'cable' })).toBe(37.5)
  })
  it('barbell/dumbbell are full load', () => {
    expect(loadFactor({ id: 'bench_press', name: 'Barbell Bench Press', equipment: 'barbell' })).toBe(1)
    expect(hasLoadOffset({ id: 'bench_press', equipment: 'barbell' })).toBe(false)
  })
  it('leg press discounts for sled angle', () => {
    expect(loadFactor({ id: 'leg_press', name: 'Leg Press', equipment: 'machine' })).toBe(0.7)
  })
  it('user calibration overrides the default', () => {
    expect(loadFactor({ id: 'my_machine', equipment: 'machine' }, { my_machine: 0.6 })).toBe(0.6)
  })
})

describe('aura (loss aversion)', () => {
  const day = (n) => ({ date: new Date(Date.now() - n * 86_400_000).toISOString(), exercises: [] })
  it('rises with consistent training', () => {
    const trained = [0, 1, 2, 3, 4].map(day)
    const a = computeAura(trained)
    expect(a.value).toBeGreaterThan(70)
    expect(a.decaying).toBe(false)
  })
  it('decays and flags loss when idle but aura still remains', () => {
    // Solid recent block then 2 idle days → aura positive but bleeding
    const sessions = [3, 4, 5, 6, 7].map(day)
    const a = computeAura(sessions)
    expect(a.value).toBeGreaterThan(0)
    expect(a.decaying).toBe(true)
    expect(a.willLoseTomorrow).toBeGreaterThan(0)
    expect(a.daysIdle).toBeGreaterThanOrEqual(2)
  })
})

describe('involvement still fractional', () => {
  it('deadlift spreads across the chain', () => {
    const inv = getInvolvement('deadlift', 'glutes', ['hamstrings', 'lower_back'])
    expect(inv.glutes).toBe(1)
    expect(inv.hamstrings).toBeGreaterThan(0.5)
    expect(inv.lower_back).toBeGreaterThan(0.5)
    expect(inv.traps).toBeGreaterThan(0)   // isometric grip/traps credit
  })
})
