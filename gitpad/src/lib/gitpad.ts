import { isAddress, keccak256, parseAbi, stringToBytes, type Address, type Hash, type WalletClient } from 'viem'
import { PAIR_TOKEN, publicClient, rhc } from './chain.ts'
import { isNativePair } from './format.ts'

export const GITPAD_FACTORY = (import.meta.env.VITE_GITPAD_FACTORY || '').trim() as Address | ''
export const GITPAD_REGISTRY = (import.meta.env.VITE_GITPAD_REGISTRY || '').trim() as Address | ''
export const GITPAD_METADATA = (import.meta.env.VITE_GITPAD_METADATA || '').trim() as Address | ''
export const GITPAD_FEE_ROUTER = (import.meta.env.VITE_GITPAD_FEE_ROUTER || '').trim() as Address | ''
export const GITPAD_ADAPTER = (import.meta.env.VITE_GITPAD_ADAPTER || '').trim() as Address | ''

export function gitpadContractsLive(): boolean {
  return Boolean(GITPAD_FACTORY && GITPAD_REGISTRY)
}

export function feeRouterLive(): boolean {
  return Boolean(GITPAD_FEE_ROUTER)
}

export const FACTORY_APP_ABI = parseAbi([
  'function linkRepository(address token, string ownerName, string repoName, string metadataURI, uint64 githubId)',
  'event Linked(address indexed token, address indexed deployer, string ownerName, string repoName, string metadataURI)',
])

export const REGISTRY_ABI = parseAbi([
  'function idOf(string ownerName, string repoName) view returns (bytes32)',
  'function byRepo(bytes32) view returns (bytes32 repoId, string owner, string name, address token, address deployer, string metadataURI, uint64 registeredAt, uint64 githubId, bool exists)',
  'function repoOfToken(address) view returns (bytes32)',
])

export const FEE_ABI = parseAbi([
  'function setRoute(address token, (address to, uint16 bps, bytes32 role)[] recips)',
  'function routeOf(address token) view returns ((address to, uint16 bps, bytes32 role)[])',
  'function sweep(address token, address asset)',
  'function distributed(address token) view returns (uint256)',
  'event RouteSet(address indexed token, uint256 recipients)',
  'event Distributed(address indexed token, address indexed asset, address indexed to, uint256 amount, bytes32 role)',
])

export type FeeRole = 'CREATOR' | 'HOLDERS' | 'TREASURY' | 'GITPAD' | 'OTHER'

export function roleHash(role: FeeRole): `0x${string}` {
  switch (role) {
    case 'CREATOR':
    case 'HOLDERS':
    case 'TREASURY':
    case 'GITPAD':
    case 'OTHER':
      return keccak256(stringToBytes(role))
    default: {
      const _e: never = role
      return _e
    }
  }
}

export function roleLabel(hash: string): FeeRole | 'UNKNOWN' {
  const roles: FeeRole[] = ['CREATOR', 'HOLDERS', 'TREASURY', 'GITPAD', 'OTHER']
  for (const r of roles) {
    if (roleHash(r).toLowerCase() === hash.toLowerCase()) return r
  }
  return 'UNKNOWN'
}

export type RegistryRow = {
  repoId: `0x${string}`
  owner: string
  name: string
  token: Address
  deployer: Address
  metadataURI: string
  registeredAt: number
  exists: boolean
}

export async function readRegistry(owner: string, name: string): Promise<RegistryRow | null> {
  if (!GITPAD_REGISTRY) return null
  const repoId = await publicClient.readContract({
    address: GITPAD_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: 'idOf',
    args: [owner, name],
  })
  const row = await publicClient.readContract({
    address: GITPAD_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: 'byRepo',
    args: [repoId],
  })
  const [id, ownerName, repoName, token, deployer, metadataURI, registeredAt, , exists] = row
  if (!exists) return null
  return {
    repoId: id,
    owner: ownerName,
    name: repoName,
    token,
    deployer,
    metadataURI,
    registeredAt: Number(registeredAt),
    exists,
  }
}

export async function linkOnchain(
  wallet: WalletClient,
  account: Address,
  token: Address,
  owner: string,
  name: string,
  metadataURI: string,
  githubId = 0,
): Promise<Hash> {
  if (!GITPAD_FACTORY) throw new Error('GitPad factory is not deployed. Set VITE_GITPAD_FACTORY.')
  return wallet.writeContract({
    account,
    chain: rhc,
    address: GITPAD_FACTORY,
    abi: FACTORY_APP_ABI,
    functionName: 'linkRepository',
    args: [token, owner, name, metadataURI, BigInt(githubId)],
  })
}

export type FeeSplit = { to: Address; bps: number; role: FeeRole }

export function validateSplits(rows: FeeSplit[]): string | null {
  if (!rows.length) return 'Add at least one destination'
  const sum = rows.reduce((n, r) => n + r.bps, 0)
  if (sum !== 10_000) return `Allocations must equal 100% (now ${sum / 100}%)`
  const seen = new Set<string>()
  for (const r of rows) {
    if (!r.to || !isAddress(r.to) || r.to === '0x0000000000000000000000000000000000000000') {
      return 'Every destination needs a non-zero address'
    }
    if (r.bps <= 0) return 'Every destination needs a positive share'
    const key = r.to.toLowerCase()
    if (seen.has(key)) return 'Duplicate recipient addresses are not allowed'
    seen.add(key)
  }
  return null
}

export async function setFeeRoute(
  wallet: WalletClient,
  account: Address,
  token: Address,
  splits: FeeSplit[],
): Promise<Hash> {
  if (!GITPAD_FEE_ROUTER) throw new Error('Fee router is not deployed. Set VITE_GITPAD_FEE_ROUTER.')
  const err = validateSplits(splits)
  if (err) throw new Error(err)
  return wallet.writeContract({
    account,
    chain: rhc,
    address: GITPAD_FEE_ROUTER,
    abi: FEE_ABI,
    functionName: 'setRoute',
    args: [token, splits.map((s) => ({ to: s.to, bps: s.bps, role: roleHash(s.role) }))],
  })
}

export async function readFeeRoute(token: Address): Promise<FeeSplit[]> {
  if (!GITPAD_FEE_ROUTER) return []
  const rows = await publicClient.readContract({
    address: GITPAD_FEE_ROUTER,
    abi: FEE_ABI,
    functionName: 'routeOf',
    args: [token],
  })
  return rows.map((r) => ({
    to: r.to,
    bps: Number(r.bps),
    role: (roleLabel(r.role) === 'UNKNOWN' ? 'OTHER' : roleLabel(r.role)) as FeeRole,
  }))
}

export async function readDistributed(token: Address): Promise<bigint> {
  if (!GITPAD_FEE_ROUTER) return 0n
  return publicClient.readContract({
    address: GITPAD_FEE_ROUTER,
    abi: FEE_ABI,
    functionName: 'distributed',
    args: [token],
  })
}

export async function readRouterRblx(): Promise<bigint> {
  if (!GITPAD_FEE_ROUTER) return 0n
  if (isNativePair(PAIR_TOKEN)) return publicClient.getBalance({ address: GITPAD_FEE_ROUTER })
  return publicClient.readContract({
    address: PAIR_TOKEN,
    abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
    functionName: 'balanceOf',
    args: [GITPAD_FEE_ROUTER],
  })
}

export type DistEvent = {
  token: Address
  asset: Address
  to: Address
  amount: string
  role: string
  tx: Hash
}

export async function readFeeHistory(token: Address): Promise<DistEvent[]> {
  if (!GITPAD_FEE_ROUTER) return []
  const latest = await publicClient.getBlockNumber()
  const from = latest > 8000n ? latest - 8000n : 0n
  const logs = await publicClient.getLogs({
    address: GITPAD_FEE_ROUTER,
    event: parseAbi(['event Distributed(address indexed token, address indexed asset, address indexed to, uint256 amount, bytes32 role)'])[0],
    args: { token },
    fromBlock: from,
    toBlock: latest,
  }).catch(() => [])
  return logs.map((l) => ({
    token: l.args.token as Address,
    asset: l.args.asset as Address,
    to: l.args.to as Address,
    amount: (l.args.amount ?? 0n).toString(),
    role: roleLabel(String(l.args.role || '')),
    tx: l.transactionHash,
  }))
}
