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
import type {
  FactoryStatus,
  FeePermission,
  LaunchCall,
  LaunchDraft,
  LaunchReceipt,
  PendingRecipient,
  TokenRecord,
} from './types.ts'
import { GITPAD_X_URL } from '../../config/official.ts'
import { parseGithubRepo } from '../format.ts'

export { LOGO_MAX_BYTES }

function nativePair(addr: string) {
  return addr.toLowerCase() === ZERO.toLowerCase()
}

export async function readFactoryStatus(): Promise<FactoryStatus> {
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
}

export async function readCanLaunch(account: Address): Promise<boolean> {
  return publicClient.readContract({
    address: FACTORY, abi: FACTORY_ABI, functionName: 'canLaunch', args: [account],
  })
}

export async function readPendingRecipient(token: Address): Promise<PendingRecipient | null> {
  const row = await publicClient.readContract({
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: 'pendingCreatorFeeRecipient',
    args: [token],
  }).catch(() => null)
  if (!row) return null
  const [recipient, effectiveAt, expiresAt] = row
  if (!effectiveAt && !expiresAt) return null
  return { recipient, effectiveAt: Number(effectiveAt), expiresAt: Number(expiresAt) }
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

function repoFromText(...parts: string[]): { owner: string; name: string } | null {
  for (const p of parts) {
    const hit = parseGithubRepo(p)
    if (hit) return hit
  }
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
    logo: (logo as string) || info?.[1] || '',
    description: desc || info?.[2] || '',
    website: site || socialSite,
    repo: repoFromText(site, socialSite, desc, logo as string),
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
  if (!d.website.trim()) return 'Repository URL is required'
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
      twitter: GITPAD_X_URL,
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

function classifyWriteError(raw: string): string {
  if (/User rejected|denied|4001/i.test(raw)) return 'You cancelled. Nothing was sent.'
  if (/insufficient funds|exceeds the balance/i.test(raw)) return 'Insufficient ETH for the launch fee and gas.'
  if (/replacement|nonce too low|already known/i.test(raw)) return 'A replacement or dropped transaction was detected. Check the explorer before sending again.'
  if (/timeout|timed out|RPC/i.test(raw)) return 'RPC timed out while waiting for the receipt. The transaction may still confirm — do not resend automatically.'
  return raw || 'The transaction did not go through.'
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
  }).catch((e: Error) => {
    throw new Error(e.message || 'Simulation failed. The launch would revert.')
  })
  await publicClient.estimateGas({
    account,
    to: call.to,
    data: call.data,
    value: call.value,
  }).catch((e: Error) => {
    throw new Error(classifyWriteError(e.message) || 'Gas estimate failed.')
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
    throw new Error(classifyWriteError((e as Error).message))
  }

  onSubmitted?.(hash)
  onStatus(`transaction submitted ${hash}`)
  onStatus('waiting for Pons V2')
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 }).catch((e: Error) => {
    throw new Error(classifyWriteError(e.message))
  })
  if (receipt.status === 'reverted') throw new Error('Launch reverted on chain. No token was created.')

  const extracted = tokenFromLaunchReceipt(receipt.logs)
  if (!extracted) {
    throw new Error('Receipt confirmed but TokenLaunched was not in the logs. Not marking LIVE.')
  }
  onStatus('factory event detected')
  onStatus(`token address ${extracted.token}`)
  return { hash, token: extracted.token, curve: extracted.curve }
}

export async function transferCreatorFeeRecipient(
  wallet: WalletClient,
  account: Address,
  token: Address,
  newRecipient: Address,
): Promise<Hash> {
  if (!isAddress(token) || !isAddress(newRecipient)) throw new Error('Not a valid address')
  await publicClient.simulateContract({
    account,
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: 'transferCreatorFeeRecipient',
    args: [token, newRecipient],
  }).catch((e: Error) => {
    throw new Error(e.message || 'Fee recipient change would revert.')
  })
  return wallet.writeContract({
    account,
    chain: rhc,
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: 'transferCreatorFeeRecipient',
    args: [token, newRecipient],
  })
}

export function feePermissionFor(input: {
  token: TokenRecord
  wallet?: Address
  feeRouter?: Address | ''
}): FeePermission {
  const router = (input.feeRouter || '').toLowerCase()
  const recipient = input.token.creatorFeeRecipient.toLowerCase()
  const wallet = (input.wallet || '').toLowerCase()
  if (router && recipient === router) {
    return {
      kind: 'router_set',
      supported: true,
      permission: 'GitPadFeeRouter.setRoute — current Pons deployer (or router owner)',
    }
  }
  if (wallet && wallet === recipient) {
    return {
      kind: 'transfer_recipient',
      supported: true,
      permission: 'Pons transferCreatorFeeRecipient(token, newRecipient) — current creatorFeeRecipient only',
    }
  }
  if (!recipient || recipient === ZERO.toLowerCase()) {
    return {
      kind: 'unsupported',
      supported: false,
      permission: null,
      reason: 'This launch has no Pons creatorFeeRecipient, so GitPad cannot send a fee write.',
    }
  }
  return {
    kind: 'need_creator',
    supported: false,
    permission: null,
    creator: input.token.creatorFeeRecipient,
    connected: input.wallet || null,
  }
}

export function hasFeeStep(perm: FeePermission | null): boolean {
  if (!perm) return true
  switch (perm.kind) {
    case 'router_set':
    case 'transfer_recipient':
    case 'need_creator':
      return true
    case 'unsupported':
      return false
    default: {
      const _e: never = perm
      return _e
    }
  }
}

export function feeBrief(perm: FeePermission | null): string {
  if (!perm) return 'Connect the creator wallet'
  switch (perm.kind) {
    case 'router_set':
      return 'GitPad will write setRoute on Activate'
    case 'transfer_recipient':
      return 'Creator connected — GitPad will send the fee writes'
    case 'need_creator':
      return 'Connect the creator wallet'
    case 'unsupported':
      return perm.reason
    default: {
      const _e: never = perm
      return _e
    }
  }
}

const SCAN_CHUNK = 2000n
const SCAN_WINDOWS = 8

export async function scanRecentLaunches(): Promise<Address[]> {
  const latest = await publicClient.getBlockNumber()
  const found: Address[] = []
  for (let i = 0; i < SCAN_WINDOWS; i++) {
    const to = latest - SCAN_CHUNK * BigInt(i)
    if (to <= 0n) break
    const from = to > SCAN_CHUNK ? to - SCAN_CHUNK + 1n : 0n
    const logs = await publicClient.getLogs({
      address: FACTORY,
      event: TOKEN_LAUNCHED,
      fromBlock: from,
      toBlock: to,
    }).catch(() => [])
    for (const log of logs) {
      const token = log.args.token as Address | undefined
      if (!token) continue
      found.push(token)
    }
  }
  return [...new Set(found.map((a) => a.toLowerCase() as Address))]
}
