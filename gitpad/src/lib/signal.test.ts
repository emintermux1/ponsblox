import { describe, expect, it } from 'vitest'
import { momentumSignal, weeklyGrowthPct } from './signal.ts'

const recent = new Date(Date.now() - 2 * 86_400_000).toISOString()
const old = new Date(Date.now() - 400 * 86_400_000).toISOString()

describe('momentumSignal', () => {
  it('assigns BREAKOUT when 24h stars are extreme', () => {
    const s = momentumSignal({
      stars: 12_000,
      stars24h: 7421,
      stars7d: 9000,
      forks: 426,
      pushedAt: recent,
      createdAt: old,
      trendScore: 88,
    })
    expect(s.level).toBe('breakout')
    expect(s.label).toBe('BREAKOUT')
    expect(s.why.some((w) => w.includes('7,421'))).toBe(true)
    expect(s.disclaimer).toBe('Repository activity signal. Not financial advice.')
  })

  it('assigns COLD for a quiet archive', () => {
    const s = momentumSignal({
      stars: 40,
      stars24h: 0,
      stars7d: 0,
      forks: 2,
      pushedAt: old,
      createdAt: old,
      trendScore: 8,
    })
    expect(s.level).toBe('cold')
  })

  it('computes weekly growth from a 7d delta', () => {
    expect(weeklyGrowthPct(10_000, 1840)).toBeCloseTo(22.55, 1)
    expect(weeklyGrowthPct(100, null)).toBeNull()
    expect(weeklyGrowthPct(5080, 5080)).toBeNull()
  })
})
