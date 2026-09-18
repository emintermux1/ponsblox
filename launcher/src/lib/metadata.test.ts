import { describe, expect, it } from 'vitest'
import { encodeBrandURI, kitFromBrandURI, padNameOnPons } from './metadata.ts'

describe('metadata', () => {
  it('round-trips kit in brand URI', () => {
    expect(kitFromBrandURI(encodeBrandURI({ kit: 'bags', brandURI: '' }))).toBe('bags')
    expect(kitFromBrandURI('kit:bags')).toBe('bags')
    expect(kitFromBrandURI('kit:bags\n')).toBe('bags')
    expect(kitFromBrandURI('{"kit":"bags"}')).toBe('bags')
    expect(kitFromBrandURI('https://example.com/a.png#kit=bags')).toBe('bags')
    expect(kitFromBrandURI(encodeBrandURI({ kit: 'pumpfun', brandURI: 'https://example.com/a.png' }))).toBe('pumpfun')
    expect(kitFromBrandURI('kit:gantry')).toBe('pons')
    expect(kitFromBrandURI('kit:custom#kit=custom&a=ff00aa')).toBe('custom')
    expect(kitFromBrandURI('kit:flap')).toBe('flap')
    expect(kitFromBrandURI('kit:sh')).toBe('flap')
    expect(kitFromBrandURI('kit:meme')).toBe('four')
  })

  it('prefixes token names with the pad', () => {
    expect(padNameOnPons('Steel', 'Ironworks')).toBe('Steel by Ironworks')
    expect(padNameOnPons('Steel by Ironworks', 'Ironworks')).toBe('Steel by Ironworks')
  })
})
