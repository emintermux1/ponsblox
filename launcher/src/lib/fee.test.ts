import { describe, expect, it } from 'vitest'
import { bpsToPct, pctToBps } from './fee.ts'

describe('fee', () => {
  it('converts bps to percent and back', () => {
    expect(bpsToPct(100)).toBe(1)
    expect(bpsToPct(50)).toBe(0.5)
    expect(pctToBps(1)).toBe(100)
    expect(pctToBps(0.5)).toBe(50)
    expect(pctToBps(12)).toBe(1000)
  })
})
