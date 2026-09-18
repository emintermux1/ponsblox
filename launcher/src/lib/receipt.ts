import { createPublicClient, http, type Hex, type TransactionReceipt } from 'viem'
import {
  ARC_RPC,
  ROBINHOOD_RPC,
  chainOf,
  explorerApiTx,
  type SupportedChain,
} from './chain.ts'

/** Arc RPC 429s; keep polling long enough for a mined create to show up. */
export const RECEIPT_WAIT_MS = 180_000
export const RECEIPT_POLL_MS = 1_000
export const RECEIPT_POLL_MAX_MS = 2_000
export const RECEIPT_PENDING = 'Still confirming — open Explorer'
/** Legacy copy — never use as a hard red fail when a hash exists. */
export const RECEIPT_TIMEOUT = RECEIPT_PENDING

/** Circle primary, then the documented Blockdaemon public HTTP endpoint. */
const ARC_FALLBACK = 'https://rpc.testnet.arc.io'
const ARC_DOCS_FALLBACK = 'https://rpc.blockdaemon.testnet.arc.io'
const RH_FALLBACK = 'https://rpc.mainnet.chain.robinhood.com'

export type ReceiptHit = 'success' | 'reverted' | 'pending' | 'busy' | 'miss'

export type ConfirmStatus = 'success' | 'reverted' | 'pending'

export type ConfirmOutcome = {
  status: ConfirmStatus
  receipt?: TransactionReceipt
}

export type WaitSources = {
  rpcHits: (hash: Hex) => Promise<Array<{ hit: ReceiptHit; receipt?: TransactionReceipt }>>
  explorerHit: (hash: Hex) => Promise<ReceiptHit>
  getMinedTx: (hash: Hex) => Promise<{ blockNumber: bigint } | null>
  getReceipt: (hash: Hex) => Promise<TransactionReceipt | null>
  padExists: () => Promise<boolean>
}

export function rpcUrlsFor(chain: SupportedChain): string[] {
  switch (chain) {
    case 'robinhood':
      return unique([ROBINHOOD_RPC, RH_FALLBACK])
    case 'arc':
      return unique([ARC_RPC, ARC_FALLBACK, ARC_DOCS_FALLBACK])
    default: {
      const _n: never = chain
      return _n
    }
  }
}

function unique(urls: string[]): string[] {
  return [...new Set(urls.map((u) => u.trim()).filter(Boolean))]
}

function isBusy(e: unknown): boolean {
  const raw = e instanceof Error ? e.message : String(e)
  return /429|Too Many Requests|HTTP request failed|fetch failed/i.test(raw)
}

function clientsFor(chain: SupportedChain) {
  const def = chainOf(chain)
  return rpcUrlsFor(chain).map((url) =>
    createPublicClient({
      chain: def,
      transport: http(url, { retryCount: 0, timeout: 8_000 }),
    }),
  )
}

export function pickReceiptHit(hits: ReceiptHit[]): ReceiptHit {
  if (hits.includes('success')) return 'success'
  if (hits.includes('reverted')) return 'reverted'
  if (hits.includes('pending')) return 'pending'
  if (hits.includes('busy')) return 'busy'
  return 'miss'
}

export function receiptPendingError(hash: Hex): Error & { hash: Hex; pending: true } {
  return Object.assign(new Error(RECEIPT_PENDING), { hash, pending: true as const })
}

/** @deprecated Use receiptPendingError — timeout with a hash is soft pending. */
export function receiptTimeoutError(hash: Hex): Error & { hash: Hex } {
  return receiptPendingError(hash)
}

export function isSoftPending(e: unknown): boolean {
  return Boolean(e && typeof e === 'object' && 'pending' in e && (e as { pending?: unknown }).pending === true)
}

export function hashFromUnknown(e: unknown): Hex | null {
  if (!e || typeof e !== 'object' || !('hash' in e)) return null
  const h = (e as { hash?: unknown }).hash
  if (typeof h === 'string' && /^0x[0-9a-fA-F]{64}$/.test(h)) return h as Hex
  return null
}

export function explorerHitFromJson(json: unknown): ReceiptHit {
  if (!json || typeof json !== 'object') return 'miss'
  const o = json as Record<string, unknown>
  const result = String(o.result ?? '')
  const status = String(o.status ?? '')
  if (status === 'ok' || result === 'success') return 'success'
  if (status === 'error' || /revert/i.test(result)) return 'reverted'
  return 'miss'
}

export async function explorerHitOf(
  chain: SupportedChain,
  hash: Hex,
  load: typeof fetch = fetch,
): Promise<ReceiptHit> {
  try {
    const res = await load(explorerApiTx(chain, hash), {
      signal: AbortSignal.timeout(8_000),
    })
    if (res.status === 429) return 'busy'
    if (!res.ok) return 'miss'
    return explorerHitFromJson(await res.json())
  } catch (e) {
    return isBusy(e) ? 'busy' : 'miss'
  }
}

async function hitOf(
  client: ReturnType<typeof createPublicClient>,
  hash: Hex,
): Promise<{ hit: ReceiptHit; receipt?: TransactionReceipt }> {
  try {
    const receipt = await client.getTransactionReceipt({ hash })
    return {
      hit: receipt.status === 'success' ? 'success' : 'reverted',
      receipt,
    }
  } catch (e) {
    const busy = isBusy(e)
    try {
      const tx = await client.getTransaction({ hash })
      if (tx) return { hit: 'pending' }
    } catch (e2) {
      if (busy || isBusy(e2)) return { hit: 'busy' }
      return { hit: 'miss' }
    }
    return { hit: busy ? 'busy' : 'miss' }
  }
}

async function rpcHitsOf(chain: SupportedChain, hash: Hex) {
  const clients = clientsFor(chain)
  return Promise.all(clients.map((c) => hitOf(c, hash)))
}

async function minedTxOf(chain: SupportedChain, hash: Hex): Promise<{ blockNumber: bigint } | null> {
  const clients = clientsFor(chain)
  const rows = await Promise.all(
    clients.map(async (c) => {
      try {
        const tx = await c.getTransaction({ hash })
        if (tx && tx.blockNumber != null) return { blockNumber: tx.blockNumber }
      } catch {
        /* next RPC */
      }
      return null
    }),
  )
  return rows.find((row): row is { blockNumber: bigint } => Boolean(row)) ?? null
}

async function receiptOf(chain: SupportedChain, hash: Hex): Promise<TransactionReceipt | null> {
  const rows = await rpcHitsOf(chain, hash)
  const ok = rows.find((r) => r.hit === 'success' && r.receipt)
  if (ok?.receipt) return ok.receipt
  const bad = rows.find((r) => r.hit === 'reverted' && r.receipt)
  return bad?.receipt ?? null
}

function outcomeFromHit(
  hit: ReceiptHit,
  rows: Array<{ hit: ReceiptHit; receipt?: TransactionReceipt }>,
): ConfirmOutcome | null {
  switch (hit) {
    case 'success': {
      const row = rows.find((r) => r.hit === 'success' && r.receipt)
      return { status: 'success', receipt: row?.receipt }
    }
    case 'reverted': {
      const row = rows.find((r) => r.hit === 'reverted' && r.receipt)
      return { status: 'reverted', receipt: row?.receipt }
    }
    case 'pending':
    case 'busy':
    case 'miss':
      return null
    default: {
      const _n: never = hit
      return _n
    }
  }
}

export async function waitForConfirm(
  hash: Hex,
  sources: WaitSources,
  timeoutMs = RECEIPT_WAIT_MS,
  clock: () => number = Date.now,
  pause: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<ConfirmOutcome> {
  const started = clock()
  let delay = RECEIPT_POLL_MS
  while (clock() - started < timeoutMs) {
    const rows = await sources.rpcHits(hash)
    const explorer = await sources.explorerHit(hash)
    const hit = pickReceiptHit([...rows.map((r) => r.hit), explorer])
    const fromHit = outcomeFromHit(hit, rows)
    if (fromHit) return fromHit
    if (await sources.padExists()) return { status: 'success' }
    const left = timeoutMs - (clock() - started)
    if (left <= 0) break
    await pause(Math.min(delay, left))
    delay = Math.min(delay + 250, RECEIPT_POLL_MAX_MS)
  }
  const mined = await sources.getMinedTx(hash)
  if (mined) {
    const receipt = await sources.getReceipt(hash)
    if (receipt) {
      switch (receipt.status) {
        case 'success':
          return { status: 'success', receipt }
        case 'reverted':
          return { status: 'reverted', receipt }
        default: {
          const _n: never = receipt.status
          return _n
        }
      }
    }
  }
  const explorer = await sources.explorerHit(hash)
  switch (explorer) {
    case 'success':
      return { status: 'success' }
    case 'reverted':
      return { status: 'reverted' }
    case 'pending':
    case 'busy':
    case 'miss':
      break
    default: {
      const _n: never = explorer
      return _n
    }
  }
  if (await sources.padExists()) return { status: 'success' }
  return { status: 'pending' }
}

export function sourcesFor(
  chain: SupportedChain,
  padExists: () => Promise<boolean>,
  load: typeof fetch = fetch,
): WaitSources {
  return {
    rpcHits: (hash) => rpcHitsOf(chain, hash),
    explorerHit: (hash) => explorerHitOf(chain, hash, load),
    getMinedTx: (hash) => minedTxOf(chain, hash),
    getReceipt: (hash) => receiptOf(chain, hash),
    padExists,
  }
}

export async function confirmTransaction(
  chain: SupportedChain,
  hash: Hex,
  padExists: () => Promise<boolean>,
  timeoutMs = RECEIPT_WAIT_MS,
): Promise<ConfirmOutcome> {
  return waitForConfirm(hash, sourcesFor(chain, padExists), timeoutMs)
}
