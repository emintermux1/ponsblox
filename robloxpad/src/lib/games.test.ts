import { describe, expect, it } from 'vitest'
import { finalTokenName, gameId, parseRobloxInput, robloxGameUrl, suggestTicker, TOKEN_NAME_MAX, TOKEN_NAME_SUFFIX } from './games.ts'

describe('games', () => {
  it('ids are numeric', () => {
    expect(gameId(383310974)).toBe('383310974')
    expect(gameId('u-383310974')).toBe('383310974')
  })

  it('builds a real Roblox games URL', () => {
    expect(robloxGameUrl(920587237, 'Adopt Me!')).toBe('https://www.roblox.com/games/920587237/adopt-me')
  })

  it('suggests a ticker from the game name', () => {
    expect(suggestTicker('Adopt Me!')).toBe('ADOPTME')
  })

  it('appends by RobloxPad once', () => {
    expect(finalTokenName('Brookhaven RP')).toBe('Brookhaven RP by RobloxPad')
    expect(finalTokenName('Brookhaven RP by RobloxPad')).toBe('Brookhaven RP by RobloxPad')
    expect(finalTokenName('obby BY ROBLOXPAD')).toBe('obby by RobloxPad')
  })

  it('keeps the suffix when the base is long', () => {
    const out = finalTokenName('X'.repeat(80))
    expect(out.endsWith(TOKEN_NAME_SUFFIX)).toBe(true)
    expect(out.length).toBe(TOKEN_NAME_MAX)
  })

  it('parses a Roblox games URL, universe id, or search text', () => {
    expect(parseRobloxInput('https://www.roblox.com/games/920587237/Adopt-Me')).toEqual({
      kind: 'place',
      placeId: '920587237',
    })
    expect(parseRobloxInput('383310974')).toEqual({ kind: 'universe', id: '383310974' })
    expect(parseRobloxInput('grow a garden')).toEqual({ kind: 'query', q: 'grow a garden' })
  })
})
