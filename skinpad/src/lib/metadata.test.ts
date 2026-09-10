import { describe, expect, it } from 'vitest'
import { encodePegDescription, parsePegHash, validateMetadata } from './metadata.ts'

describe('peg metadata', () => {
  it('round-trips the market hash name', () => {
    const desc = encodePegDescription({
      marketHashName: 'AWP | Dragon Lore (Factory New)',
      quoteUsd: 1234.5,
      quotedAt: '2026-09-10T00:00:00.000Z',
    })
    expect(parsePegHash(desc)).toBe('AWP | Dragon Lore (Factory New)')
  })

  it('rejects metadata without a listing', () => {
    const checked = validateMetadata({ name: 'Lore', symbol: 'DLORE' })
    expect(checked.ok).toBe(false)
  })
})
