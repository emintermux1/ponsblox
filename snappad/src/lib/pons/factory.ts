import {
  encodeFunctionData,
  formatUnits,
  parseEventLogs,
  parseUnits,
  type Address,
  type Hash,
  type Hex,
  type Log,
  type WalletClient,
} from 'viem'
import { APPROVE_ABI, CURVE_ABI, ERC20_ABI, FACTORY_ABI, ROUTER_ABI } from './abi.ts'
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
import { bySnapPadName } from '../brand.ts'
import { snapchatWebsite, X_AT } from '../social.ts'
import type { FactoryStatus, LaunchCall, LaunchDraft, LaunchReceipt } from './types.ts'

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

export function checkLogo(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Logo URL is required for the Pons factory.'
  const bytes = new TextEncoder().encode(v).length
  if (bytes > LOGO_MAX_BYTES) {
    return v.startsWith('data:')
      ? `A pasted image is ${bytes} bytes and Pons allows ${LOGO_MAX_BYTES}. Host it and paste the link.`
      : `${bytes} bytes, over Pons' ${LOGO_MAX_BYTES} byte logo limit.`
  }
  if (!/^(https:\/\/|ipfs:\/\/)/i.test(v)) return 'Use a link starting with https:// or ipfs://'
  return null
}

export function validateLaunchDraft(d: LaunchDraft, maxTax: number): string | null {
  if (!d.name.trim()) return 'Name is required'
  if (!/^[A-Za-z0-9]{2,11}$/.test(d.symbol.trim())) return 'Ticker must be 2–11 letters or digits'
  const logoErr = checkLogo(d.logo)
  if (logoErr) return logoErr
  if (!snapchatWebsite(d.website).trim()) return 'A Snapchat source URL is required'
  if (d.creatorTaxBps < 0 || d.creatorTaxBps > maxTax) return `Creator tax must be 0–${maxTax / 100}%`
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
    name: bySnapPadName(d.name),
    symbol: d.symbol.trim().toUpperCase(),
    logo: d.logo.trim(),
    description: d.description.trim(),
    socials: {
      twitter: X_AT,
      telegram: d.telegram.trim(),
      discord: '',
      website: snapchatWebsite(d.website),
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

export async function buyOnCurve(
  wallet: WalletClient,
  account: Address,
  curve: Address,
  quoteEth: string,
): Promise<Hash> {
  const value = parseUnits(quoteEth.trim(), 18)
  if (value <= 0n) throw new Error('Enter an ETH amount greater than zero.')
  const { request } = await publicClient.simulateContract({
    account,
    address: curve,
    abi: CURVE_ABI,
    functionName: 'buy',
    args: [value, 0n, account],
    value,
  })
  return wallet.writeContract(request)
}

export async function sellOnCurve(
  wallet: WalletClient,
  account: Address,
  token: Address,
  curve: Address,
  amount: string,
): Promise<Hash> {
  const tokensIn = parseUnits(amount.trim(), 18)
  if (tokensIn <= 0n) throw new Error('Enter a token amount greater than zero.')
  const allowance = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account, curve],
  })
  if (allowance < tokensIn) {
    await wallet.writeContract({
      account,
      chain: rhc,
      address: token,
      abi: APPROVE_ABI,
      functionName: 'approve',
      args: [curve, tokensIn],
    })
  }
  const { request } = await publicClient.simulateContract({
    account,
    address: curve,
    abi: CURVE_ABI,
    functionName: 'sell',
    args: [tokensIn, 0n, account],
  })
  return wallet.writeContract(request)
}
