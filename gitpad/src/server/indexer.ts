import { publicClient } from '../lib/pons/client.ts'
import { TOKEN_LAUNCHED } from '../lib/pons/abi.ts'
import { FACTORY } from '../lib/pons/config.ts'
import { byGitlabName } from '../lib/naming.ts'
import {
  addActivityOnce,
  addDeployment,
  rememberToken,
  readStore,
  writeIndexerCursor,
} from './store.ts'
import { logServer } from './log.ts'

const CONFIRMATIONS = 8n
const CHUNK = 2000n

export function logKey(block: bigint, tx: string, index: number) {
  return `${block}-${tx.toLowerCase()}-${index}`
}

export async function indexFactory(fromHint?: bigint) {
  const s = readStore()
  const latest = await publicClient.getBlockNumber()
  if (latest < CONFIRMATIONS) return { scanned: 0, added: 0, lastBlock: Number(s.indexer.lastBlock) }

  const safe = latest - CONFIRMATIONS
  let from = fromHint ?? (s.indexer.lastBlock > 0 ? BigInt(s.indexer.lastBlock) + 1n : (safe > 20_000n ? safe - 20_000n : 0n))
  if (from > safe) return { scanned: 0, added: 0, lastBlock: Number(s.indexer.lastBlock) }
  if (s.indexer.lastBlock > 0 && BigInt(s.indexer.lastBlock) > latest) {
    from = latest > 64n ? latest - 64n : 0n
  }

  let added = 0
  let scanned = 0
  let cursor = from
  while (cursor <= safe) {
    const to = cursor + CHUNK - 1n > safe ? safe : cursor + CHUNK - 1n
    const logs = await publicClient.getLogs({
      address: FACTORY,
      event: TOKEN_LAUNCHED,
      fromBlock: cursor,
      toBlock: to,
    }).catch((e: Error) => {
      logServer('indexer', e.message)
      return []
    })
    scanned += logs.length
    for (const log of logs) {
      const key = logKey(log.blockNumber ?? 0n, log.transactionHash, log.logIndex ?? 0)
      if (s.indexer.processed[key]) continue
      const token = log.args.token
      if (!token) {
        writeIndexerCursor(Number(to), key)
        continue
      }
      const existing = readStore().tokens.some((t) => t.address.toLowerCase() === token.toLowerCase())
      if (!existing) {
        rememberToken({
          address: token,
          githubId: 0,
          owner: '',
          name: '',
          symbol: '',
          displayName: byGitlabName('Token'),
          kind: 'unverified',
          deployer: (log.args.deployer || '').toString(),
          deployedAt: Date.now(),
          txHash: log.transactionHash,
        })
        added += 1
      }
      addDeployment({
        txHash: log.transactionHash,
        token,
        status: 'success',
        at: Date.now(),
      })
      addActivityOnce({
        kind: 'token_launched',
        at: Date.now(),
        title: 'Pons V2 launch indexed',
        body: token,
        token,
        href: `/token/${token}`,
      })
      writeIndexerCursor(Number(to), key)
    }
    cursor = to + 1n
    writeIndexerCursor(Number(to))
  }
  return { scanned, added, lastBlock: Number(readStore().indexer.lastBlock) }
}
