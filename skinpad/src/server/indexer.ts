import type { Address } from 'viem'
import { skinId } from '../lib/skins.ts'
import { readToken, scanRecentLaunches } from '../lib/pons/factory.ts'
import { logServer } from './log.ts'
import { launchFor, rememberLaunch } from './store.ts'

let last = 0

export async function indexFactory(): Promise<{ scanned: number; linked: number }> {
  if (Date.now() - last < 30_000) return { scanned: 0, linked: 0 }
  last = Date.now()
  const tokens = await scanRecentLaunches().catch((e: Error) => {
    logServer('indexer', e.message)
    return [] as Address[]
  })
  let linked = 0
  for (const token of tokens) {
    if (launchFor(token)) continue
    const rec = await readToken(token).catch(() => null)
    if (!rec?.skinHash) continue
    rememberLaunch({
      token: rec.token,
      curve: rec.curve,
      hash: '',
      deployer: rec.deployer,
      marketHashName: rec.skinHash,
      skinId: skinId(rec.skinHash),
      quoteUsd: null,
      quotedAt: '',
      source: 'steam_median',
      createdAt: Date.now(),
    })
    linked += 1
  }
  return { scanned: tokens.length, linked }
}
