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
import { robinhood } from '../chain'
import {
  ERC20_ABI,
  ETH_PAIR,
  FACTORY_ABI,
  LAUNCH_CONFIG_ID,
  LOGO_MAX_BYTES,
  PONS_FACTORY,
  PONS_LAUNCH_AND_BUY,
  ROUTER_ABI,
  TOKEN_LAUNCHED,
} from '../contracts'
import { failMessage, isTicker } from '../format'
import { buildLongerMetadata } from '../metadata'
import { publicTokenImage, X_URL } from '../official'
import { encodePairDescription, encodePairWebsite, pairTokenAddress } from '../pairMeta'
import { publicClient } from './client'
import type { FactoryStatus, LaunchCall, LaunchDraft, LaunchReceipt } from './types'

function isNativePair(addr: string) {
  return addr.toLowerCase() === ETH_PAIR.toLowerCase()
}

export async function readPairApproved(pair: Address): Promise<boolean> {
  return publicClient.readContract({
    address: PONS_FACTORY,
    abi: FACTORY_ABI,
    functionName: 'approvedPairTokens',
    args: [pair],
  })
}

export async function readFactoryStatus(pair: Address): Promise<FactoryStatus> {
  const [approved, fee, enabled, maxTax] = await Promise.all([
    isNativePair(pair) ? Promise.resolve(true) : readPairApproved(pair).catch(() => false),
    publicClient.readContract({ address: PONS_FACTORY, abi: FACTORY_ABI, functionName: 'launchFee' }),
    publicClient.readContract({ address: PONS_FACTORY, abi: FACTORY_ABI, functionName: 'launchEnabled' }),
    publicClient.readContract({ address: PONS_FACTORY, abi: FACTORY_ABI, functionName: 'maxCreatorTaxBps' }),
  ])
  return {
    approved,
    launchEnabled: enabled,
    launchFee: fee.toString(),
    launchFeeEth: formatUnits(fee, 18),
    maxCreatorTaxBps: Number(maxTax),
  }
}

export async function resolveSettlement(preferred: Address | ''): Promise<Address> {
  if (preferred && !isNativePair(preferred)) {
    const ok = await readPairApproved(preferred).catch(() => false)
    if (ok) return preferred
    try {
      await publicClient.readContract({
        address: PONS_FACTORY,
        abi: FACTORY_ABI,
        functionName: 'previewLaunchEconomics',
        args: [LAUNCH_CONFIG_ID, preferred],
      })
      return preferred
    } catch {
      /* factory only prices ETH — still write NVDA in metadata */
    }
  }
  return ETH_PAIR
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

export function validateDraft(d: LaunchDraft): string | null {
  if (!d.name.trim()) return 'Name is required'
  if (!isTicker(d.symbol)) return 'Ticker must be 2–11 letters or digits'
  if (d.logo.trim()) {
    const logoErr = checkLogo(d.logo)
    if (logoErr) return logoErr
  }
  if (d.recipient && !isAddress(d.recipient)) return 'Creator wallet is not a valid address'
  if (d.quoteIn.trim()) {
    try {
      if (parseUnits(d.quoteIn.trim(), 18) < 0n) return 'Developer buy must be a positive amount'
    } catch {
      return 'Developer buy must be an amount, or empty'
    }
  }
  return null
}

function randomSalt(): Hex {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return (`0x${[...b].map((x) => x.toString(16).padStart(2, '0')).join('')}`) as Hex
}

async function encodeLaunch(d: LaunchDraft, pair: Address, recipient: Address): Promise<LaunchCall> {
  const native = isNativePair(pair)
  const status = await readFactoryStatus(pair)
  if (!status.launchEnabled) throw new Error('Pons is not accepting launches right now.')
  const err = validateDraft({ ...d, recipient })
  if (err) throw new Error(err)

  const expectedEconomics = await publicClient.readContract({
    address: PONS_FACTORY,
    abi: FACTORY_ABI,
    functionName: 'previewLaunchEconomics',
    args: [LAUNCH_CONFIG_ID, pair],
  })
  const longerPair = pairTokenAddress(d.pairId)
  const meta = buildLongerMetadata({
    name: d.name,
    symbol: d.symbol,
    description: encodePairDescription(d.description, d.pairId),
    image: publicTokenImage(d.logo),
    website: encodePairWebsite(d.website, d.pairId, longerPair),
    pairId: d.pairId,
    pairToken: longerPair,
  })
  const salt = randomSalt()
  const quoteIn = d.quoteIn.trim() ? parseUnits(d.quoteIn.trim(), 18) : 0n
  const params = {
    name: meta.name,
    symbol: meta.symbol,
    logo: meta.image,
    description: meta.description,
    socials: {
      twitter: d.twitter.trim() || X_URL,
      telegram: d.telegram.trim(),
      discord: '',
      website: meta.external_url,
      farcaster: '',
    },
    creatorFeeRecipient: recipient,
    creatorTaxBps: 0,
    buybackEnabled: false,
    expectedEconomics,
    salt,
  }

  if (quoteIn > 0n) {
    return {
      to: PONS_LAUNCH_AND_BUY,
      functionName: 'launchAndBuy',
      value: native ? BigInt(status.launchFee) + quoteIn : BigInt(status.launchFee),
      data: encodeFunctionData({
        abi: ROUTER_ABI,
        functionName: 'launchAndBuy',
        args: [params, LAUNCH_CONFIG_ID, pair, quoteIn, 0n, recipient, []],
      }),
      approveToken: native ? null : pair,
      approveSpender: native ? null : PONS_LAUNCH_AND_BUY,
      approveAmount: native ? '0' : quoteIn.toString(),
      quoteIn: quoteIn.toString(),
      launchFee: BigInt(status.launchFee),
      pairToken: pair,
    }
  }

  return {
    to: PONS_FACTORY,
    functionName: 'launchToken',
    value: BigInt(status.launchFee),
    data: encodeFunctionData({
      abi: FACTORY_ABI,
      functionName: 'launchToken',
      args: [params, LAUNCH_CONFIG_ID, pair],
    }),
    approveToken: null,
    approveSpender: null,
    approveAmount: '0',
    quoteIn: '0',
    launchFee: BigInt(status.launchFee),
    pairToken: pair,
  }
}

export async function buildLaunchCall(d: LaunchDraft, preferredPair: Address | '', recipient: Address): Promise<LaunchCall> {
  const first = await resolveSettlement(preferredPair)
  try {
    return await encodeLaunch(d, first, recipient)
  } catch (e) {
    if (!isNativePair(first)) {
      return encodeLaunch(d, ETH_PAIR, recipient)
    }
    throw e
  }
}

export function tokenFromLaunchReceipt(logs: Log[]): { token: Address; curve: Address } | null {
  const parsed = parseEventLogs({ abi: FACTORY_ABI, logs, eventName: 'TokenLaunched' })
  const ev = parsed[0]
  if (!ev?.args.token || !ev.args.curve) return null
  return { token: ev.args.token as Address, curve: ev.args.curve as Address }
}

export async function sendLaunch(
  wallet: WalletClient,
  account: Address,
  call: LaunchCall,
): Promise<LaunchReceipt> {
  if (call.approveToken && call.approveSpender && BigInt(call.approveAmount) > 0n) {
    await wallet.writeContract({
      account,
      chain: robinhood,
      address: call.approveToken,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [call.approveSpender, BigInt(call.approveAmount)],
    })
  }

  await publicClient.call({
    account,
    to: call.to,
    data: call.data,
    value: call.value,
  }).catch((e: Error) => {
    throw new Error(failMessage(e.message || 'Simulation failed. The launch would revert.'))
  })

  let hash: Hash
  try {
    hash = await wallet.sendTransaction({
      account,
      chain: robinhood,
      to: call.to,
      data: call.data,
      value: call.value,
    })
  } catch (e) {
    throw new Error(failMessage((e as Error).message))
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 }).catch((e: Error) => {
    throw new Error(failMessage(e.message))
  })
  if (receipt.status === 'reverted') throw new Error('Launch reverted on chain. No token was created.')

  const extracted = tokenFromLaunchReceipt(receipt.logs)
  if (!extracted) {
    throw new Error('Receipt confirmed but TokenLaunched was not in the logs. Not marking live.')
  }
  return { hash, token: extracted.token, curve: extracted.curve }
}

const SCAN_CHUNK = 2000n
const SCAN_WINDOWS = 4

export async function scanPairLaunches(pairs: Address[]): Promise<Address[]> {
  const latest = await publicClient.getBlockNumber()
  const wanted = new Set(pairs.map((p) => p.toLowerCase()))
  const found: Address[] = []
  for (let i = 0; i < SCAN_WINDOWS; i++) {
    const to = latest - SCAN_CHUNK * BigInt(i)
    if (to <= 0n) break
    const from = to > SCAN_CHUNK ? to - SCAN_CHUNK + 1n : 0n
    const logs = await publicClient.getLogs({
      address: PONS_FACTORY,
      event: TOKEN_LAUNCHED,
      fromBlock: from,
      toBlock: to,
    }).catch(() => [])
    for (const log of logs) {
      const token = log.args.token as Address | undefined
      if (!token) continue
      const pair = (log.args.pairToken as Address | undefined)?.toLowerCase()
      if (pair && wanted.has(pair)) found.push(token)
      else if (!pair || pair === ETH_PAIR.toLowerCase()) found.push(token)
    }
  }
  return [...new Set(found.map((a) => a.toLowerCase() as Address))].slice(0, 40)
}
