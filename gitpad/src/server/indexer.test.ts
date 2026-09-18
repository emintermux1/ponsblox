import { describe, expect, it } from 'vitest'
import { logKey } from './indexer.ts'

describe('indexer idempotency key', () => {
  it('is stable for the same log', () => {
    expect(logKey(10n, '0xAbC', 3)).toBe(logKey(10n, '0xabc', 3))
    expect(logKey(10n, '0xabc', 3)).not.toBe(logKey(10n, '0xabc', 4))
  })
})
