import { describe, expect, it } from 'vitest'
import type { Hex, TransactionReceipt } from 'viem'
import { factoryUserError, userError } from './errors.ts'
import {
  explorerHitFromJson,
  hashFromUnknown,
  isSoftPending,
  pickReceiptHit,
  receiptPendingError,
  rpcUrlsFor,
  waitForConfirm,
  RECEIPT_PENDING,
  RECEIPT_WAIT_MS,
  type WaitSources,
} from './receipt.ts'

const hash = `0x${'ab'.repeat(32)}` as Hex
const okReceipt = { status: 'success' as const, blockNumber: 10n } as TransactionReceipt

function sources(partial: Partial<WaitSources>): WaitSources {
  return {
    rpcHits: async () => [{ hit: 'miss' }],
    explorerHit: async () => 'miss',
    getMinedTx: async () => null,
    getReceipt: async () => null,
    padExists: async () => false,
    ...partial,
  }
}

describe('receipt', () => {
  it('rotates the documented Arc RPCs', () => {
    const urls = rpcUrlsFor('arc')
    expect(urls).toContain('https://rpc.testnet.arc.io')
    expect(urls).toContain('https://rpc.blockdaemon.testnet.arc.io')
    expect(urls.length).toBeGreaterThanOrEqual(2)
    expect(RECEIPT_WAIT_MS).toBeGreaterThanOrEqual(180_000)
  })

  it('treats any successful receipt as mined even if another RPC is busy', () => {
    expect(pickReceiptHit(['busy', 'success', 'miss'])).toBe('success')
    expect(pickReceiptHit(['reverted', 'busy'])).toBe('reverted')
    expect(pickReceiptHit(['busy', 'pending'])).toBe('pending')
    expect(pickReceiptHit(['busy', 'miss'])).toBe('busy')
    expect(pickReceiptHit(['miss', 'miss'])).toBe('miss')
  })

  it('reads Blockscout explorer JSON as a receipt', () => {
    expect(explorerHitFromJson({ result: 'success', status: 'ok' })).toBe('success')
    expect(explorerHitFromJson({ result: 'execution reverted', status: 'error' })).toBe('reverted')
    expect(explorerHitFromJson({})).toBe('miss')
  })

  it('keeps a hash on soft pending and never calls that SlugTaken', () => {
    const err = receiptPendingError(hash)
    expect(err.message).toBe(RECEIPT_PENDING)
    expect(isSoftPending(err)).toBe(true)
    expect(hashFromUnknown(err)).toBe(hash)
    expect(hashFromUnknown(new Error('no'))).toBeNull()
    expect(factoryUserError(err)).toBeNull()
    expect(userError(err)).toBe(RECEIPT_PENDING)
    expect(userError(err)).not.toBe('That slug is taken.')
  })

  it('returns success when a receipt lands', async () => {
    const out = await waitForConfirm(
      hash,
      sources({
        rpcHits: async () => [{ hit: 'success', receipt: okReceipt }],
      }),
      5_000,
      () => 0,
      async () => {},
    )
    expect(out.status).toBe('success')
    expect(out.receipt?.status).toBe('success')
  })

  it('recovers after 429 then a success receipt', async () => {
    let n = 0
    let now = 0
    const out = await waitForConfirm(
      hash,
      sources({
        rpcHits: async () => {
          n += 1
          if (n === 1) return [{ hit: 'busy' }]
          return [{ hit: 'success', receipt: okReceipt }]
        },
      }),
      10_000,
      () => now,
      async (ms) => {
        now += ms
      },
    )
    expect(out.status).toBe('success')
    expect(n).toBe(2)
  })

  it('treats timeout + pad exists as live even without a receipt', async () => {
    let now = 0
    const out = await waitForConfirm(
      hash,
      sources({
        rpcHits: async () => [{ hit: 'busy' }],
        explorerHit: async () => 'busy',
        getMinedTx: async () => ({ blockNumber: 10n }),
        getReceipt: async () => null,
        padExists: async () => now >= 2_000,
      }),
      2_000,
      () => now,
      async (ms) => {
        now += ms
      },
    )
    expect(out.status).toBe('success')
    expect(factoryUserError(new Error('pending'))).toBeNull()
  })

  it('returns soft pending when timeout and no pad and no receipt, not SlugTaken', async () => {
    let now = 0
    const out = await waitForConfirm(
      hash,
      sources({
        rpcHits: async () => [{ hit: 'miss' }],
        explorerHit: async () => 'miss',
        getMinedTx: async () => null,
        getReceipt: async () => null,
        padExists: async () => false,
      }),
      2_000,
      () => now,
      async (ms) => {
        now += ms
      },
    )
    expect(out.status).toBe('pending')
    expect(out.status).not.toBe('reverted')
    expect(userError(receiptPendingError(hash))).toBe(RECEIPT_PENDING)
    expect(userError(receiptPendingError(hash))).not.toBe('That slug is taken.')
    expect(factoryUserError({ data: { errorName: 'pending' } })).toBeNull()
  })

  it('treats explorer success as live when RPC receipts are busy', async () => {
    const out = await waitForConfirm(
      hash,
      sources({
        rpcHits: async () => [{ hit: 'busy' }],
        explorerHit: async () => 'success',
      }),
      5_000,
      () => 0,
      async () => {},
    )
    expect(out.status).toBe('success')
  })
})
