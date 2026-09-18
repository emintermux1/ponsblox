import { isAddress, parseEventLogs, parseUnits, type Address, type Hex } from 'viem'
import { ENV } from './env.ts'
import { publicClient, RBLX, RBLX_DECIMALS } from './chain.ts'
import { rememberFromTx } from './feed.ts'
import {
  buildLaunchCall, buildTradeCall, FACTORY_ABI, readToken, type LaunchDraft,
} from './pons.ts'

const TTL_MS = 15 * 60 * 1000
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export type Intent = {
  id: string
  code: string
  kind: 'launch' | 'trade'
  createdAt: number
  expiresAt: number
  robloxUserId?: string
  status: 'pending' | 'signed' | 'expired'
  txHash?: Hex
  token?: Address
  summary: string
  signUrl: string
  call: Record<string, unknown>
}

const byCode = new Map<string, Intent>()

function mintCode(): string {
  let code = ''
  const b = new Uint8Array(6)
  crypto.getRandomValues(b)
  for (const n of b) code += ALPHABET[n % ALPHABET.length]
  if (byCode.has(code)) return mintCode()
  return code
}

function signUrl(code: string) {
  return `${ENV.publicWebUrl}/sign/${code}`
}

function prune() {
  const now = Date.now()
  for (const [k, v] of byCode) {
    if (v.status === 'pending' && v.expiresAt < now) v.status = 'expired'
    if (v.expiresAt + TTL_MS < now) byCode.delete(k)
  }
}

export function getIntent(code: string): Intent | undefined {
  prune()
  return byCode.get(code.toUpperCase())
}

export async function createLaunchIntent(input: LaunchDraft & { robloxUserId?: string }): Promise<Intent> {
  prune()
  const call = await buildLaunchCall(input)
  const code = mintCode()
  const now = Date.now()
  const intent: Intent = {
    id: crypto.randomUUID(),
    code,
    kind: 'launch',
    createdAt: now,
    expiresAt: now + TTL_MS,
    robloxUserId: input.robloxUserId,
    status: 'pending',
    summary: `${input.symbol.trim().toUpperCase()} / RBLX`,
    signUrl: signUrl(code),
    call: {
      ...call,
      pairToken: RBLX,
      name: input.name.trim(),
      symbol: input.symbol.trim().toUpperCase(),
      recipient: input.recipient,
    },
  }
  byCode.set(code, intent)
  return intent
}

export async function createTradeIntent(input: {
  token: Address
  side: 'buy' | 'sell'
  amount: string
  recipient: Address
  robloxUserId?: string
}): Promise<Intent> {
  prune()
  if (!isAddress(input.token)) throw new Error('Not a token address')
  const rec = await readToken(input.token)
  if (!rec) throw new Error('Not an RBLX-pair Pons launch')
  const amount = parseUnits(input.amount.trim(), input.side === 'buy' ? RBLX_DECIMALS : 18)
  if (amount <= 0n) throw new Error('Amount must be greater than zero')
  const call = await buildTradeCall(input.token, input.side, amount, input.recipient)
  const code = mintCode()
  const now = Date.now()
  const intent: Intent = {
    id: crypto.randomUUID(),
    code,
    kind: 'trade',
    createdAt: now,
    expiresAt: now + TTL_MS,
    robloxUserId: input.robloxUserId,
    status: 'pending',
    token: rec.token,
    summary: `${input.side === 'buy' ? 'Buy' : 'Sell'} ${rec.symbol} with RBLX`,
    signUrl: signUrl(code),
    call: { ...call, token: rec.token, side: input.side, amount: amount.toString(), recipient: input.recipient },
  }
  byCode.set(code, intent)
  return intent
}

export async function confirmIntent(code: string, hash: Hex): Promise<Intent> {
  const intent = getIntent(code)
  if (!intent) throw new Error('Unknown code')
  if (intent.status === 'expired') throw new Error('That code expired. Make the request again in Roblox.')
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 })
  if (receipt.status !== 'success') throw new Error('The transaction reverted.')
  intent.txHash = hash
  intent.status = 'signed'

  if (intent.kind === 'launch') {
    const logs = parseEventLogs({ abi: FACTORY_ABI, logs: receipt.logs, eventName: 'TokenLaunched' })
    const token = logs[0]?.args.token as Address | undefined
    if (token) {
      intent.token = token
      rememberFromTx(token)
    }
  } else if (intent.token) {
    rememberFromTx(intent.token)
  }
  return intent
}

export function publicIntent(intent: Intent) {
  return {
    code: intent.code,
    kind: intent.kind,
    status: intent.status,
    summary: intent.summary,
    signUrl: intent.signUrl,
    expiresAt: intent.expiresAt,
    token: intent.token ?? null,
    txHash: intent.txHash ?? null,
    call: intent.call,
  }
}
