import { createPublicClient, http, parseAbiItem, parseEventLogs, type Address, type Hex, type WalletClient } from 'viem'
import {
  ARC_BONDING_PAD,
  arcTestnet,
  chainOf,
  factoryFor,
  fromBlockFor,
  isAddressSet,
  numericChainId,
  registryFor,
  type SupportedChain,
} from './chain.ts'
import { factoryUserError } from './errors.ts'
import { BONDING_ABI, FACTORY_WRITE_ABI, REGISTRY_ABI } from './launcherAbi.ts'
import { slugHash } from './keccak.ts'
import type { CustomSkin } from './custom.ts'
import type { KitId } from './kits.ts'
import { encodeBrandURI } from './metadata.ts'
import { publicClient as rhClient } from './pons/client.ts'
import { confirmTransaction, type ConfirmOutcome } from './receipt.ts'
import type { CurveId } from './copy.ts'

export type OnchainPad = {
  owner: Address
  chainId: number
  ownerFeeBps: number
  creatorFeeBps: number
  launchFeeWei: string
  curveId: number
  slug: string
  name: string
  brandURI: string
  exists: boolean
  tokens: readonly Address[]
}

const PAD_CREATED = parseAbiItem(
  'event PadCreated(bytes32 indexed slugHash, address indexed owner, uint64 chainId, string slug, string name)',
)

function clientFor(chain: SupportedChain) {
  switch (chain) {
    case 'robinhood':
      return rhClient
    case 'arc':
      return createPublicClient({
        chain: arcTestnet,
        transport: http(arcTestnet.rpcUrls.default.http[0], { timeout: 12_000 }),
      })
    default: {
      const _n: never = chain
      return _n
    }
  }
}

function padFromRow(
  row: readonly [
    Address,
    bigint,
    number,
    number,
    bigint,
    number,
    string,
    string,
    string,
    boolean,
  ],
  tokens: readonly Address[],
): OnchainPad {
  return {
    owner: row[0],
    chainId: Number(row[1]),
    ownerFeeBps: row[2],
    creatorFeeBps: row[3],
    launchFeeWei: row[4].toString(),
    curveId: row[5],
    slug: row[6],
    name: row[7],
    brandURI: row[8],
    exists: row[9],
    tokens,
  }
}

export function pickOnchainPad(
  rh: OnchainPad | null,
  arc: OnchainPad | null,
  prefer?: SupportedChain,
): OnchainPad | null {
  const a = rh?.exists ? rh : null
  const b = arc?.exists ? arc : null
  if (prefer === undefined) return a ?? b
  switch (prefer) {
    case 'arc':
      return b ?? a
    case 'robinhood':
      return a ?? b
    default: {
      const _n: never = prefer
      return _n
    }
  }
}

export function padFromApi(raw: unknown): OnchainPad | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.exists !== true) return null
  if (typeof o.owner !== 'string' || !isAddressSet(o.owner)) return null
  const tokens = Array.isArray(o.tokens)
    ? o.tokens.filter((t): t is Address => typeof t === 'string' && isAddressSet(t))
    : []
  return {
    owner: o.owner,
    chainId: Number(o.chainId) || 0,
    ownerFeeBps: Number(o.ownerFeeBps) || 0,
    creatorFeeBps: Number(o.creatorFeeBps) || 0,
    launchFeeWei: String(o.launchFeeWei ?? '0'),
    curveId: Number(o.curveId) || 0,
    slug: String(o.slug || ''),
    name: String(o.name || ''),
    brandURI: String(o.brandURI || o.brandUri || ''),
    exists: true,
    tokens,
  }
}

export async function readPad(chain: SupportedChain, slug: string): Promise<OnchainPad | null> {
  const registry = registryFor(chain)
  if (!isAddressSet(registry)) return null
  const client = clientFor(chain)
  const hash = slugHash(slug)
  const row = await client.readContract({
    address: registry,
    abi: REGISTRY_ABI,
    functionName: 'pads',
    args: [hash],
  })
  if (!row || !row[9]) return null
  const tokens = await client.readContract({
    address: registry,
    abi: REGISTRY_ABI,
    functionName: 'tokensOf',
    args: [hash],
  }).catch(() => [] as readonly Address[])
  return padFromRow(row, tokens)
}

export async function lookupPad(
  slug: string,
  prefer?: SupportedChain,
): Promise<{ pad: OnchainPad | null; error: string | null }> {
  try {
    const res = await fetch(`/api/pad?slug=${encodeURIComponent(slug)}`)
    const json = await res.json().catch(() => ({})) as {
      robinhood?: unknown
      arc?: unknown
      rhError?: boolean
      arcError?: boolean
      error?: string
    }
    if (res.ok) {
      const pad = pickOnchainPad(padFromApi(json.robinhood), padFromApi(json.arc), prefer)
      if (pad) return { pad, error: null }
      if (json.rhError && json.arcError) {
        return { pad: null, error: 'Chain RPC is busy. Try again.' }
      }
      if (prefer === 'robinhood' && json.rhError) {
        return { pad: null, error: 'Chain RPC is busy. Try again.' }
      }
      if (prefer === 'arc' && json.arcError) {
        return { pad: null, error: 'Chain RPC is busy. Try again.' }
      }
      if (!prefer && json.rhError && !json.arc) {
        return { pad: null, error: 'Chain RPC is busy. Try again.' }
      }
      return { pad: null, error: null }
    }
    if (res.status >= 500) {
      return { pad: null, error: json.error || 'Chain RPC is busy. Try again.' }
    }
  } catch {
    /* fall through to the wallet RPC */
  }
  try {
    const rh = await readPad('robinhood', slug)
    if (rh?.exists && prefer !== 'arc') return { pad: rh, error: null }
    const arc = await readPad('arc', slug)
    return { pad: pickOnchainPad(rh, arc, prefer), error: null }
  } catch (e) {
    return { pad: null, error: e instanceof Error ? e.message : 'Could not read this pad.' }
  }
}

async function listFromRegistry(chain: SupportedChain): Promise<OnchainPad[]> {
  const registry = registryFor(chain)
  if (!isAddressSet(registry)) return []
  const client = clientFor(chain)
  const count = await client.readContract({
    address: registry,
    abi: REGISTRY_ABI,
    functionName: 'padCount',
  }).catch(() => 0n)
  const out: OnchainPad[] = []
  for (let i = 0n; i < count; i++) {
    const hash = await client.readContract({
      address: registry,
      abi: REGISTRY_ABI,
      functionName: 'slugHashes',
      args: [i],
    })
    const row = await client.readContract({
      address: registry,
      abi: REGISTRY_ABI,
      functionName: 'pads',
      args: [hash],
    })
    if (!row[9]) continue
    const tokens = await client.readContract({
      address: registry,
      abi: REGISTRY_ABI,
      functionName: 'tokensOf',
      args: [hash],
    }).catch(() => [] as readonly Address[])
    out.push(padFromRow(row, tokens))
  }
  return out
}

async function listFromFactoryEvents(chain: SupportedChain): Promise<OnchainPad[]> {
  const factory = factoryFor(chain)
  if (!isAddressSet(factory)) return []
  const client = clientFor(chain)
  const latest = await client.getBlockNumber().catch(() => 0n)
  if (!latest) return []
  const configured = fromBlockFor(chain)
  const fromBlock = configured > 0n
    ? configured
    : latest > 80_000n
      ? latest - 80_000n
      : 0n
  const logs = await client.getLogs({
    address: factory,
    event: PAD_CREATED,
    fromBlock,
    toBlock: 'latest',
  }).catch(() => [])
  const slugs = [...new Set(logs.map((log) => log.args.slug).filter((s): s is string => Boolean(s)))]
  const pads = await Promise.all(slugs.map((slug) => readPad(chain, slug).catch(() => null)))
  return pads.filter((pad): pad is OnchainPad => Boolean(pad))
}

export async function listPads(chain: SupportedChain): Promise<OnchainPad[]> {
  const fromEvents = await listFromFactoryEvents(chain)
  if (fromEvents.length > 0) return fromEvents
  return listFromRegistry(chain)
}

export type CreatePadResult = { hash: Hex; status: 'success' | 'pending' }

export async function confirmPad(
  chain: SupportedChain,
  hash: Hex,
  slug: string,
  timeoutMs?: number,
): Promise<ConfirmOutcome> {
  return confirmTransaction(
    chain,
    hash,
    () => readPad(chain, slug).then((pad) => Boolean(pad?.exists)).catch(() => false),
    timeoutMs,
  )
}

export async function createPadTx(
  wallet: WalletClient,
  account: Address,
  input: {
    chain: SupportedChain
    slug: string
    name: string
    brandURI: string
    kit: KitId
    custom?: CustomSkin
    ownerFeeBps: number
    creatorFeeBps: number
    launchFeeWei: bigint
    curveId: CurveId
  },
  /** Fires once the wallet has signed, before the receipt lands. */
  onSent?: (hash: Hex) => void,
): Promise<CreatePadResult> {
  const factory = factoryFor(input.chain)
  if (!isAddressSet(factory)) throw new Error('Launcher factory is not on this chain yet.')
  const args = [
    input.slug,
    input.name,
    encodeBrandURI({ kit: input.kit, brandURI: input.brandURI, custom: input.custom }),
    BigInt(numericChainId(input.chain)),
    input.ownerFeeBps,
    input.creatorFeeBps,
    input.launchFeeWei,
    input.curveId,
  ] as const
  const existing = await readPad(input.chain, input.slug).catch(() => null)
  if (existing?.exists) throw new Error('SlugTaken')
  const client = clientFor(input.chain)
  try {
    await client.simulateContract({
      account,
      address: factory,
      abi: FACTORY_WRITE_ABI,
      functionName: 'createPad',
      args,
    })
  } catch (e) {
    if (factoryUserError(e)) throw e
  }
  const hash = await wallet.writeContract({
    account,
    chain: chainOf(input.chain),
    address: factory,
    abi: FACTORY_WRITE_ABI,
    functionName: 'createPad',
    args,
  })
  onSent?.(hash)
  const outcome = await confirmPad(input.chain, hash, input.slug)
  switch (outcome.status) {
    case 'success':
      return { hash, status: 'success' }
    case 'pending': {
      const pad = await readPad(input.chain, input.slug).catch(() => null)
      if (pad?.exists) return { hash, status: 'success' }
      return { hash, status: 'pending' }
    }
    case 'reverted': {
      const receipt = outcome.receipt
      if (receipt) {
        try {
          await client.simulateContract({
            account,
            address: factory,
            abi: FACTORY_WRITE_ABI,
            functionName: 'createPad',
            args,
            blockNumber: receipt.blockNumber,
          })
        } catch (sim) {
          if (factoryUserError(sim)) throw sim
        }
      }
      throw new Error('Create pad reverted.')
    }
    default: {
      const _n: never = outcome.status
      return _n
    }
  }
}

export async function linkTokenTx(
  wallet: WalletClient,
  account: Address,
  chain: SupportedChain,
  slug: string,
  token: Address,
): Promise<Hex> {
  const factory = factoryFor(chain)
  if (!isAddressSet(factory)) throw new Error('Launcher factory is not on this chain yet.')
  const hash = await wallet.writeContract({
    account,
    chain: chainOf(chain),
    address: factory,
    abi: FACTORY_WRITE_ABI,
    functionName: 'linkToken',
    args: [slug, token],
  })
  const receipt = await clientFor(chain).waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error('Link token reverted.')
  return hash
}

export async function launchOnArc(
  wallet: WalletClient,
  account: Address,
  name: string,
  symbol: string,
  curveId: number,
): Promise<{ token: Address; hash: Hex }> {
  if (!isAddressSet(ARC_BONDING_PAD)) throw new Error('Launcher factory is not on this chain yet.')
  const hash = await wallet.writeContract({
    account,
    chain: arcTestnet,
    address: ARC_BONDING_PAD,
    abi: BONDING_ABI,
    functionName: 'launch',
    args: [name, symbol, curveId],
  })
  const client = clientFor('arc')
  const receipt = await client.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error('Arc launch reverted.')
  const parsed = parseEventLogs({ abi: BONDING_ABI, logs: receipt.logs, eventName: 'TokenLaunched' })
  const ev = parsed[0]
  if (!ev) throw new Error('Arc launch mined without TokenLaunched.')
  return { token: ev.args.token, hash }
}

export async function buyOnArc(
  wallet: WalletClient,
  account: Address,
  token: Address,
  valueWei: bigint,
): Promise<Hex> {
  if (!isAddressSet(ARC_BONDING_PAD)) throw new Error('Launcher factory is not on this chain yet.')
  if (valueWei <= 0n) throw new Error('Enter a USDC amount to buy.')
  const hash = await wallet.writeContract({
    account,
    chain: arcTestnet,
    address: ARC_BONDING_PAD,
    abi: BONDING_ABI,
    functionName: 'buy',
    args: [token, 0n],
    value: valueWei,
  })
  const receipt = await clientFor('arc').waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error('Buy reverted.')
  return hash
}

export async function sellOnArc(
  wallet: WalletClient,
  account: Address,
  token: Address,
  tokensIn: bigint,
): Promise<Hex> {
  if (!isAddressSet(ARC_BONDING_PAD)) throw new Error('Launcher factory is not on this chain yet.')
  if (tokensIn <= 0n) throw new Error('Enter a token amount to sell.')
  const hash = await wallet.writeContract({
    account,
    chain: arcTestnet,
    address: ARC_BONDING_PAD,
    abi: BONDING_ABI,
    functionName: 'sell',
    args: [token, tokensIn, 0n],
  })
  const receipt = await clientFor('arc').waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error('Sell reverted.')
  return hash
}
