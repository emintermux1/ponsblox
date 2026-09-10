import type { SkinListing } from './skins.ts'

async function readJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({})) as T & { error?: string }
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

export type CatalogueResponse = {
  builtAt: string
  size: number
  note: string
  items: SkinListing[]
}

export type MarketsResponse = {
  ethUsd: number | null
  rows: MarketRow[]
}

export type MarketRow = {
  token: string
  name: string
  symbol: string
  skinId: string
  marketHashName: string
  skinUsd: number | null
  quoteSource: string
  tokenUsd: number | null
  priceEth: string | null
  graduated: boolean
  readyToGraduate: boolean
  drift: number | null
  createdAt: number
  image: string
  rarityColor: string
  wearShort: string
}

export type PulseStats = {
  catalogue: number
  tokensLive: number
  onPeg: number
  onCurve: number
  graduated: number
}

export async function fetchCatalogue(input?: { q?: string; category?: string; wear?: string }): Promise<CatalogueResponse> {
  const qs = new URLSearchParams()
  if (input?.q) qs.set('q', input.q)
  if (input?.category && input.category !== 'all') qs.set('category', input.category)
  if (input?.wear && input.wear !== 'all') qs.set('wear', input.wear)
  const s = qs.toString()
  const res = await fetch(s ? `/api/catalogue?${s}` : '/api/catalogue')
  return readJson<CatalogueResponse>(res)
}

export type SkinDetail = SkinListing & {
  art?: string
  tokens?: { token: string; createdAt: number }[]
}

export async function fetchSkin(id: string): Promise<SkinDetail> {
  const res = await fetch(`/api/skin?id=${encodeURIComponent(id)}`)
  return readJson<SkinDetail>(res)
}

export type HistoryResponse = {
  source: 'steam_history' | 'snapshots'
  points: { t: number; usd: number }[]
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
  marketHashName: string
  skinId: string
  quoteUsd: number | null
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
  marketHashName: string
  skinId: string
  quoteUsd: number | null
  quotedAt: string
  source: string
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
