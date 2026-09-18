import { describe, expect, it } from 'vitest'
import { kitIdOrDefault, kitsIn } from './kits.ts'

describe('kits', () => {
  it('maps flap.sh and four.meme aliases', () => {
    expect(kitIdOrDefault('sh')).toBe('flap')
    expect(kitIdOrDefault('meme')).toBe('four')
    expect(kitIdOrDefault('flap')).toBe('flap')
    expect(kitIdOrDefault('xyz')).toBe('pons')
  })

  it('filters meme templates', () => {
    expect(kitsIn('meme').map((k) => k.id)).toEqual(['pumpfun', 'flap', 'four'])
  })
})
