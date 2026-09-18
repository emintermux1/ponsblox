import { ENV } from './env.ts'

const BASE = 'https://openapi.gmgn.ai'
const CHAIN = 'robinhood'

type Cache<T> = { at: number; value: T }
const cache = new Map<string, Cache<unknown>>()

function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value as T)
  return load().then((value) => {
    cache.set(key, { at: Date.now(), value })
    return value
  })
}

async function gmgn<T>(path: string, query: Record<string, string>): Promise<T> {
  if (!ENV.gmgnKey) throw new Error('GMGN_API_KEY is not set')
  const url = new URL(path, BASE)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  const res = await fetch(url, {
    headers: { 'x-api-key': ENV.gmgnKey, accept: 'application/json' },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GMGN ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

export const gmgnConfigured = () => Boolean(ENV.gmgnKey)

export type Candle = {
  time: number
  open: string
  high: string
  low: string
  close: string
  volume: string
}

export async function tokenKline(address: string, resolution: string, from?: string, to?: string): Promise<Candle[]> {
  return cached(`kline:${address}:${resolution}:${from}:${to}`, 15_000, async () => {
    const q: Record<string, string> = { chain: CHAIN, address, resolution }
    if (from) q.from = from
    if (to) q.to = to
    const raw = await gmgn<{ data?: { list?: Candle[] } | Candle[] } | Candle[]>('/v1/market/token_kline', q)
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { data?: Candle[] }).data)
        ? (raw as { data: Candle[] }).data
        : ((raw as { data?: { list?: Candle[] } }).data?.list ?? [])
    return list.map((c) => ({
      time: Number(c.time),
      open: String(c.open ?? '0'),
      high: String(c.high ?? '0'),
      low: String(c.low ?? '0'),
      close: String(c.close ?? '0'),
      volume: String(c.volume ?? '0'),
    })).filter((c) => Number.isFinite(c.time))
  })
}

export async function tokenInfo(address: string): Promise<unknown> {
  return cached(`info:${address}`, 15_000, () =>
    gmgn('/v1/token/info', { chain: CHAIN, address }))
}

export async function trending(interval = '1h', limit = '20'): Promise<unknown> {
  return cached(`trend:${interval}:${limit}`, 20_000, () =>
    gmgn('/v1/market/rank', { chain: CHAIN, interval, limit }))
}

export function sparkline(candles: Candle[], max = 24): { t: number; c: number }[] {
  return candles.slice(-max).map((c) => {
    const n = Number(c.close)
    return { t: c.time, c: Number.isFinite(n) ? n : 0 }
  })
}
