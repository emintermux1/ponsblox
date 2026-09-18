import { createPublicClient, formatUnits, http, parseAbi } from 'viem'

const FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e'
const PAIR = '0x0000000000000000000000000000000000000000'
const ABI = parseAbi([
  'function approvedPairTokens(address pairToken) view returns (bool)',
  'function launchFee() view returns (uint256)',
  'function launchEnabled() view returns (bool)',
  'function getLaunchConfig(uint256 id) view returns ((uint256 supply, uint256 curveFeeBps, uint256 phantomQuote, uint256 graduationThreshold, uint24 poolFee, int24 tickSpacing, bool enabled))',
])

const client = createPublicClient({
  transport: http('https://rpc.mainnet.chain.robinhood.com'),
})

const [approved, fee, enabled, config] = await Promise.all([
  client.readContract({ address: FACTORY, abi: ABI, functionName: 'approvedPairTokens', args: [PAIR] }),
  client.readContract({ address: FACTORY, abi: ABI, functionName: 'launchFee' }),
  client.readContract({ address: FACTORY, abi: ABI, functionName: 'launchEnabled' }),
  client.readContract({ address: FACTORY, abi: ABI, functionName: 'getLaunchConfig', args: [0n] }),
])

console.log({
  factory: FACTORY,
  pairToken: PAIR,
  approved,
  launchEnabled: enabled,
  launchFeeEth: formatUnits(fee, 18),
  configEnabled: config.enabled,
})
