import type { GameListing } from './games.ts'

async function readJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({})) as T & { error?: string }
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

export type CatalogueResponse = {
  builtAt: string
  size: number
  note: string
  genres: string[]
  items: GameListing[]
}

export type MarketsResponse = {
  rows: MarketRow[]
}

export type MarketRow = {
  token: string
  name: string
  symbol: string
  gameId: string
  gameName: string
  playing: number
  tokenUsd: number | null
  priceEth: string | null
  graduated: boolean
  readyToGraduate: boolean
  createdAt: number
  image: string
}

export type PulseStats = {
  catalogue: number
  tokensLive: number
  onCurve: number
  graduated: number
  playingNow: number
}

export async function fetchCatalogue(input?: { q?: string; sort?: string; genre?: string }): Promise<CatalogueResponse> {
  const qs = new URLSearchParams()
  if (input?.q) qs.set('q', input.q)
  if (input?.sort && input.sort !== 'all') qs.set('sort', input.sort)
  if (input?.genre && input.genre !== 'all') qs.set('genre', input.genre)
  const s = qs.toString()
  const res = await fetch(s ? `/api/catalogue?${s}` : '/api/catalogue')
  return readJson<CatalogueResponse>(res)
}

export type GameDetail = GameListing & {
  art?: string
  tokens?: { token: string; createdAt: number }[]
}

export async function fetchGame(id: string): Promise<GameDetail> {
  const res = await fetch(`/api/game?id=${encodeURIComponent(id)}`)
  return readJson<GameDetail>(res)
}

export type HistoryResponse = {
  source: 'snapshots'
  points: { t: number; n: number }[]
}

export async function fetchHistory(id: string): Promise<HistoryResponse> {
  const res = await fetch(`/api/history?id=${encodeURIComponent(id)}`)
  return readJson<HistoryResponse>(res)
}

export async function fetchMarkets(q = ''): Promise<MarketsResponse> {
  const res = await fetch(q ? `/api/markets?q=${encodeURIComponent(q)}` : '/api/markets')
  return readJson<MarketsResponse>(res)
}

export async function fetchPulse(): Promise<PulseStats> {
  const res = await fetch('/api/pulse')
  return readJson<PulseStats>(res)
}

export async function rememberLaunch(body: {
  token: string
  curve: string
  hash: string
  deployer: string
  universeId: string
  gameId: string
  gameName: string
  playing: number
  quotedAt: string
}): Promise<{ ok: true }> {
  const res = await fetch('/api/launches', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return readJson<{ ok: true }>(res)
}

export async function fetchLaunch(address: string): Promise<{
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
} | null> {
  const res = await fetch(`/api/launches?token=${encodeURIComponent(address)}`)
  if (res.status === 404) return null
  return readJson(res)
}

export type FactoryJson = {
  launchFeeEth: string
  launchEnabled: boolean
  maxCreatorTaxBps: number
  graduationRblx: string
}

export async function fetchFactory(): Promise<FactoryJson> {
  const res = await fetch('/api/factory')
  return readJson<FactoryJson>(res)
}
