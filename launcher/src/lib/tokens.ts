import { createPublicClient, http, parseAbi, type Address } from 'viem'
import { ARC_BONDING_PAD, arcTestnet, isAddressSet, type SupportedChain } from './chain.ts'
import { BONDING_ABI } from './launcherAbi.ts'
import { publicClient as rhClient } from './pons/client.ts'

const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
])

export type PadToken = {
  address: Address
  name: string
  symbol: string
}

function arcClient() {
  return createPublicClient({
    chain: arcTestnet,
    transport: http(arcTestnet.rpcUrls.default.http[0], { timeout: 12_000 }),
  })
}

function shortAddr(addr: Address): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

async function readRhToken(address: Address): Promise<PadToken> {
  const [name, symbol] = await Promise.all([
    rhClient.readContract({ address, abi: ERC20_ABI, functionName: 'name' }).catch(() => ''),
    rhClient.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => ''),
  ])
  return {
    address,
    name: name || shortAddr(address),
    symbol: symbol || 'TOKEN',
  }
}

async function readArcToken(address: Address): Promise<PadToken> {
  if (!isAddressSet(ARC_BONDING_PAD)) {
    return { address, name: shortAddr(address), symbol: 'TOKEN' }
  }
  const client = arcClient()
  const [name, symbol] = await Promise.all([
    client.readContract({
      address: ARC_BONDING_PAD,
      abi: BONDING_ABI,
      functionName: 'tokenName',
      args: [address],
    }).catch(() => ''),
    client.readContract({
      address: ARC_BONDING_PAD,
      abi: BONDING_ABI,
      functionName: 'tokenSymbol',
      args: [address],
    }).catch(() => ''),
  ])
  return {
    address,
    name: name || shortAddr(address),
    symbol: symbol || 'TOKEN',
  }
}

export async function readPadTokens(
  chain: SupportedChain,
  addresses: readonly Address[],
): Promise<PadToken[]> {
  switch (chain) {
    case 'robinhood':
      return Promise.all(addresses.map(readRhToken))
    case 'arc':
      return Promise.all(addresses.map(readArcToken))
    default: {
      const _n: never = chain
      return _n
    }
  }
}

export async function readArcBalance(token: Address, account: Address): Promise<bigint> {
  if (!isAddressSet(ARC_BONDING_PAD)) return 0n
  return arcClient().readContract({
    address: ARC_BONDING_PAD,
    abi: BONDING_ABI,
    functionName: 'balanceOf',
    args: [token, account],
  }).catch(() => 0n)
}
