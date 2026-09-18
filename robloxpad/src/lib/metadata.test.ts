import { describe, expect, it } from 'vitest'
import { encodePegDescription, parsePegHash, validateMetadata } from './metadata.ts'

describe('metadata', () => {
  it('encodes and parses a universe peg', () => {
    const desc = encodePegDescription({ name: 'Adopt Me!', universeId: '383310974', playing: 120000 })
    expect(parsePegHash(desc)).toBe('383310974')
  })

  it('rejects a missing universe', () => {
    const r = validateMetadata({ name: 'x', symbol: 'XX' })
    expect(r.ok).toBe(false)
  })
})
