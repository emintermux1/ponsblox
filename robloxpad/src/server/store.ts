import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { GameListing } from '../lib/games.ts'

export type LaunchRecord = {
  token: string
  curve: string
  hash: string
  deployer: string
  universeId: string
  gameId: string
  gameName: string
  playing: number
  quotedAt: string
  createdAt: number
}

export type Store = {
  launches: Record<string, LaunchRecord>
  catalogue: GameListing[]
  catalogueBuiltAt: number
  players: Record<string, { n: number; at: number }[]>
}

const empty = (): Store => ({
  launches: {},
  catalogue: [],
  catalogueBuiltAt: 0,
  players: {},
})

const dir = process.env.VERCEL ? '/tmp/robloxpad' : resolve(process.cwd(), '.data')
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

export function launchesForGame(gameId: string): LaunchRecord[] {
  return listLaunches().filter((r) => r.gameId === gameId || r.universeId === gameId)
}

export function writeCatalogue(items: GameListing[], builtAt: number) {
  const s = load()
  s.catalogue = items
  s.catalogueBuiltAt = builtAt
  save(s)
}

export function writePlayers(id: string, n: number) {
  if (!Number.isFinite(n)) return
  const s = load()
  const hist = s.players[id] || []
  const last = hist[hist.length - 1]
  if (!last || last.n !== n || Date.now() - last.at > 3_600_000) {
    hist.push({ n, at: Date.now() })
    s.players[id] = hist.slice(-90)
    save(s)
  }
}

export function playerHistory(id: string): { t: number; n: number }[] {
  return (load().players[id] || []).map((p) => ({ t: p.at, n: p.n }))
}
