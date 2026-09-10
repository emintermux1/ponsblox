import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { QuoteSource, SkinListing } from '../lib/skins.ts'

export type LaunchRecord = {
  token: string
  curve: string
  hash: string
  deployer: string
  marketHashName: string
  skinId: string
  quoteUsd: number | null
  quotedAt: string
  source: 'steam_median'
  createdAt: number
}

export type PriceRow = {
  median: number | null
  lowest: number | null
  volume: string
  source: QuoteSource
  at: number
}

export type Store = {
  launches: Record<string, LaunchRecord>
  catalogue: SkinListing[]
  catalogueBuiltAt: number
  prices: Record<string, PriceRow>
  history: Record<string, { t: number; usd: number }[]>
  ethUsd: { usd: number; at: number } | null
}

const empty = (): Store => ({
  launches: {},
  catalogue: [],
  catalogueBuiltAt: 0,
  prices: {},
  history: {},
  ethUsd: null,
})

const dir = process.env.VERCEL ? '/tmp/skinpad' : resolve(process.cwd(), '.data')
const file = resolve(dir, 'store.json')

let mem: Store | null = null

function load(): Store {
  if (mem) return mem
  try {
    const raw = readFileSync(file, 'utf8')
    mem = { ...empty(), ...(JSON.parse(raw) as Store) }
  } catch {
    mem = empty()
  }
  return mem
}

function save(next: Store) {
  mem = next
  try {
    mkdirSync(dir, { recursive: true })
    writeFileSync(file, JSON.stringify(next))
  } catch {
    /* ephemeral hosts may not persist */
  }
}

export function readStore(): Store {
  return load()
}

export function rememberLaunch(row: LaunchRecord) {
  const s = load()
  s.launches[row.token.toLowerCase()] = row
  save(s)
}

export function launchFor(token: string): LaunchRecord | null {
  return load().launches[token.toLowerCase()] ?? null
}

export function listLaunches(): LaunchRecord[] {
  return Object.values(load().launches).sort((a, b) => b.createdAt - a.createdAt)
}

export function launchesForSkin(skinId: string): LaunchRecord[] {
  return listLaunches().filter((r) => r.skinId === skinId)
}

export function writeCatalogue(items: SkinListing[], builtAt: number) {
  const s = load()
  s.catalogue = items
  s.catalogueBuiltAt = builtAt
  save(s)
}

export function writePrice(hash: string, row: PriceRow) {
  const s = load()
  s.prices[hash] = row
  if (row.median != null) {
    const hist = s.history[hash] || []
    const last = hist[hist.length - 1]
    if (!last || last.usd !== row.median || row.at - last.t > 3_600_000) {
      hist.push({ t: row.at, usd: row.median })
      s.history[hash] = hist.slice(-90)
    }
  }
  save(s)
}

export function writeEthUsd(usd: number) {
  const s = load()
  s.ethUsd = { usd, at: Date.now() }
  save(s)
}
