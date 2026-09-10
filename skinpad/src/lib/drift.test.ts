import { describe, expect, it } from 'vitest'
import { computeDrift, tokenUsdFromEth } from './drift.ts'

describe('computeDrift', () => {
  it('is on peg inside the band', () => {
    const d = computeDrift(105, 100)
    expect(d.status).toBe('on_peg')
  })

  it('marks richer and cheaper', () => {
    expect(computeDrift(200, 100).status).toBe('rich')
    expect(computeDrift(50, 100).status).toBe('cheap')
  })

  it('holds unavailable instead of zero', () => {
    expect(computeDrift(null, 900).status).toBe('unavailable')
    expect(computeDrift(10, 0).status).toBe('unavailable')
  })
})

describe('tokenUsdFromEth', () => {
  it('multiplies ETH price by ETH-USD', () => {
    expect(tokenUsdFromEth('0.5', 4000)).toBe(2000)
  })
})
