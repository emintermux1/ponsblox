import { describe, expect, it } from 'vitest'
import { phantomOf, spotAfter } from './curve.ts'

describe('curve', () => {
  it('uses ArcBondingPad phantom multiples', () => {
    expect(phantomOf(0)).toBe(12)
    expect(phantomOf(1)).toBe(10)
    expect(phantomOf(2)).toBe(8)
  })

  it('raises spot as quote comes in', () => {
    expect(spotAfter(10, 1)).toBeGreaterThan(spotAfter(0, 1))
  })
})
