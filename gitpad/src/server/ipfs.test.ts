import { describe, expect, it } from 'vitest'
import { pinRecord } from './ipfs.ts'

describe('pinRecord', () => {
  it('accepts a Pinata CID without a gateway fetch', () => {
    const pin = pinRecord('bafytestcidxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    expect(pin.uri).toBe('ipfs://bafytestcidxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    expect(pin.gateway).toContain('gateway.pinata.cloud/ipfs/')
  })
})
