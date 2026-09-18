import { formatUnits, isAddress, parseUnits, type Address, type WalletClient } from 'viem'
import { robinhood } from '../chain'
import {
  ASSETS,
  getAsset,
  registryAddresses,
  type AssetId,
  type LeveragedAsset,
} from '../assets'
import { CURVE_ABI, ERC20_ABI, ETH_PAIR, FACTORY_ABI, PONS_FACTORY, TOKEN_INFO_ABI } from '../contracts'
import { failMessage } from '../format'
import { byLongerName } from '../naming'
import { DEFAULT_TOKEN_ART, isPublicImage, LONGER_OFFICIAL_TOKEN, publicTokenImage } from '../official'
import { displayPair } from '../pairMeta'
import { PREVIEW_LAUNCHES, previewMarket, previewStats } from '../preview'
import { loadRecent } from '../recent'
import { markSeries } from '../series'
import { publicClient } from './client'
import {
  buildLaunchCall,
  readFactoryStatus,
  readPairApproved,
  scanPairLaunches,
  sendLaunch,
  validateDraft,
} from './factory'
import type {
  AssetWithPons,
  LaunchBlock,
  LaunchDraft,
  LaunchReceipt,
  LongerLaunch,
  PairFilter,
  PrepareResult,
  SortKey,
  TokenMarket,
} from './types'

const approvedCache = new Map<string, boolean>()

async function pairApproved(address: Address | ''): Promise<boolean> {
  if (!address) return false
  const key = address.toLowerCase()
  if (approvedCache.has(key)) return approvedCache.get(key) as boolean
  const ok = await readPairApproved(address).catch(() => false)
  approvedCache.set(key, ok)
  return ok
}

export async function getSupported3XAssets(): Promise<AssetWithPons[]> {
  const stats = previewStats()
  const rows = await Promise.all(
    ASSETS.map(async (asset) => {
      const ponsApproved = await pairApproved(asset.address)
      const preview = stats.find((s) => s.id === asset.id)
      return {
        ...asset,
        ponsApproved,
        launchCount: preview?.launchCount ?? 0,
        combinedVolume: preview?.combinedVolume ?? 0,
      }
    }),
  )
  return rows
}

function sortLaunches(rows: LongerLaunch[], sort: SortKey): LongerLaunch[] {
  const copy = [...rows]
  switch (sort) {
    case 'newest':
      return copy.sort((a, b) => b.createdAt - a.createdAt)
    case 'mcap':
      return copy.sort((a, b) => b.marketCap - a.marketCap)
    case 'volume':
      return copy.sort((a, b) => b.volume24h - a.volume24h)
    default: {
      const _e: never = sort
      return _e
    }
  }
}

function matchesPair(row: LongerLaunch, pair: PairFilter): boolean {
  switch (pair) {
    case 'all':
      return true
    case 'NVDA3X':
    case 'META3X':
    case 'TSLA3X':
    case 'AAPL3X':
    case 'MSFT3X':
      return row.pair.id === pair
    default: {
      const _e: never = pair
      return _e
    }
  }
}

async function liveFromFactory(): Promise<LongerLaunch[]> {
  const recent = loadRecent()
  const scanned = await scanPairLaunches(registryAddresses()).catch(() => [] as Address[])
  const tokens = [...new Set([
    LONGER_OFFICIAL_TOKEN.toLowerCase() as Address,
    ...recent.map((r) => r.token.toLowerCase() as Address),
    ...scanned.map((t) => t.toLowerCase() as Address),
  ])]
  const hint = new Map(recent.map((r) => [r.token.toLowerCase(), r]))
  const out: LongerLaunch[] = []
  for (const token of tokens) {
    const row = hint.get(token.toLowerCase())
    const market = await readLiveMarket(token, row?.pairId, row?.logo).catch(() => null)
    if (market) out.push(market)
  }
  return out
}

async function readLiveMarket(token: Address, pairHint?: AssetId, logoHint?: string): Promise<TokenMarket | null> {
  if (!isAddress(token)) return null
  const launched = await publicClient.readContract({
    address: PONS_FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getLaunchedToken',
    args: [token],
  }).catch(() => null)
  if (!launched?.exists) return null

  const curve = launched.curve
  const info = await publicClient.readContract({
    address: token,
    abi: TOKEN_INFO_ABI,
    functionName: 'getTokenInfo',
  }).catch(() => null)
  const [name, symbol, logo, description, website, totalSupply, graduated, ready, reserves] = await Promise.all([
    publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'name' }).catch(() => 'Unknown'),
    publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => '???'),
    publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'logo' }).catch(() => info?.[1] || ''),
    publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'description' }).catch(() => info?.[2] || ''),
    publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'website' }).catch(() => info?.[3]?.website || ''),
    publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'totalSupply' }).catch(() => 0n),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'graduated' }).catch(() => false),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'readyToGraduate' }).catch(() => false),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'getReserves' }).catch(() => null),
  ])
  const pair = getAsset(pairHint) ?? displayPair(
    launched.pairToken,
    String(description || info?.[2] || ''),
    String(website || info?.[3]?.website || ''),
    String(info?.[3]?.twitter || ''),
  ) ?? getAsset('NVDA3X')
  if (!pair) return null

  const quoteReserve = reserves ? reserves[0] : 0n
  const tokenReserve = reserves ? reserves[1] : 0n
  let price = 0
  let marketCap = 0
  if (tokenReserve > 0n && quoteReserve > 0n && totalSupply > 0n) {
    price = Number(formatUnits((quoteReserve * 10n ** 18n) / tokenReserve, 18))
    marketCap = Number(formatUnits((quoteReserve * totalSupply) / tokenReserve, 18))
  }

  const bondingPct = graduated
    ? 100
    : ready
      ? 96
      : tokenReserve > 0n
        ? Math.min(95, Math.round(Number(formatUnits(quoteReserve, 18)) * 4))
        : 0

  return {
    id: token,
    token,
    curve,
    name: byLongerName(String(name)),
    symbol: String(symbol),
    logo: publicTokenImage(String(logo || info?.[1] || logoHint || DEFAULT_TOKEN_ART)),
    description: String(description || info?.[2] || ''),
    website: String(website || info?.[3]?.website || ''),
    twitter: String(info?.[3]?.twitter || ''),
    telegram: String(info?.[3]?.telegram || ''),
    pair,
    marketCap,
    volume24h: 0,
    price,
    holders: 0,
    createdAt: Date.now(),
    bonding: graduated ? 'graduated' : 'bonding',
    bondingPct,
    creator: launched.deployer,
    source: 'live',
    quoteReserve: quoteReserve.toString(),
    tokenReserve: tokenReserve.toString(),
    totalSupply: totalSupply.toString(),
    trades: [],
    holderRows: [],
    series: price > 0 ? markSeries(price, token) : [],
  }
}

export function getPreviewLaunches(input?: {
  pair?: PairFilter
  sort?: SortKey
}): LongerLaunch[] {
  const pair = input?.pair ?? 'all'
  const sort = input?.sort ?? 'newest'
  return sortLaunches(PREVIEW_LAUNCHES.filter((row) => matchesPair(row, pair)), sort)
}

export async function getLongerLaunches(input?: {
  pair?: PairFilter
  sort?: SortKey
}): Promise<{ rows: LongerLaunch[]; preview: boolean; liveCount: number }> {
  const pair = input?.pair ?? 'all'
  const sort = input?.sort ?? 'newest'
  const live = await liveFromFactory().catch(() => [] as LongerLaunch[])
  const merged = [...live, ...PREVIEW_LAUNCHES.filter((p) => !live.some((l) => l.symbol === p.symbol))]
  const filtered = merged.filter((row) => matchesPair(row, pair))
  return {
    rows: sortLaunches(filtered, sort),
    preview: live.length === 0,
    liveCount: live.length,
  }
}

export async function getTokenMarket(id: string): Promise<TokenMarket | null> {
  if (isAddress(id)) {
    const row = loadRecent().find((r) => r.token.toLowerCase() === id.toLowerCase())
    const live = await readLiveMarket(id as Address, row?.pairId, row?.logo).catch(() => null)
    if (live) return live
  }
  return previewMarket(id)
}

export function launchBlockFor(input: {
  connected: boolean
  onRightChain: boolean
  draft: LaunchDraft
  asset?: LeveragedAsset
  factoryEnabled: boolean | null
}): LaunchBlock {
  const { connected, onRightChain, draft, asset, factoryEnabled } = input
  if (!connected) return { kind: 'connect' }
  if (!onRightChain) return { kind: 'wrong_chain' }
  if (!asset) return { kind: 'invalid_form', message: 'Pick a 3X pair' }
  if (factoryEnabled === false) return { kind: 'factory_paused' }
  const form = validateDraft(draft)
  if (form) return { kind: 'invalid_form', message: form }
  return { kind: 'ready' }
}

export function launchButtonLabel(block: LaunchBlock, ticker: string, pairLabel: string): string {
  const t = ticker.trim().toUpperCase() || 'TOKEN'
  switch (block.kind) {
    case 'connect':
      return 'Connect wallet to launch'
    case 'wrong_chain':
      return 'Switch to Robinhood Chain'
    case 'factory_paused':
      return 'Pons launches are paused'
    case 'invalid_form':
      return block.message
    case 'ready':
      return `Launch ${t} with ${pairLabel}`
    default: {
      const _e: never = block
      return _e
    }
  }
}

export async function prepareLaunch(
  draft: LaunchDraft,
  account: Address | null,
  onRightChain: boolean,
): Promise<PrepareResult> {
  const asset = getAsset('NVDA3X') ?? getAsset(draft.pairId)
  const factory = await readFactoryStatus(ETH_PAIR).catch(() => null)
  const block = launchBlockFor({
    connected: Boolean(account),
    onRightChain,
    draft: { ...draft, recipient: draft.recipient || account || '', pairId: asset?.id ?? 'NVDA3X' },
    asset,
    factoryEnabled: factory?.launchEnabled ?? null,
  })
  if (block.kind !== 'ready' || !asset || !account) return { ok: false, block }
  try {
    const call = await buildLaunchCall(
      { ...draft, pairId: asset.id },
      asset.address,
      (draft.recipient || account) as Address,
    )
    return { ok: true, call }
  } catch (e) {
    return { ok: false, block: { kind: 'invalid_form', message: failMessage((e as Error).message) } }
  }
}

export async function launchToken(
  wallet: WalletClient,
  account: Address,
  draft: LaunchDraft,
): Promise<LaunchReceipt> {
  const liveDraft: LaunchDraft = {
    ...draft,
    pairId: 'NVDA3X',
    logo: isPublicImage(draft.logo) ? draft.logo : publicTokenImage(draft.logo),
    name: byLongerName(draft.name),
  }
  const prepared = await prepareLaunch(liveDraft, account, true)
  if (!prepared.ok) {
    const pair = getAsset('NVDA3X')
    throw new Error(launchButtonLabel(prepared.block, liveDraft.symbol, pair ? `${pair.symbol} 3X` : '3X'))
  }
  try {
    return await sendLaunch(wallet, account, prepared.call)
  } catch (e) {
    const nvda = getAsset('NVDA3X')?.address
    if (nvda && prepared.call.pairToken.toLowerCase() === nvda.toLowerCase()) {
      const ethCall = await buildLaunchCall(liveDraft, ETH_PAIR, (liveDraft.recipient || account) as Address)
      return sendLaunch(wallet, account, ethCall)
    }
    throw e
  }
}

export async function buyToken(input: {
  wallet: WalletClient
  account: Address
  curve: Address
  pair: Address
  amount: string
}): Promise<`0x${string}`> {
  const quoteIn = parseUnits(input.amount.trim(), 18)
  if (quoteIn <= 0n) throw new Error('Enter an amount')
  const curvePair = await publicClient.readContract({
    address: input.curve,
    abi: CURVE_ABI,
    functionName: 'pairToken',
  }).catch(() => input.pair)
  const native = curvePair.toLowerCase() === ETH_PAIR.toLowerCase()
  if (!native) {
    const allowance = await publicClient.readContract({
      address: curvePair,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [input.account, input.curve],
    })
    if (allowance < quoteIn) {
      await input.wallet.writeContract({
        account: input.account,
        chain: robinhood,
        address: curvePair,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [input.curve, quoteIn],
      })
    }
  }
  return input.wallet.writeContract({
    account: input.account,
    chain: robinhood,
    address: input.curve,
    abi: CURVE_ABI,
    functionName: 'buy',
    args: [quoteIn, 0n, input.account],
    value: native ? quoteIn : 0n,
  })
}

export async function sellToken(input: {
  wallet: WalletClient
  account: Address
  token: Address
  curve: Address
  amount: string
}): Promise<`0x${string}`> {
  const tokensIn = parseUnits(input.amount.trim(), 18)
  if (tokensIn <= 0n) throw new Error('Enter an amount')
  const allowance = await publicClient.readContract({
    address: input.token,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [input.account, input.curve],
  })
  if (allowance < tokensIn) {
    await input.wallet.writeContract({
      account: input.account,
      chain: robinhood,
      address: input.token,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [input.curve, tokensIn],
    })
  }
  return input.wallet.writeContract({
    account: input.account,
    chain: robinhood,
    address: input.curve,
    abi: CURVE_ABI,
    functionName: 'sell',
    args: [tokensIn, 0n, input.account],
  })
}

export function isPairFilter(v: string | null): v is PairFilter {
  if (!v || v === 'all') return v === 'all'
  return Boolean(getAsset(v as AssetId))
}

export function isSortKey(v: string | null): v is SortKey {
  return v === 'newest' || v === 'mcap' || v === 'volume'
}
