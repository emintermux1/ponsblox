import {
  encodeFunctionData,
  formatUnits,
  isAddress,
  parseAbi,
  parseUnits,
  type Address,
  type Hex,
} from 'viem'
import {
  FACTORY, LAUNCH_AND_BUY, LAUNCH_CONFIG_ID, RBLX, RBLX_DECIMALS, ZERO, publicClient,
} from './chain.ts'

export const FACTORY_ABI = parseAbi([
  'struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }',
  'struct TokenParams { string name; string symbol; string logo; string description; Socials socials; address creatorFeeRecipient; uint16 creatorTaxBps; bool buybackEnabled; bytes32 expectedEconomics; bytes32 salt; }',
  'function approvedPairTokens(address pairToken) view returns (bool)',
  'function pairTokenEconomics(address pairToken) view returns (uint256 phantomQuote, uint256 graduationThreshold, uint8 decimals)',
  'function launchFee() view returns (uint256)',
  'function launchEnabled() view returns (bool)',
  'function canLaunch(address account) view returns (bool)',
  'function maxCreatorTaxBps() view returns (uint256)',
  'function previewLaunchEconomics(uint256 launchConfigId, address pairToken) view returns (bytes32)',
  'function launchToken(TokenParams params, uint256 launchConfigId, address pairToken) payable returns (address token, address curve)',
  'function getLaunchedToken(address token) view returns ((address token, address curve, address deployer, address creatorFeeRecipient, address pairToken, uint256 graduationThreshold, uint24 poolFee, int24 tickSpacing, uint16 creatorTaxBps, bool buybackEnabled, uint8 phase, uint256 sweptQuote, uint256 sweptTokens, uint256 sweptAt, bool exists))',
  'event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)',
])

export const ROUTER_ABI = parseAbi([
  'struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }',
  'struct TokenParams { string name; string symbol; string logo; string description; Socials socials; address creatorFeeRecipient; uint16 creatorTaxBps; bool buybackEnabled; bytes32 expectedEconomics; bytes32 salt; }',
  'function launchAndBuy(TokenParams params, uint256 launchConfigId, address pairToken, uint256 quoteIn, uint256 minTokensOut, address recipient, address[] snipeTaxExemptions) payable returns (address token, address curve, uint256 tokensOut)',
])

export const CURVE_ABI = parseAbi([
  'function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) payable returns (uint256 tokensOut)',
  'function sell(uint256 tokensIn, uint256 minQuoteOut, address recipient) returns (uint256 quoteOut)',
  'function getReserves() view returns (uint256 quoteReserve, uint256 tokenReserve)',
  'function graduated() view returns (bool)',
  'function sellableTokens() view returns (uint256)',
  'function readyToGraduate() view returns (bool)',
  'function feeBps() view returns (uint256)',
  'function creatorTaxBps() view returns (uint256)',
  'function currentSnipeTaxBps(address recipient) view returns (uint256)',
  'function pairToken() view returns (address)',
])

export const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function logo() view returns (string)',
  'function description() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
])

export const LOGO_MAX_BYTES = 512
const BPS = 10_000n

export type FactoryStatus = {
  approved: boolean
  phantomQuote: string
  graduationThreshold: string
  graduationRblx: string
  decimals: number
  launchFee: string
  launchFeeEth: string
  launchEnabled: boolean
  maxCreatorTaxBps: number
}

export async function readFactoryStatus(): Promise<FactoryStatus> {
  const [approved, economics, fee, enabled, maxTax] = await Promise.all([
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'approvedPairTokens', args: [RBLX] }),
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'pairTokenEconomics', args: [RBLX] }),
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'launchFee' }),
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'launchEnabled' }),
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'maxCreatorTaxBps' }),
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
  }
}

export function assertRblxPair(pair: string) {
  if (pair.toLowerCase() !== RBLX.toLowerCase()) {
    throw new Error('Ponsblox only launches against RBLX')
  }
}

export async function previewEconomics(): Promise<Hex> {
  return publicClient.readContract({
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: 'previewLaunchEconomics',
    args: [LAUNCH_CONFIG_ID, RBLX],
  })
}

export function randomSalt(): Hex {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return (`0x${[...b].map((x) => x.toString(16).padStart(2, '0')).join('')}`) as Hex
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

export type TokenRecord = {
  token: Address
  curve: Address
  deployer: Address
  creatorFeeRecipient: Address
  pairToken: Address
  graduationThreshold: string
  poolFee: number
  tickSpacing: number
  creatorTaxBps: number
  buybackEnabled: boolean
  phase: number
  exists: boolean
  name: string
  symbol: string
  logo: string
  description: string
  graduated: boolean
  readyToGraduate: boolean
  quoteReserve: string
  tokenReserve: string
  sellableTokens: string
  totalSupply: string
  priceRblx: string | null
  capRblx: string | null
}

function amountOut(inAmount: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (inAmount <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n
  return (inAmount * reserveOut) / (reserveIn + inAmount)
}

function amountIn(outAmount: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (outAmount <= 0n || reserveOut <= outAmount) return 0n
  return (outAmount * reserveIn) / (reserveOut - outAmount) + 1n
}

const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b

export async function readToken(address: Address): Promise<TokenRecord | null> {
  if (!isAddress(address)) return null
  const launched = await publicClient.readContract({
    address: FACTORY, abi: FACTORY_ABI, functionName: 'getLaunchedToken', args: [address],
  }).catch(() => null)
  if (!launched?.exists) return null
  if (launched.pairToken.toLowerCase() !== RBLX.toLowerCase()) return null

  const curve = launched.curve
  const [name, symbol, logo, description, totalSupply, graduated, ready, reserves, sellable] = await Promise.all([
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'name' }).catch(() => 'Unknown'),
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => '???'),
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'logo' }).catch(() => ''),
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'description' }).catch(() => ''),
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'totalSupply' }).catch(() => 0n),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'graduated' }).catch(() => false),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'readyToGraduate' }).catch(() => false),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'getReserves' }).catch(() => null),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'sellableTokens' }).catch(() => 0n),
  ])

  const quoteReserve = reserves ? reserves[0] : 0n
  const tokenReserve = reserves ? reserves[1] : 0n
  let priceRblx: string | null = null
  let capRblx: string | null = null
  if (!graduated && tokenReserve > 0n && quoteReserve > 0n && totalSupply > 0n) {
    const cap = (quoteReserve * totalSupply) / tokenReserve
    capRblx = formatUnits(cap, RBLX_DECIMALS)
    priceRblx = formatUnits((quoteReserve * 10n ** 18n) / tokenReserve, RBLX_DECIMALS)
  }

  return {
    token: launched.token,
    curve,
    deployer: launched.deployer,
    creatorFeeRecipient: launched.creatorFeeRecipient,
    pairToken: launched.pairToken,
    graduationThreshold: launched.graduationThreshold.toString(),
    poolFee: Number(launched.poolFee),
    tickSpacing: Number(launched.tickSpacing),
    creatorTaxBps: Number(launched.creatorTaxBps),
    buybackEnabled: launched.buybackEnabled,
    phase: Number(launched.phase),
    exists: true,
    name: name as string,
    symbol: symbol as string,
    logo: logo as string,
    description: description as string,
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

export type QuoteResult = {
  side: 'buy' | 'sell'
  tokensOut: string
  quoteOut: string
  spent: string
  refund: string
  tokensOutHuman: string
  quoteHuman: string
}

export async function quoteTrade(
  token: Address, side: 'buy' | 'sell', amount: bigint, recipient: Address,
): Promise<QuoteResult> {
  const rec = await readToken(token)
  if (!rec) throw new Error('Not an RBLX-pair Pons launch')
  if (rec.graduated || rec.readyToGraduate && side === 'sell') {
    throw new Error(rec.graduated
      ? 'This launch has graduated. Trade it on the Uniswap v4 pool, not the curve.'
      : 'Sells are closed. The curve is holding pool reserves.')
  }

  const curve = rec.curve
  const [reserves, sellable, feeBps, creatorTaxBps, rawSnipe] = await Promise.all([
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'getReserves' }),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'sellableTokens' }),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'feeBps' }),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'creatorTaxBps' }),
    publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: 'currentSnipeTaxBps', args: [recipient] }),
  ])
  const [quoteReserve, tokenReserve] = reserves

  if (side === 'buy') {
    let snipeBps = rawSnipe
    if (snipeBps > 0n) {
      const maxSnipe = BPS - feeBps - creatorTaxBps - 100n
      if (snipeBps > maxSnipe) snipeBps = maxSnipe
    }
    let spent = amount
    const fee = (spent * feeBps) / BPS
    const tax = (spent * creatorTaxBps) / BPS
    const snipeTax = (spent * snipeBps) / BPS
    let tokensOut = amountOut(spent - fee - tax - snipeTax, quoteReserve, tokenReserve)
    if (tokensOut > sellable) {
      tokensOut = sellable
      const net = amountIn(sellable, quoteReserve, tokenReserve)
      const denom = BPS - feeBps - creatorTaxBps - snipeBps
      const grossed = denom > 0n ? ceilDiv(net * BPS, denom) : amount
      spent = grossed < amount ? grossed : amount
    }
    return {
      side, tokensOut: tokensOut.toString(), quoteOut: '0', spent: spent.toString(),
      refund: (amount - spent).toString(),
      tokensOutHuman: formatUnits(tokensOut, 18),
      quoteHuman: formatUnits(spent, RBLX_DECIMALS),
    }
  }

  const gross = amountOut(amount, tokenReserve, quoteReserve)
  const fee = (gross * feeBps) / BPS
  const tax = (gross * creatorTaxBps) / BPS
  const quoteOut = gross - fee - tax
  return {
    side, tokensOut: '0', quoteOut: quoteOut.toString(), spent: amount.toString(), refund: '0',
    tokensOutHuman: formatUnits(amount, 18),
    quoteHuman: formatUnits(quoteOut, RBLX_DECIMALS),
  }
}

export type LaunchDraft = {
  name: string
  symbol: string
  logo: string
  description: string
  twitter: string
  telegram: string
  website: string
  creatorTaxBps: number
  buybackEnabled: boolean
  quoteIn: string
  recipient: Address
}

export function validateLaunchDraft(d: LaunchDraft, maxTax: number): string | null {
  if (!d.name.trim()) return 'Name is required'
  if (!/^[A-Za-z0-9]{2,11}$/.test(d.symbol.trim())) return 'Symbol must be 2–11 letters or digits'
  const logoErr = checkLogo(d.logo)
  if (logoErr) return logoErr
  if (d.creatorTaxBps < 0 || d.creatorTaxBps > maxTax) return `Creator tax must be 0–${maxTax / 100}%`
  if (!isAddress(d.recipient)) return 'Recipient is not a valid address'
  if (d.quoteIn) {
    try {
      if (parseUnits(d.quoteIn, RBLX_DECIMALS) < 0n) return 'First buy must be a positive RBLX amount'
    } catch {
      return 'First buy must be a RBLX amount, or empty'
    }
  }
  return null
}

export async function buildLaunchCall(d: LaunchDraft) {
  const status = await readFactoryStatus()
  if (!status.approved) throw new Error('Pons is not accepting RBLX pairs right now')
  if (!status.launchEnabled) throw new Error('Pons is not accepting launches right now')
  const err = validateLaunchDraft(d, status.maxCreatorTaxBps)
  if (err) throw new Error(err)

  const expectedEconomics = await previewEconomics()
  const salt = randomSalt()
  const quoteIn = d.quoteIn.trim() ? parseUnits(d.quoteIn.trim(), RBLX_DECIMALS) : 0n
  const params = {
    name: d.name.trim(),
    symbol: d.symbol.trim().toUpperCase(),
    logo: d.logo.trim(),
    description: d.description.trim(),
    socials: {
      twitter: d.twitter.trim(),
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
    const data = encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: 'launchAndBuy',
      args: [params, LAUNCH_CONFIG_ID, RBLX, quoteIn, 0n, d.recipient, []],
    })
    return {
      to: LAUNCH_AND_BUY,
      functionName: 'launchAndBuy' as const,
      value: status.launchFee,
      data,
      approveToken: RBLX,
      approveSpender: LAUNCH_AND_BUY,
      approveAmount: quoteIn.toString(),
      params,
      quoteIn: quoteIn.toString(),
      launchFee: status.launchFee,
    }
  }

  const data = encodeFunctionData({
    abi: FACTORY_ABI,
    functionName: 'launchToken',
    args: [params, LAUNCH_CONFIG_ID, RBLX],
  })
  return {
    to: FACTORY,
    functionName: 'launchToken' as const,
    value: status.launchFee,
    data,
    approveToken: null as Address | null,
    approveSpender: null as Address | null,
    approveAmount: '0',
    params,
    quoteIn: '0',
    launchFee: status.launchFee,
  }
}

export async function buildTradeCall(token: Address, side: 'buy' | 'sell', amount: bigint, recipient: Address) {
  const rec = await readToken(token)
  if (!rec) throw new Error('Not an RBLX-pair Pons launch')
  const q = await quoteTrade(token, side, amount, recipient)
  const minOut = side === 'buy'
    ? (BigInt(q.tokensOut) * 98n) / 100n
    : (BigInt(q.quoteOut) * 98n) / 100n

  if (side === 'buy') {
    const data = encodeFunctionData({
      abi: CURVE_ABI,
      functionName: 'buy',
      args: [amount, minOut, recipient],
    })
    return {
      to: rec.curve,
      functionName: 'buy' as const,
      value: '0',
      data,
      approveToken: RBLX,
      approveSpender: rec.curve,
      approveAmount: amount.toString(),
      minOut: minOut.toString(),
      quote: q,
    }
  }

  const data = encodeFunctionData({
    abi: CURVE_ABI,
    functionName: 'sell',
    args: [amount, minOut, recipient],
  })
  return {
    to: rec.curve,
    functionName: 'sell' as const,
    value: '0',
    data,
    approveToken: token,
    approveSpender: rec.curve,
    approveAmount: amount.toString(),
    minOut: minOut.toString(),
    quote: q,
  }
}

export const APPROVE_ABI = ERC20_ABI
export { ZERO, parseUnits, formatUnits, isAddress }
