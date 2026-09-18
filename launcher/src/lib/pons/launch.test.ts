import { describe, expect, it } from 'vitest'
import { ZERO } from '../chain.ts'
import { buildTokenParams, tokenFromLaunchLogs } from './launch.ts'

describe('pons adapter', () => {
  it('does not invent a token from empty logs', () => {
    expect(tokenFromLaunchLogs([])).toBeNull()
  })

  it('shapes documented launch params', () => {
    const params = buildTokenParams(
      {
        name: 'Steel by Ironworks',
        symbol: 'STL',
        logo: 'https://example.com/a.png',
        description: 'Launched on Ironworks',
        website: 'https://ironworks.launcher.family/',
        twitter: '',
        creatorFeeRecipient: ZERO,
        creatorTaxBps: 50,
      },
      '0x1111111111111111111111111111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222222222222222222222222222',
    )
    expect(params.name).toBe('Steel by Ironworks')
    expect(params.buybackEnabled).toBe(false)
    expect(params.socials.telegram).toBe('')
    expect(params.creatorTaxBps).toBe(50)
  })
})
