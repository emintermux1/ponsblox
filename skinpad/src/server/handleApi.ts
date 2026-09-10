import { isAddress, type Address } from 'viem'
import { CATALOGUE_SIZE, ON_PEG_BAND, SKINPAD_TICKER, configuredIntegrations } from '../config/official.ts'
import { computeDrift, tokenUsdFromEth } from '../lib/drift.ts'
import { readFactoryStatus, readToken } from '../lib/pons/factory.ts'
import type { SkinListing } from '../lib/skins.ts'
import { filterCatalogue, getCatalogue, getSkin } from './catalogue.ts'
import { indexFactory } from './indexer.ts'
import { ApiError, handleIpfsBody, ipfsStatus, pinImageUrl } from './ipfs.ts'
import { logServer } from './log.ts'
import { fetchEthUsd, fetchHistory, fetchSteamMedian, refreshMedians } from './prices.ts'
import { rateLimit, sameOrigin } from './security.ts'
import { launchFor, launchesForSkin, listLaunches, rememberLaunch, type LaunchRecord } from './store.ts'

export type ApiReq = {
  method: string
  pathname: string
  search: URLSearchParams
  body?: unknown
  origin?: string
  host?: string
}

export type ApiRes = {
  status: number
  json?: unknown
  raw?: string
  contentType?: string
  headers?: Record<string, string>
}

function originOf(req: ApiReq): string {
  if (req.origin) return req.origin.replace(/\/$/, '')
  const host = req.host || 'localhost:5178'
  const proto = host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https'
  return `${proto}://${host}`
}

function artUrl(req: ApiReq, id: string): string {
  return `${originOf(req)}/api/art?id=${encodeURIComponent(id)}`
}

function asLaunch(body: unknown): LaunchRecord {
  const b = (body || {}) as Record<string, unknown>
  const token = String(b.token || '')
  const curve = String(b.curve || '')
  const hash = String(b.hash || '')
  const deployer = String(b.deployer || '')
  const marketHashName = String(b.marketHashName || '')
  const skinId = String(b.skinId || '')
  const quotedAt = String(b.quotedAt || new Date().toISOString())
  const quoteUsd = b.quoteUsd == null || b.quoteUsd === '' ? null : Number(b.quoteUsd)
  if (!isAddress(token) || !isAddress(curve) || !isAddress(deployer)) throw new ApiError(400, 'Not a valid address')
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) throw new ApiError(400, 'Not a valid transaction hash')
  if (!marketHashName || !skinId) throw new ApiError(400, 'Skin peg is required')
  if (quoteUsd != null && !Number.isFinite(quoteUsd)) throw new ApiError(400, 'quoteUsd is invalid')
  return {
    token,
    curve,
    hash,
    deployer,
    marketHashName,
    skinId,
    quoteUsd,
    quotedAt,
    source: 'steam_median',
    createdAt: Date.now(),
  }
}

async function marketsJson() {
  void indexFactory()
  const ethUsd = await fetchEthUsd()
  const launches = listLaunches()
  const catalogue = await getCatalogue().catch(() => [] as SkinListing[])
  const rows = []
  for (const row of launches.slice(0, 80)) {
    const token = await readToken(row.token as Address).catch(() => null)
    const quote = await fetchSteamMedian(row.marketHashName).catch(() => null)
    const skinUsd = quote?.median ?? row.quoteUsd
    const tokenUsd = tokenUsdFromEth(token?.priceRblx, ethUsd)
    const drift = computeDrift(tokenUsd, skinUsd)
    const cat = catalogue.find((s) => s.id === row.skinId || s.marketHashName === row.marketHashName)
    rows.push({
      token: row.token,
      name: token?.name || row.marketHashName,
      symbol: token?.symbol || '',
      skinId: row.skinId,
      marketHashName: row.marketHashName,
      skinUsd,
      quoteSource: quote?.source || row.source,
      tokenUsd,
      priceEth: token?.priceRblx ?? null,
      graduated: Boolean(token?.graduated),
      readyToGraduate: Boolean(token?.readyToGraduate),
      drift: drift.value,
      createdAt: row.createdAt,
      image: cat?.image || token?.logo || '',
      rarityColor: cat?.rarityColor || '#4b69ff',
      wearShort: cat?.wearShort || '',
    })
  }
  return { ethUsd, rows }
}

export async function handleApi(req: ApiReq): Promise<ApiRes> {
  const path = req.pathname.replace(/\/+$/, '') || '/'
  const ip = req.host || 'local'
  try {
    if (path === '/api/health') {
      return { status: 200, json: { ok: true, ticker: SKINPAD_TICKER, integrations: configuredIntegrations() } }
    }

    if (path === '/api/catalogue' && req.method === 'GET') {
      if (!rateLimit(`cat:${ip}`, 60)) return { status: 429, json: { error: 'Slow down.' } }
      const items = await getCatalogue()
      const filtered = filterCatalogue(items, {
        q: req.search.get('q') || '',
        category: req.search.get('category') || 'all',
        wear: req.search.get('wear') || 'all',
      })
      void refreshMedians(items.slice(0, 40).map((r) => r.marketHashName))
      return {
        status: 200,
        json: {
          builtAt: items[0] ? new Date().toISOString() : '',
          size: items.length,
          note: `Top ${CATALOGUE_SIZE} CS2 weapon listings from Steam Community Market, ranked by ask. Peg uses Steam median.`,
          items: filtered,
        },
      }
    }

    if (path === '/api/skin' && req.method === 'GET') {
      const id = req.search.get('id') || ''
      if (!id) return { status: 400, json: { error: 'Missing skin id' } }
      const skin = await getSkin(id)
      if (!skin) return { status: 404, json: { error: 'That skin is not in the catalogue.' } }
      return { status: 200, json: { ...skin, art: artUrl(req, skin.id), tokens: launchesForSkin(skin.id) } }
    }

    if (path === '/api/history' && req.method === 'GET') {
      if (!rateLimit(`hist:${ip}`, 30)) return { status: 429, json: { error: 'Slow down.' } }
      const id = req.search.get('id') || ''
      if (!id) return { status: 400, json: { error: 'Missing skin id' } }
      const skin = await getSkin(id)
      if (!skin) return { status: 404, json: { error: 'That skin is not in the catalogue.' } }
      const history = await fetchHistory(skin.marketHashName)
      return { status: 200, json: history }
    }

    if (path === '/api/art' && req.method === 'GET') {
      const id = req.search.get('id') || path.split('/').pop() || ''
      const items = await getCatalogue()
      const skin = items.find((s) => s.id === id)
      if (!skin?.image) return { status: 404, json: { error: 'No Steam image for that listing.' } }
      return {
        status: 302,
        json: { image: skin.image },
        headers: { location: skin.image },
        contentType: 'text/plain',
        raw: '',
      }
    }

    if (path === '/api/markets' && req.method === 'GET') {
      const data = await marketsJson()
      const q = (req.search.get('q') || '').toLowerCase()
      const rows = q
        ? data.rows.filter((r) => `${r.name} ${r.symbol} ${r.marketHashName}`.toLowerCase().includes(q))
        : data.rows
      return { status: 200, json: { ...data, rows } }
    }

    if (path === '/api/pulse' && req.method === 'GET') {
      const items = await getCatalogue().catch(() => [] as SkinListing[])
      const data = await marketsJson().catch(() => ({ ethUsd: null, rows: [] as Awaited<ReturnType<typeof marketsJson>>['rows'] }))
      const onPeg = data.rows.filter((r) => r.drift != null && Math.abs(r.drift) <= ON_PEG_BAND).length
      return {
        status: 200,
        json: {
          catalogue: items.length,
          tokensLive: data.rows.length,
          onPeg,
          onCurve: data.rows.filter((r) => !r.graduated).length,
          graduated: data.rows.filter((r) => r.graduated).length,
        },
      }
    }

    if (path === '/api/launches' && req.method === 'GET') {
      const token = req.search.get('token') || ''
      if (token) {
        const row = launchFor(token)
        if (!row) return { status: 404, json: { error: 'No SkinPad index for that token.' } }
        return { status: 200, json: row }
      }
      return { status: 200, json: { launches: listLaunches() } }
    }

    if (path === '/api/launches' && req.method === 'POST') {
      if (!sameOrigin(req)) return { status: 403, json: { error: 'Cross-origin writes are blocked.' } }
      if (!rateLimit(`launch:${ip}`, 10)) return { status: 429, json: { error: 'Slow down.' } }
      const row = asLaunch(req.body)
      rememberLaunch(row)
      return { status: 200, json: { ok: true } }
    }

    if (path === '/api/factory' && req.method === 'GET') {
      const status = await readFactoryStatus()
      return {
        status: 200,
        json: {
          launchFeeEth: status.launchFeeEth,
          launchEnabled: status.launchEnabled,
          maxCreatorTaxBps: status.maxCreatorTaxBps,
          graduationRblx: status.graduationRblx,
        },
      }
    }

    if (path === '/api/ipfs' && req.method === 'GET') {
      return { status: 200, json: ipfsStatus() }
    }

    if (path === '/api/ipfs' && req.method === 'POST') {
      if (!sameOrigin(req)) return { status: 403, json: { error: 'Cross-origin writes are blocked.' } }
      if (!rateLimit(`ipfs:${ip}`, 8)) return { status: 429, json: { error: 'Slow down.' } }
      const b = (req.body || {}) as { kind?: string; id?: string }
      if (b.kind === 'skin') {
        const skin = await getSkin(String(b.id || ''))
        if (!skin) return { status: 404, json: { error: 'That skin is not in the catalogue.' } }
        if (!skin.image) return { status: 404, json: { error: 'No Steam image for that listing.' } }
        const pin = await pinImageUrl(skin.id, skin.image)
        return { status: 200, json: pin }
      }
      const pin = await handleIpfsBody(req.body)
      return { status: 200, json: pin }
    }

    if (path === '/api/index' && req.method === 'POST') {
      if (!sameOrigin(req)) return { status: 403, json: { error: 'Cross-origin writes are blocked.' } }
      const result = await indexFactory()
      return { status: 200, json: result }
    }

    return { status: 404, json: { error: 'Unknown SkinPad API route.' } }
  } catch (e) {
    if (e instanceof ApiError) return { status: e.status, json: { error: e.message } }
    logServer('api', (e as Error).message)
    return { status: 500, json: { error: 'Something failed. Retry, then check Docs.' } }
  }
}
