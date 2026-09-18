import { describe, expect, it } from 'vitest'
import { barLayout, niceCeil, shareOf, sinceLabel } from './chart.ts'

describe('chart', () => {
  it('ceils to a readable top', () => {
    expect(niceCeil(1_800_000)).toBe(2_000_000)
    expect(niceCeil(412_000)).toBe(500_000)
    expect(niceCeil(7)).toBe(10)
    expect(niceCeil(0)).toBe(1)
  })

  it('draws bars from zero so close readings stay close', () => {
    const { bars, max } = barLayout([1_700_000, 1_800_000], 100, 100)
    expect(max).toBe(2_000_000)
    expect(bars).toHaveLength(2)
    expect(bars[0].h).toBeCloseTo(85, 5)
    expect(bars[1].h).toBeCloseTo(90, 5)
    expect(Math.abs(bars[0].h - bars[1].h)).toBeLessThan(10)
  })

  it('clamps share', () => {
    expect(shareOf(50, 100)).toBe(0.5)
    expect(shareOf(200, 100)).toBe(1)
    expect(shareOf(10, 0)).toBe(0)
  })

  it('labels age', () => {
    const now = 1_000_000_000
    expect(sinceLabel(now, now)).toBe('now')
    expect(sinceLabel(now - 10 * 60_000, now)).toBe('10m ago')
  })
})
