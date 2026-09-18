import { parseAbiItem, type Address, type Hex } from 'viem'
import { FACTORY, LOG_WINDOW, publicClient } from './chain.ts'
import { readToken, type TokenRecord } from './pons.ts'
import { listKnownTokens, rememberToken } from './store.ts'

const launchedEvent = parseAbiItem(
  'event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)',
)

const feedCache: { at: number; rows: TokenRecord[] } = { at: 0, rows: [] }

export async function ingestRecentLaunches() {
  const latest = await publicClient.getBlockNumber()
  const from = latest > LOG_WINDOW ? latest - LOG_WINDOW : 0n
  const logs = await publicClient.getLogs({
    address: FACTORY,
    event: launchedEvent,
    fromBlock: from,
    toBlock: latest,
  }).catch(() => [])

  for (const log of logs) {
    const pair = (log.args.pairToken as Address | undefined)?.toLowerCase()
    const token = log.args.token as Address | undefined
    if (!token || pair !== '0xf0c4bf4c582cb3836e98394b1d4e7b7281101be8') continue
    rememberToken(token)
  }
}

export async function watchToken(address: Address): Promise<TokenRecord | null> {
  const row = await readToken(address)
  if (row) rememberToken(row.token)
  return row
}

let ingesting = false

function ingestInBackground() {
  if (ingesting) return
  ingesting = true
  void ingestRecentLaunches()
    .catch(() => {})
    .finally(() => { ingesting = false })
}

export async function readFeed(force = false): Promise<TokenRecord[]> {
  ingestInBackground()
  if (!force && Date.now() - feedCache.at < 8_000) return feedCache.rows
  const known = listKnownTokens()
  const rows = (await Promise.all(known.map((k) => readToken(k.token).catch(() => null))))
    .filter((r): r is TokenRecord => r !== null)
  feedCache.at = Date.now()
  feedCache.rows = rows
  return rows
}

export function rememberFromTx(token: Address) {
  rememberToken(token)
  feedCache.at = 0
}

export type TxWatch = { hash: Hex }
