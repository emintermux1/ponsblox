import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, defineChain, formatUnits, http, parseAbi } from 'viem'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const statePath = resolve(root, 'data', 'pair-watch.json')
const FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e'

const factoryAbi = parseAbi([
  'function approvedPairTokens(address pairToken) view returns (bool)',
  'function pairTokenEconomics(address pairToken) view returns (uint256 phantomQuote, uint256 graduationThreshold, uint8 decimals)',
  'event PairTokenApprovalUpdated(address indexed pairToken, bool approved)',
])
const erc20Abi = parseAbi([
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
])

const rhc = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [process.env.RHC_RPC || 'https://rpc.mainnet.chain.robinhood.com'] } },
})

const client = createPublicClient({
  chain: rhc,
  transport: http(rhc.rpcUrls.default.http[0], { timeout: 60_000 }),
})

function loadState() {
  try {
    return JSON.parse(readFileSync(statePath, 'utf8'))
  } catch {
    return { lastBlock: 0, pairs: {} }
  }
}

function saveState(state) {
  mkdirSync(resolve(root, 'data'), { recursive: true })
  writeFileSync(statePath, JSON.stringify(state, null, 2))
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function withRetry(fn, tries = 6) {
  let last
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (err) {
      last = err
      const msg = String(err.details || err.message || err)
      if (!/Too Many Requests|429/i.test(msg) || i === tries - 1) throw err
      await sleep(800 * (i + 1))
    }
  }
  throw last
}

async function describe(addr) {
  const [approved, economics] = await withRetry(() => Promise.all([
    client.readContract({ address: FACTORY, abi: factoryAbi, functionName: 'approvedPairTokens', args: [addr] }),
    client.readContract({ address: FACTORY, abi: factoryAbi, functionName: 'pairTokenEconomics', args: [addr] }),
  ]))
  let symbol = '?'
  let name = '?'
  let decimals = Number(economics[2])
  try {
    const [s, n, d] = await withRetry(() => Promise.all([
      client.readContract({ address: addr, abi: erc20Abi, functionName: 'symbol' }),
      client.readContract({ address: addr, abi: erc20Abi, functionName: 'name' }),
      client.readContract({ address: addr, abi: erc20Abi, functionName: 'decimals' }),
    ]))
    symbol = s
    name = n
    decimals = Number(d)
  } catch {
    // keep placeholders
  }
  await sleep(120)
  return {
    address: addr,
    symbol,
    name,
    approved,
    graduation: formatUnits(economics[1], decimals || 18),
    decimals,
  }
}

const approvalEvent = factoryAbi.find((x) => x.type === 'event' && x.name === 'PairTokenApprovalUpdated')
const latest = await client.getBlockNumber()
const state = loadState()
const fromBlock = state.lastBlock ? BigInt(state.lastBlock) + 1n : 0n
const firstRun = !state.lastBlock

const logs = fromBlock <= latest
  ? await client.getLogs({
      address: FACTORY,
      event: approvalEvent,
      fromBlock,
      toBlock: latest,
    })
  : []

const changed = new Map()
for (const log of logs) {
  const addr = log.args.pairToken
  changed.set(addr.toLowerCase(), {
    address: addr,
    approved: Boolean(log.args.approved),
    block: log.blockNumber.toString(),
  })
}

const news = []
const revoked = []

for (const item of changed.values()) {
  const key = item.address.toLowerCase()
  const prev = state.pairs[key]
  const isNew = item.approved && (!prev || !prev.approved)
  const isRevoked = !item.approved && prev?.approved
  const needDetail = !firstRun && (isNew || isRevoked)
  const info = needDetail
    ? await describe(item.address)
    : {
        address: item.address,
        symbol: prev?.symbol || '?',
        name: prev?.name || '?',
        approved: item.approved,
        graduation: prev?.graduation || '0',
        decimals: prev?.decimals || 18,
      }
  let at = prev?.at || null
  if (needDetail) {
    const block = await withRetry(() => client.getBlock({ blockNumber: BigInt(item.block) }))
    at = new Date(Number(block.timestamp) * 1000).toISOString()
    await sleep(80)
  }
  const row = {
    ...info,
    approved: item.approved,
    block: item.block,
    at,
  }
  if (item.approved) {
    if (!firstRun && isNew) news.push(row)
    state.pairs[key] = row
  } else {
    if (!firstRun && isRevoked) revoked.push(row)
    state.pairs[key] = { ...row, approved: false }
  }
}

state.lastBlock = latest.toString()
state.scannedAt = new Date().toISOString()
saveState(state)

const approvedCount = Object.values(state.pairs).filter((p) => p.approved).length
const report = {
  ok: true,
  firstRun,
  block: latest.toString(),
  scannedAt: state.scannedAt,
  approvedCount,
  newCount: news.length,
  revokedCount: revoked.length,
  new: news,
  revoked,
}

console.log(JSON.stringify(report, null, 2))
if (news.length) {
  console.log('\nNEW PAIRS')
  for (const p of news) {
    console.log(`${p.symbol}  ${p.address}  grad=${p.graduation}  ${p.at}`)
  }
}
if (revoked.length) {
  console.log('\nREVOKED')
  for (const p of revoked) {
    console.log(`${p.symbol}  ${p.address}  ${p.at}`)
  }
}
if (!firstRun && !news.length && !revoked.length) {
  console.log(`NO CHANGE · ${approvedCount} approved pairs · block ${latest}`)
}
if (firstRun) {
  console.log(`BASELINE · ${approvedCount} approved pairs · watching from block ${latest}`)
}
