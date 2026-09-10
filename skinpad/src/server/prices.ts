import { STEAM_APP_ID } from '../config/official.ts'
import { parseUsd, type QuoteSource } from '../lib/skins.ts'
import { logServer } from './log.ts'
import { readStore, writeEthUsd, writePrice, type PriceRow } from './store.ts'

const UA = 'Mozilla/5.0 (compatible; SkinPad/1.0; +https://skinpad.local)'

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

let priceLock = Promise.resolve()

export async function steamGet(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      'user-agent': UA,
      accept: 'application/json,text/plain,*/*',
    },
  })
}

export function applyPrice(hash: string, row: PriceRow) {
  writePrice(hash, row)
}

export async function fetchEthUsd(): Promise<number | null> {
  const cached = readStore().ethUsd
  if (cached && Date.now() - cached.at < 60_000) return cached.usd
  try {
    const res = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot', {
      headers: { accept: 'application/json', 'user-agent': UA },
    })
    const json = await res.json() as { data?: { amount?: string } }
    const usd = Number(json.data?.amount)
    if (!Number.isFinite(usd) || usd <= 0) return cached?.usd ?? null
    writeEthUsd(usd)
    return usd
  } catch (e) {
    logServer('steam', `eth usd ${(e as Error).message}`)
    return cached?.usd ?? null
  }
}

export async function fetchSteamMedian(hash: string): Promise<PriceRow> {
  const prev = readStore().prices[hash]
  const url = `https://steamcommunity.com/market/priceoverview/?appid=${STEAM_APP_ID}&currency=1&market_hash_name=${encodeURIComponent(hash)}`
  try {
    const res = await steamGet(url)
    if (res.status === 429) {
      logServer('steam', `429 priceoverview ${hash}`)
      return prev ?? { median: null, lowest: null, volume: '', source: 'unavailable', at: Date.now() }
    }
    const json = await res.json() as {
      success?: boolean
      median_price?: string
      lowest_price?: string
      volume?: string
    }
    if (!json.success) {
      if (prev?.median != null) return { ...prev, source: 'unavailable', at: Date.now() }
      return { median: null, lowest: parseUsd(json.lowest_price), volume: json.volume || '', source: 'unavailable', at: Date.now() }
    }
    const median = parseUsd(json.median_price)
    const lowest = parseUsd(json.lowest_price)
    let source: QuoteSource = 'unavailable'
    if (median != null) source = 'steam_median'
    else if (lowest != null) source = 'steam_ask'
    const row: PriceRow = {
      median: median ?? prev?.median ?? null,
      lowest: lowest ?? prev?.lowest ?? null,
      volume: json.volume || prev?.volume || '',
      source: median != null ? 'steam_median' : (prev?.median != null ? 'unavailable' : source),
      at: Date.now(),
    }
    if (median == null && prev?.median != null) {
      row.median = prev.median
      row.source = 'unavailable'
    }
    applyPrice(hash, row)
    return row
  } catch (e) {
    logServer('steam', `priceoverview ${hash} ${(e as Error).message}`)
    if (prev) return { ...prev, source: 'unavailable', at: Date.now() }
    return { median: null, lowest: null, volume: '', source: 'unavailable', at: Date.now() }
  }
}

export type HistoryPoint = { t: number; usd: number }
export type HistoryData = { source: 'steam_history' | 'snapshots'; points: HistoryPoint[] }

const historyCache = new Map<string, { at: number; points: HistoryPoint[] }>()
const HISTORY_TTL = 30 * 60_000
const HISTORY_MAX_POINTS = 120

function downsample(points: HistoryPoint[]): HistoryPoint[] {
  if (points.length <= HISTORY_MAX_POINTS) return points
  const step = points.length / HISTORY_MAX_POINTS
  const out: HistoryPoint[] = []
  for (let i = 0; i < HISTORY_MAX_POINTS - 1; i++) out.push(points[Math.floor(i * step)])
  out.push(points[points.length - 1])
  return out
}

/**
 * Real price history only. Tries Steam's pricehistory endpoint (usually
 * requires a logged-in session, so anonymous calls often fail); falls back to
 * our own accumulated median snapshots. Never invents points.
 */
export async function fetchHistory(hash: string): Promise<HistoryData> {
  const cached = historyCache.get(hash)
  if (cached && Date.now() - cached.at < HISTORY_TTL && cached.points.length >= 2) {
    return { source: 'steam_history', points: cached.points }
  }
  try {
    const url = `https://steamcommunity.com/market/pricehistory/?appid=${STEAM_APP_ID}&market_hash_name=${encodeURIComponent(hash)}`
    const res = await steamGet(url)
    if (res.ok) {
      const json = await res.json().catch(() => null) as { success?: boolean; prices?: [string, number, string][] } | null
      if (json?.success && Array.isArray(json.prices) && json.prices.length >= 2) {
        const points = json.prices
          .map(([date, usd]) => ({ t: Date.parse(String(date).slice(0, 11)), usd: Number(usd) }))
          .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.usd) && p.usd > 0)
        if (points.length >= 2) {
          const sampled = downsample(points)
          historyCache.set(hash, { at: Date.now(), points: sampled })
          return { source: 'steam_history', points: sampled }
        }
      }
    }
  } catch (e) {
    logServer('steam', `pricehistory ${hash} ${(e as Error).message}`)
  }
  return { source: 'snapshots', points: readStore().history[hash] || [] }
}

export async function refreshMedians(hashes: string[], gapMs = 1200) {
  priceLock = priceLock.then(async () => {
    for (const hash of hashes) {
      const prev = readStore().prices[hash]
      if (prev && Date.now() - prev.at < 30 * 60_000 && prev.source === 'steam_median') continue
      await fetchSteamMedian(hash)
      await wait(gapMs)
    }
  }).catch((e) => {
    logServer('steam', `refresh ${(e as Error).message}`)
  })
  return priceLock
}
