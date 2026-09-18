import { createPublicClient, defineChain, fallback, http, parseAbi } from 'viem'

const RPCS = [
  'https://rpc.mainnet.chain.robinhood.com',
]
const FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e'
const OFFICIAL = '0xc6a8840c4946b8a476415048a2cbbe1bc81bf5bb'
const TOKEN_LAUNCHED = parseAbi([
  'event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)',
])[0]
const ERC20 = parseAbi([
  'function website() view returns (string)',
  'function description() view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
])
const INFO = parseAbi([
  'struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }',
  'function getTokenInfo() view returns (address tokenDeployer, string tokenLogo, string tokenDescription, Socials tokenSocials)',
])

const chain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: RPCS } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
})
const client = createPublicClient({
  chain,
  transport: fallback(RPCS.map((u) => http(u, { timeout: 12_000, retryCount: 1 })), { rank: false }),
  batch: { multicall: { batchSize: 1024, wait: 8 } },
})

const WIKI_RE = /wikipedia\.org\/wiki\/([^?\s#]+)/i
const QID_RE = /\bQ\d+\b/

function wikiish(blob) {
  return WIKI_RE.test(blob) || QID_RE.test(blob) || /WikiPad/i.test(blob)
}

const latest = await client.getBlockNumber()
const CHUNK = 4000n
const WINDOWS = 100
const found = new Map()

async function mapPool(items, limit, fn) {
  let i = 0
  const out = []
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return out
}

const windows = Array.from({ length: WINDOWS }, (_, i) => i)
await mapPool(windows, 8, async (i) => {
  const to = latest - CHUNK * BigInt(i)
  if (to <= 0n) return
  const from = to > CHUNK ? to - CHUNK + 1n : 0n
  const logs = await client.getLogs({
    address: FACTORY,
    event: TOKEN_LAUNCHED,
    fromBlock: from,
    toBlock: to,
  }).catch(() => [])
  for (const log of logs) {
    const token = log.args.token
    if (!token) continue
    const key = token.toLowerCase()
    const prev = found.get(key)
    if (!prev || log.blockNumber < prev.block) found.set(key, { token: key, block: log.blockNumber })
  }
})

const addrs = [...found.keys()]
console.log('scanned', addrs.length, 'from', (latest - CHUNK * BigInt(WINDOWS)).toString(), 'to', latest.toString())

const wiki = []
for (let i = 0; i < addrs.length; i += 80) {
  const slice = addrs.slice(i, i + 80)
  const sites = await client.multicall({
    allowFailure: true,
    contracts: slice.map((a) => ({ address: a, abi: ERC20, functionName: 'website' })),
  }).catch(() => slice.map(() => ({ status: 'failure' })))
  const descs = await client.multicall({
    allowFailure: true,
    contracts: slice.map((a) => ({ address: a, abi: ERC20, functionName: 'description' })),
  }).catch(() => slice.map(() => ({ status: 'failure' })))
  const infos = await client.multicall({
    allowFailure: true,
    contracts: slice.map((a) => ({ address: a, abi: INFO, functionName: 'getTokenInfo' })),
  }).catch(() => slice.map(() => ({ status: 'failure' })))

  const hits = []
  slice.forEach((a, idx) => {
    const site = sites[idx]?.status === 'success' ? String(sites[idx].result || '') : ''
    const desc = descs[idx]?.status === 'success' ? String(descs[idx].result || '') : ''
    const info = infos[idx]?.status === 'success' ? infos[idx].result : null
    const extra = info ? `${info[2] || ''}\n${info[3]?.website || ''}` : ''
    const blob = `${site}\n${desc}\n${extra}`
    if (wikiish(blob) || a === OFFICIAL.toLowerCase()) hits.push(a)
  })
  if (hits.length) {
    const names = await client.multicall({
      allowFailure: true,
      contracts: hits.flatMap((a) => ([
        { address: a, abi: ERC20, functionName: 'name' },
        { address: a, abi: ERC20, functionName: 'symbol' },
      ])),
    })
    hits.forEach((a, idx) => {
      const name = names[idx * 2]?.status === 'success' ? String(names[idx * 2].result) : '?'
      const symbol = names[idx * 2 + 1]?.status === 'success' ? String(names[idx * 2 + 1].result) : '?'
      const site = sites[slice.indexOf(a)]?.status === 'success' ? String(sites[slice.indexOf(a)].result || '') : ''
      const desc = descs[slice.indexOf(a)]?.status === 'success' ? String(descs[slice.indexOf(a)].result || '') : ''
      wiki.push({ token: a, name, symbol, site, desc: desc.slice(0, 160), block: found.get(a)?.block?.toString() })
    })
  }
  if ((i + 80) % 400 === 0) console.log('probed', Math.min(i + 80, addrs.length), 'wiki', wiki.length)
}

console.log(JSON.stringify(wiki, null, 2))
console.log('WIKI_COUNT', wiki.length)
