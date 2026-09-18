import { describe, expect, it } from 'vitest'
import { padFromApi, pickOnchainPad, type OnchainPad } from './registry.ts'

const rh: OnchainPad = {
  owner: '0x541Eba67C61099931ee188ab47fA371Fe82c37A9',
  chainId: 4663,
  ownerFeeBps: 100,
  creatorFeeBps: 50,
  launchFeeWei: '0',
  curveId: 1,
  slug: 'x-rh',
  name: 'X RH',
  brandURI: 'kit:bags',
  exists: true,
  tokens: [],
}

const missing: OnchainPad = { ...rh, exists: false, slug: '', name: '' }

describe('pickOnchainPad', () => {
  it('prefers the Robinhood row when it exists', () => {
    expect(pickOnchainPad(rh, null)?.slug).toBe('x-rh')
    expect(pickOnchainPad(rh, missing)?.chainId).toBe(4663)
  })

  it('does not invent a live pad from an empty row', () => {
    expect(pickOnchainPad(null, null)).toBeNull()
    expect(pickOnchainPad(missing, missing)).toBeNull()
    expect(padFromApi({ exists: false, owner: rh.owner })).toBeNull()
    expect(padFromApi({ exists: true, owner: rh.owner, chainId: 4663, slug: 'x-rh', tokens: [] })?.exists).toBe(true)
  })
})
