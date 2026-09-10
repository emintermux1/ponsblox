import { describe, expect, it } from 'vitest'
import { finalTokenName, parseSkinParts, skinId, suggestTicker, TOKEN_NAME_MAX, TOKEN_NAME_SUFFIX } from './skins.ts'

describe('skin identity', () => {
  it('parses StatTrak wear listings', () => {
    const p = parseSkinParts('StatTrak™ AK-47 | Redline (Field-Tested)')
    expect(p.stattrak).toBe(true)
    expect(p.weapon).toBe('AK-47')
    expect(p.finish).toBe('Redline')
    expect(p.wear).toBe('Field-Tested')
  })

  it('parses starred knives', () => {
    const p = parseSkinParts('★ Karambit | Doppler (Factory New)')
    expect(p.star).toBe(true)
    expect(p.weapon).toBe('Karambit')
  })

  it('builds a stable id', () => {
    expect(skinId('AWP | Dragon Lore (Factory New)')).toBe('awp--dragon-lore-factory-new')
  })

  it('suggests a ticker from the finish', () => {
    expect(suggestTicker('AWP | Dragon Lore (Factory New)')).toBe('DRAGONLORE')
  })
})

describe('finalTokenName', () => {
  it('appends the suffix to every name', () => {
    expect(finalTokenName('Case Hardened Karambit')).toBe('Case Hardened Karambit by SkinPad')
  })

  it('does not double-append when the user already typed it', () => {
    expect(finalTokenName('Case Hardened Karambit by SkinPad')).toBe('Case Hardened Karambit by SkinPad')
    expect(finalTokenName('dragon lore BY SKINPAD')).toBe('dragon lore by SkinPad')
  })

  it('truncates the base, never the suffix', () => {
    const long = 'X'.repeat(80)
    const out = finalTokenName(long)
    expect(out.endsWith(TOKEN_NAME_SUFFIX)).toBe(true)
    expect(out.length).toBeLessThanOrEqual(TOKEN_NAME_MAX)
    expect(out).toBe('X'.repeat(TOKEN_NAME_MAX - TOKEN_NAME_SUFFIX.length) + TOKEN_NAME_SUFFIX)
  })

  it('normalizes whitespace', () => {
    expect(finalTokenName('  Fire   Serpent AK-47  ')).toBe('Fire Serpent AK-47 by SkinPad')
  })
})
