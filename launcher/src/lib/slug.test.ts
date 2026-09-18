import { describe, expect, it } from 'vitest'
import { assertSlug, normalizeSlug, slugError } from './slug.ts'

describe('slug', () => {
  it('normalizes case and trim', () => {
    expect(normalizeSlug('  SteelPad ')).toBe('steelpad')
  })

  it('accepts hyphenated names', () => {
    expect(slugError('steel-pad')).toBeNull()
    expect(assertSlug('Steel-Pad')).toBe('steel-pad')
  })

  it('rejects short, reserved, and bad charset', () => {
    expect(slugError('ab')).toBe('length')
    expect(slugError('www')).toBe('reserved')
    expect(slugError('preview')).toBe('reserved')
    expect(slugError('-steel')).toBe('hyphen')
    expect(slugError('Steel_Pad')).toBe('charset')
  })
})
