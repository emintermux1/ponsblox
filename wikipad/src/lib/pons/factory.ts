import {
  encodeFunctionData,
  formatUnits,
  isAddress,
  parseEventLogs,
  parseUnits,
  type Address,
  type Hash,
  type Hex,
  type Log,
  type WalletClient,
} from 'viem'
import { APPROVE_ABI, CURVE_ABI, ERC20_ABI, FACTORY_ABI, ROUTER_ABI, TOKEN_INFO_ABI, TOKEN_LAUNCHED } from './abi.ts'
import { publicClient, rhc } from './client.ts'
import {
  FACTORY,
  LAUNCH_AND_BUY,
  LAUNCH_CONFIG_ID,
  LOGO_MAX_BYTES,
  PAIR_TOKEN,
  QUOTE_DECIMALS,
  ZERO,
} from './config.ts'
import type { FactoryStatus, LaunchCall, LaunchDraft, LaunchReceipt, TokenRecord } from './types.ts'
import { parseWikiBinding } from '../metadata.ts'
import { errorText, RPC_BUSY, sanitizeUserError } from '../safeError.ts'

export { LOGO_MAX_BYTES }

function nativePair(addr: string) {
  return addr.toLowerCase() === ZERO.toLowerCase()
}

export async function readFactoryStatus(): Promise<FactoryStatus> {
  try {
  const [approved, economics, fee, enabled, maxTax, config] = await Promise.all([
    nativePair(PAIR_TOKEN)
      ? Promise.resolve(true)
      : publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'approvedPairTokens', args: [PAIR_TOKEN] }),
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'pairTokenEconomics', args: [PAIR_TOKEN] }),
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'launchFee' }),
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'launchEnabled' }),
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'maxCreatorTaxBps' }),
    publicClient.readContract({
      address: FACTORY,
      abi: FACTORY_ABI,
      functionName: 'getLaunchConfig',
      args: [LAUNCH_CONFIG_ID],
    }).catch(() => null),
  ])
  const [phantomQuote, graduationThreshold, decimals] = economics
  return {
    approved,
    phantomQuote: phantomQuote.toString(),
    graduationThreshold: graduationThreshold.toString(),
    graduationRblx: formatUnits(graduationThreshold, Number(decimals)),
    decimals: Number(decimals),
    launchFee: fee.toString(),
    launchFeeEth: formatUnits(fee, 18),
    launchEnabled: enabled,
    maxCreatorTaxBps: Number(maxTax),
    launchConfigEnabled: config ? Boolean(config.enabled) : null,
  }
  } catch (e) {
    throw new Error(sanitizeUserError(e, RPC_BUSY))
  }
}

export async function readCanLaunch(account: Address): Promise<boolean> {
  try {
    return await publicClient.readContract({
      address: FACTORY, abi: FACTORY_ABI, functionName: 'canLaunch', args: [account],
    })
  } catch (e) {
    throw new Error(sanitizeUserError(e, RPC_BUSY))
  }
}

export function checkLogo(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  const bytes = new TextEncoder().encode(v).length
  if (bytes > LOGO_MAX_BYTES) {
    return v.startsWith('data:')
      ? `A pasted image is ${bytes} bytes and Pons allows ${LOGO_MAX_BYTES}. Host it and paste the link.`
      : `${bytes} bytes, over Pons' ${LOGO_MAX_BYTES} byte logo limit.`
  }
  if (!/^(https:\/\/|ipfs:\/\/)/i.test(v)) return 'Use a link starting with https:// or ipfs://'
  return null
}

export async function readToken(address: Address): Promise<TokenRecord | null> {
  if (!isAddress(address)) return null
  const launched = await publicClient.readContract({
    address: FACTORY, abi: FACTORY_ABI, functionName: 'getLaunchedToken', args: [address],
  }).catch(() => null)
  if (!launched?.exists) return null

  const curve = launched.curve
  const pair = launched.pairToken
  const pairNative = nativePair(pair)
  const info = await publicClient.readContract({
    address, abi: TOKEN_INFO_ABI, functionName: 'getTokenInfo',
  }).catch(() => null)
  const [name, symbol, logo, description, website, totalSupply, graduated, ready, reserves, sellable, pairDecimals, pairSymbol] = await Promise.all([
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'name' }).catch(() => 'Unknown'),
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => '???'),
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'logo' }).catch(() => info?.[1] || ''),
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'description' }).catch(() => info?.[2] || ''),
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'website' }).catch(() => info?.[3]?.website || ''),
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'totalSupply' }).catch(() => 0n),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'graduated' }).catch(() => false),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'readyToGraduate' }).catch(() => false),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'getReserves' }).catch(() => null),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'sellableTokens' }).catch(() => 0n),
    pairNative
      ? Promise.resolve(18)
      : publicClient.readContract({ address: pair, abi: ERC20_ABI, functionName: 'decimals' }).catch(() => 18),
    pairNative
      ? Promise.resolve('ETH')
      : publicClient.readContract({ address: pair, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => 'quote'),
  ])

  const quoteReserve = reserves ? reserves[0] : 0n
  const tokenReserve = reserves ? reserves[1] : 0n
  const quoteDecimals = Number(pairDecimals)
  let priceRblx: string | null = null
  let capRblx: string | null = null
  if (!graduated && tokenReserve > 0n && quoteReserve > 0n && totalSupply > 0n) {
    const cap = (quoteReserve * totalSupply) / tokenReserve
    capRblx = formatUnits(cap, quoteDecimals)
    priceRblx = formatUnits((quoteReserve * 10n ** 18n) / tokenReserve, quoteDecimals)
  }

  const desc = description as string
  const site = website as string
  const socialSite = info?.[3]?.website || ''
  const logoStr = (logo as string) || info?.[1] || ''
  return {
    token: launched.token,
    curve,
    deployer: launched.deployer,
    creatorFeeRecipient: launched.creatorFeeRecipient,
    pairToken: launched.pairToken,
    pairSymbol: String(pairSymbol),
    graduationThreshold: launched.graduationThreshold.toString(),
    creatorTaxBps: Number(launched.creatorTaxBps),
    buybackEnabled: launched.buybackEnabled,
    phase: Number(launched.phase),
    exists: true,
    name: name as string,
    symbol: symbol as string,
    logo: logoStr,
    description: desc || info?.[2] || '',
    website: site || socialSite,
    wiki: parseWikiBinding(site || socialSite, desc || info?.[2] || '', logoStr),
    graduated: Boolean(graduated),
    readyToGraduate: Boolean(ready),
    quoteReserve: quoteReserve.toString(),
    tokenReserve: tokenReserve.toString(),
    sellableTokens: sellable.toString(),
    totalSupply: totalSupply.toString(),
    priceRblx,
    capRblx,
  }
}

export function validateLaunchDraft(d: LaunchDraft, maxTax: number): string | null {
  if (!d.name.trim()) return 'Name is required'
  if (!/^[A-Za-z0-9]{2,11}$/.test(d.symbol.trim())) return 'Ticker must be 2–11 letters or digits'
  const logoErr = checkLogo(d.logo)
  if (logoErr) return logoErr
  if (!d.website.trim()) return 'Wikipedia page URL is required'
  if (!/wikipedia\.org\/wiki\//i.test(d.website)) return 'Pair must be a Wikipedia article URL'
  if (d.creatorTaxBps < 0 || d.creatorTaxBps > maxTax) return `Creator tax must be 0–${maxTax / 100}%`
  if (!isAddress(d.recipient)) return 'Recipient is not a valid address'
  if (d.quoteIn) {
    try {
      if (parseUnits(d.quoteIn, QUOTE_DECIMALS) < 0n) return 'First buy must be a positive ETH amount'
    } catch {
      return 'First buy must be an ETH amount, or empty'
    }
  }
  return null
}

function minTokensOut(raw?: string): bigint {
  const v = (raw || '').trim()
  if (!v) return 0n
  try {
    return parseUnits(v, 18)
  } catch {
    return 0n
  }
}

function randomSalt(): Hex {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return (`0x${[...b].map((x) => x.toString(16).padStart(2, '0')).join('')}`) as Hex
}

export async function buildLaunchCall(d: LaunchDraft): Promise<LaunchCall> {
  const status = await readFactoryStatus()
  if (!status.approved) throw new Error('Pons is not accepting this quote pair right now')
  if (!status.launchEnabled) throw new Error('Pons is not accepting launches right now')
  if (status.launchConfigEnabled === false) throw new Error('This launch config is disabled on Pons.')
  const err = validateLaunchDraft(d, status.maxCreatorTaxBps)
  if (err) throw new Error(err)

  const expectedEconomics = await publicClient.readContract({
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: 'previewLaunchEconomics',
    args: [LAUNCH_CONFIG_ID, PAIR_TOKEN],
  })
  const salt = randomSalt()
  const quoteIn = d.quoteIn.trim() ? parseUnits(d.quoteIn.trim(), QUOTE_DECIMALS) : 0n
  const params = {
    name: d.name.trim(),
    symbol: d.symbol.trim().toUpperCase(),
    logo: d.logo.trim(),
    description: d.description.trim(),
    socials: {
      twitter: '',
      telegram: d.telegram.trim(),
      discord: '',
      website: d.website.trim(),
      farcaster: '',
    },
    creatorFeeRecipient: d.recipient,
    creatorTaxBps: d.creatorTaxBps,
    buybackEnabled: d.buybackEnabled,
    expectedEconomics,
    salt,
  }

  if (quoteIn > 0n) {
    const native = nativePair(PAIR_TOKEN)
    return {
      to: LAUNCH_AND_BUY,
      functionName: 'launchAndBuy',
      value: native ? BigInt(status.launchFee) + quoteIn : BigInt(status.launchFee),
      data: encodeFunctionData({
        abi: ROUTER_ABI,
        functionName: 'launchAndBuy',
        args: [params, LAUNCH_CONFIG_ID, PAIR_TOKEN, quoteIn, minTokensOut(d.minOut), d.recipient, []],
      }),
      approveToken: native ? null : PAIR_TOKEN,
      approveSpender: native ? null : LAUNCH_AND_BUY,
      approveAmount: native ? '0' : quoteIn.toString(),
      quoteIn: quoteIn.toString(),
      launchFee: BigInt(status.launchFee),
    }
  }

  return {
    to: FACTORY,
    functionName: 'launchToken',
    value: BigInt(status.launchFee),
    data: encodeFunctionData({
      abi: FACTORY_ABI,
      functionName: 'launchToken',
      args: [params, LAUNCH_CONFIG_ID, PAIR_TOKEN],
    }),
    approveToken: null,
    approveSpender: null,
    approveAmount: '0',
    quoteIn: '0',
    launchFee: BigInt(status.launchFee),
  }
}

export function tokenFromLaunchReceipt(logs: Log[]): { token: Address; curve: Address } | null {
  const parsed = parseEventLogs({ abi: FACTORY_ABI, logs, eventName: 'TokenLaunched' })
  const ev = parsed[0]
  if (!ev?.args.token || !ev.args.curve) return null
  return { token: ev.args.token as Address, curve: ev.args.curve as Address }
}

function classifyWriteError(e: unknown): string {
  const text = errorText(e)
  if (/User rejected|denied|4001/i.test(text)) return 'You cancelled. Nothing was sent.'
  if (/insufficient funds|exceeds the balance/i.test(text)) return 'Insufficient ETH for the launch fee and gas.'
  if (/replacement|nonce too low|already known/i.test(text)) return 'A replacement or dropped transaction was detected. Check the explorer before sending again.'
  return sanitizeUserError(e, RPC_BUSY)
}

export async function sendLaunch(
  wallet: WalletClient,
  account: Address,
  call: LaunchCall,
  onStatus: (s: string) => void,
  onSubmitted?: (hash: Hash) => void,
): Promise<LaunchReceipt> {
  if (call.approveToken && call.approveSpender && BigInt(call.approveAmount) > 0n) {
    onStatus('requesting quote approval…')
    await wallet.writeContract({
      account,
      chain: rhc,
      address: call.approveToken,
      abi: APPROVE_ABI,
      functionName: 'approve',
      args: [call.approveSpender, BigInt(call.approveAmount)],
    })
  }

  onStatus('simulating deployment')
  await publicClient.call({
    account,
    to: call.to,
    data: call.data,
    value: call.value,
  }).catch((e: unknown) => {
    throw new Error(classifyWriteError(e))
  })
  await publicClient.estimateGas({
    account,
    to: call.to,
    data: call.data,
    value: call.value,
  }).catch((e: unknown) => {
    throw new Error(classifyWriteError(e))
  })
  onStatus('simulating deployment ✓ success')

  onStatus('requesting wallet signature')
  let hash: Hash
  try {
    hash = await wallet.sendTransaction({
      account,
      chain: rhc,
      to: call.to,
      data: call.data,
      value: call.value,
    })
  } catch (e) {
    throw new Error(classifyWriteError(e))
  }

  onSubmitted?.(hash)
  onStatus(`transaction submitted ${hash}`)
  onStatus('waiting for Pons V2')
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 }).catch((e: unknown) => {
    throw new Error(classifyWriteError(e))
  })
  if (receipt.status === 'reverted') throw new Error('Launch reverted on chain. No token was created.')

  const extracted = tokenFromLaunchReceipt(receipt.logs)
  if (!extracted) {
    throw new Error('Receipt confirmed but TokenLaunched was not in the logs. Not marking live.')
  }
  onStatus('factory event detected')
  onStatus(`token address ${extracted.token}`)
  return { hash, token: extracted.token, curve: extracted.curve }
}

const SCAN_CHUNK = 4000n
const SCAN_WINDOWS = 48
const SCAN_CONCURRENCY = 4
const PROBE_BATCH = 80

export type LaunchHit = { token: Address; blockNumber: bigint }

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i
      i += 1
      await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
}

export async function scanRecentLaunches(opts?: {
  windows?: number
  chunk?: bigint
}): Promise<LaunchHit[]> {
  const latest = await publicClient.getBlockNumber().catch(() => 0n)
  if (!latest) return []
  const windowsN = opts?.windows ?? SCAN_WINDOWS
  const chunk = opts?.chunk ?? SCAN_CHUNK
  const found = new Map<string, LaunchHit>()
  const windows = Array.from({ length: windowsN }, (_, i) => i)
  await mapPool(windows, SCAN_CONCURRENCY, async (i) => {
    const to = latest - chunk * BigInt(i)
    if (to <= 0n) return
    const from = to > chunk ? to - chunk + 1n : 0n
    const logs = await publicClient.getLogs({
      address: FACTORY,
      event: TOKEN_LAUNCHED,
      fromBlock: from,
      toBlock: to,
    }).catch(() => [])
    for (const log of logs) {
      const token = log.args.token as Address | undefined
      if (!token) continue
      const key = token.toLowerCase()
      const prev = found.get(key)
      if (!prev || log.blockNumber < prev.blockNumber) {
        found.set(key, { token: key as Address, blockNumber: log.blockNumber })
      }
    }
  })
  return [...found.values()]
}

async function readWikiBlob(token: Address): Promise<string> {
  const [site, desc, info] = await Promise.all([
    publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'website' }).catch(() => ''),
    publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'description' }).catch(() => ''),
    publicClient.readContract({ address: token, abi: TOKEN_INFO_ABI, functionName: 'getTokenInfo' }).catch(() => null),
  ])
  const extra = info ? `${info[2] || ''}\n${info[3]?.website || ''}` : ''
  return `${site || ''}\n${desc || ''}\n${extra}`
}

export async function filterWikiHits(hits: LaunchHit[]): Promise<LaunchHit[]> {
  const kept: LaunchHit[] = []
  for (let i = 0; i < hits.length; i += PROBE_BATCH) {
    const slice = hits.slice(i, i + PROBE_BATCH)
    const [sites, descs, infos] = await Promise.all([
      publicClient.multicall({
        allowFailure: true,
        contracts: slice.map((h) => ({ address: h.token, abi: ERC20_ABI, functionName: 'website' as const })),
      }).catch(() => null),
      publicClient.multicall({
        allowFailure: true,
        contracts: slice.map((h) => ({ address: h.token, abi: ERC20_ABI, functionName: 'description' as const })),
      }).catch(() => null),
      publicClient.multicall({
        allowFailure: true,
        contracts: slice.map((h) => ({ address: h.token, abi: TOKEN_INFO_ABI, functionName: 'getTokenInfo' as const })),
      }).catch(() => null),
    ])
    if (!sites || !descs) {
      await mapPool(slice, 8, async (hit) => {
        const blob = await readWikiBlob(hit.token)
        if (parseWikiBinding(blob, '', '')) kept.push(hit)
      })
      continue
    }
    slice.forEach((hit, idx) => {
      const site = sites[idx]?.status === 'success' ? String(sites[idx].result || '') : ''
      const desc = descs[idx]?.status === 'success' ? String(descs[idx].result || '') : ''
      const info = infos?.[idx]?.status === 'success' ? infos[idx].result : null
      const extra = info ? `${info[2] || ''}\n${info[3]?.website || ''}` : ''
      if (parseWikiBinding(site, desc, extra)) kept.push(hit)
    })
  }
  return kept
}

export async function launchTimesFromHits(hits: LaunchHit[]): Promise<Map<string, number>> {
  const times = new Map<string, number>()
  const unique = [...new Set(hits.map((h) => h.blockNumber.toString()))]
  const blockMs = new Map<string, number>()
  await Promise.all(unique.map(async (bn) => {
    const block = await publicClient.getBlock({ blockNumber: BigInt(bn) }).catch(() => null)
    if (block) blockMs.set(bn, Number(block.timestamp) * 1000)
  }))
  for (const hit of hits) {
    const ms = blockMs.get(hit.blockNumber.toString())
    if (ms) times.set(hit.token.toLowerCase(), ms)
  }
  return times
}
