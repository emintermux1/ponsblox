import { describe, expect, it } from 'vitest'
import { isLaunchEvent, LAUNCH_EVENTS } from './launchEvents.ts'

describe('launch events', () => {
  it('accepts the product funnel allowlist', () => {
    for (const event of LAUNCH_EVENTS) expect(isLaunchEvent(event)).toBe(true)
  })

  it('rejects unknown or wallet-shaped values', () => {
    expect(isLaunchEvent('wallet_connected')).toBe(false)
    expect(isLaunchEvent('0x1111111111111111111111111111111111111111')).toBe(false)
    expect(isLaunchEvent('')).toBe(false)
  })
})
