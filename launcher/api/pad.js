import { createPublicClient, http, keccak256, parseAbi, stringToBytes } from 'viem'

const REGISTRY_ABI = parseAbi([
  'function pads(bytes32) view returns (address owner, uint64 chainId, uint16 ownerFeeBps, uint16 creatorFeeBps, uint128 launchFeeWei, uint8 curveId, string slug, string name, string brandURI, bool exists)',
  'function tokensOf(bytes32 slugHash) view returns (address[])',
])

const RH_REGISTRY = '0xc801579C373832BAB4F2cB9c90d3582E3927938E'
const ARC_REGISTRY = '0x5d5AA1024f8fAff21A837BfC1c69f571e52367Df'
const RH_RPC = process.env.VITE_ROBINHOOD_RPC || 'https://rpc.mainnet.chain.robinhood.com'
const ARC_RPC = process.env.VITE_ARC_RPC || 'https://rpc.testnet.arc.io'
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const cache = new Map()
const CACHE_MS = 30_000

function asPad(row, tokens) {
  if (!row || !row[9]) return null
  return {
    owner: row[0],
    chainId: Number(row[1]),
    ownerFeeBps: Number(row[2]),
    creatorFeeBps: Number(row[3]),
    launchFeeWei: row[4].toString(),
    curveId: Number(row[5]),
    slug: row[6],
    name: row[7],
    brandURI: row[8],
    exists: true,
    tokens,
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function readOne(rpc, registry, hash) {
  const client = createPublicClient({ transport: http(rpc, { timeout: 12_000, retryCount: 2, retryDelay: 800 }) })
  let last
  for (let i = 0; i < 3; i++) {
    try {
      const row = await client.readContract({
        address: registry,
        abi: REGISTRY_ABI,
        functionName: 'pads',
        args: [hash],
      })
      if (!row[9]) return null
      const tokens = await client.readContract({
        address: registry,
        abi: REGISTRY_ABI,
        functionName: 'tokensOf',
        args: [hash],
      }).catch(() => [])
      return asPad(row, tokens)
    } catch (e) {
      last = e
      await sleep(400 * (i + 1))
    }
  }
  throw last || new Error('Pad lookup failed')
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const url = new URL(req.url || '/', 'http://local')
  const slug = String(url.searchParams.get('slug') || '').trim().toLowerCase()
  if (slug.length < 3 || slug.length > 32 || !SLUG.test(slug)) {
    res.status(400).json({ error: 'Bad slug.' })
    return
  }
  const hit = cache.get(slug)
  if (hit && Date.now() - hit.at < CACHE_MS) {
    res.setHeader?.('cache-control', 'public, max-age=15, s-maxage=30')
    res.status(200).json(hit.body)
    return
  }
  const hash = keccak256(stringToBytes(slug))
  const [rh, arc] = await Promise.allSettled([
    readOne(RH_RPC, RH_REGISTRY, hash),
    readOne(ARC_RPC, ARC_REGISTRY, hash),
  ])
  const rhFailed = rh.status === 'rejected'
  const arcFailed = arc.status === 'rejected'
  if (rhFailed && arcFailed) {
    res.status(502).json({ error: 'Chain RPC is busy. Try again.' })
    return
  }
  const body = {
    slug,
    robinhood: rh.status === 'fulfilled' ? rh.value : null,
    arc: arc.status === 'fulfilled' ? arc.value : null,
    rhError: rhFailed,
    arcError: arcFailed,
  }
  if (body.robinhood || body.arc) cache.set(slug, { at: Date.now(), body })
  res.setHeader?.('cache-control', 'public, max-age=15, s-maxage=30')
  res.status(200).json(body)
}
