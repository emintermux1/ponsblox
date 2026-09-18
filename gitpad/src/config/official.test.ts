import { describe, expect, it } from 'vitest'
import { getAddress } from 'viem'
import { GITPAD_OFFICIAL_TOKEN, GITPAD_OFFICIAL_TX, isOfficialToken } from './official.ts'

describe('official GitPad coin', () => {
  it('pins the live Pons V2 CA', () => {
    expect(getAddress(GITPAD_OFFICIAL_TOKEN)).toBe('0xCE8E2fD91eaB5536Fd347c94dEB4e54DFaf62016')
    expect(isOfficialToken('0xce8e2fd91eab5536fd347c94deb4e54dfaf62016')).toBe(true)
    expect(isOfficialToken('0x0000000000000000000000000000000000000001')).toBe(false)
    expect(GITPAD_OFFICIAL_TX.startsWith('0x')).toBe(true)
  })
})
