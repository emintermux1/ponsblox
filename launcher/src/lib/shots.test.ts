import { describe, expect, it } from 'vitest'
import { kitShot } from './shots.ts'

describe('shots', () => {
  it('has live UI captures for the public kits', () => {
    expect(kitShot('pons')).toBe('/kits/pons.jpg')
    expect(kitShot('pumpfun')).toBe('/kits/pumpfun.jpg')
    expect(kitShot('custom')).toBeNull()
  })
})
