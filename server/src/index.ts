import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { isAddress, parseUnits, type Address, type Hex } from 'viem'
import { ENV } from './env.ts'
import { gmgnTokenUrl, RBLX } from './chain.ts'
import { robloxSafe } from './json.ts'
import { gmgnConfigured, sparkline, tokenInfo, tokenKline, trending } from './gmgn.ts'
import { readFeed, watchToken } from './feed.ts'
import {
  confirmIntent, createLaunchIntent, createTradeIntent, getIntent, publicIntent,
} from './intents.ts'
import { quoteTrade, readFactoryStatus, readToken } from './pons.ts'
import { getLink, setLink } from './store.ts'

const app = new Hono()
app.use('/*', cors())

function json(c: { json: (o: Record<string, unknown>, s?: 200 | 400 | 401 | 404 | 503) => Response }, body: unknown, status?: 200 | 400 | 401 | 404 | 503) {
  const safe = robloxSafe(body) as Record<string, unknown>
  return status ? c.json(safe, status) : c.json(safe)
}

app.get('/health', (c) => json(c, { ok: true, pair: 'RBLX', gmgn: gmgnConfigured() }))

app.get('/v1/status', async (c) => {
  const status = await readFactoryStatus()
  return json(c, { ...status, pairToken: RBLX, pairSymbol: 'RBLX' })
})

app.get('/v1/feed', async (c) => {
  const rows = await readFeed()
  return json(c, { pairToken: RBLX, tokens: rows })
})

app.get('/v1/token/:address', async (c) => {
  const address = c.req.param('address')
  if (!isAddress(address)) return json(c, { error: 'Not an address' }, 400)
  const row = await readToken(address)
  if (!row) return json(c, { error: 'Not an RBLX-pair Pons launch' }, 404)
  let gmgn: unknown = null
  if (gmgnConfigured()) {
    gmgn = await tokenInfo(address).catch(() => null)
  }
  return json(c, { ...row, gmgn, gmgnUrl: gmgnTokenUrl(address) })
})

app.post('/v1/watch', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { address?: string }
  if (!body.address || !isAddress(body.address)) return json(c, { error: 'Not an address' }, 400)
  const row = await watchToken(body.address)
  if (!row) return json(c, { error: 'Not an RBLX-pair Pons launch' }, 404)
  return json(c, row)
})

app.get('/v1/kline/:address', async (c) => {
  const address = c.req.param('address')
  if (!isAddress(address)) return json(c, { error: 'Not an address' }, 400)
  const res = c.req.query('res') || '1m'
  const allowed = new Set(['30s', '1m', '5m', '15m', '1h', '4h', '1d'])
  if (!allowed.has(res)) return json(c, { error: 'Bad resolution' }, 400)
  if (!gmgnConfigured()) return json(c, { candles: [], spark: [], gmgn: false })
  const now = Math.floor(Date.now() / 1000)
  const span = res === '1d' ? 86400 * 30 : res === '4h' || res === '1h' ? 86400 * 3 : 3600 * 6
  const candles = await tokenKline(address, res, String(now - span), String(now))
  return json(c, { candles, spark: sparkline(candles), gmgn: true })
})

app.get('/v1/trending', async (c) => {
  if (!gmgnConfigured()) return json(c, { tokens: [], gmgn: false })
  const raw = await trending(c.req.query('interval') || '1h', c.req.query('limit') || '20')
  return json(c, { raw, gmgn: true })
})

app.get('/v1/quote', async (c) => {
  const token = c.req.query('token') || ''
  const side = c.req.query('side') === 'sell' ? 'sell' : 'buy'
  const amount = c.req.query('amount') || ''
  const recipient = (c.req.query('recipient') || '0x0000000000000000000000000000000000000001') as Address
  if (!isAddress(token)) return json(c, { error: 'Not an address' }, 400)
  const wei = parseUnits(amount, 18)
  if (wei <= 0n) return json(c, { error: 'Amount must be greater than zero' }, 400)
  try {
    const q = await quoteTrade(token, side, wei, recipient)
    return json(c, q)
  } catch (e) {
    return json(c, { error: (e as Error).message }, 400)
  }
})

app.post('/v1/intents/launch', async (c) => {
  const b = await c.req.json().catch(() => ({})) as Record<string, unknown>
  try {
    const intent = await createLaunchIntent({
      name: String(b.name ?? ''),
      symbol: String(b.symbol ?? ''),
      logo: String(b.logo ?? ''),
      description: String(b.description ?? ''),
      twitter: String(b.twitter ?? ''),
      telegram: String(b.telegram ?? ''),
      website: String(b.website ?? ''),
      creatorTaxBps: Number(b.creatorTaxBps ?? 0),
      buybackEnabled: Boolean(b.buybackEnabled),
      quoteIn: String(b.quoteIn ?? ''),
      recipient: String(b.recipient ?? '') as Address,
      robloxUserId: b.robloxUserId ? String(b.robloxUserId) : undefined,
    })
    return json(c, publicIntent(intent))
  } catch (e) {
    return json(c, { error: (e as Error).message }, 400)
  }
})

app.post('/v1/intents/trade', async (c) => {
  const b = await c.req.json().catch(() => ({})) as Record<string, unknown>
  if (!isAddress(String(b.token ?? ''))) return json(c, { error: 'Not a token address' }, 400)
  try {
    const intent = await createTradeIntent({
      token: String(b.token) as Address,
      side: b.side === 'sell' ? 'sell' : 'buy',
      amount: String(b.amount ?? ''),
      recipient: String(b.recipient ?? '') as Address,
      robloxUserId: b.robloxUserId ? String(b.robloxUserId) : undefined,
    })
    return json(c, publicIntent(intent))
  } catch (e) {
    return json(c, { error: (e as Error).message }, 400)
  }
})

app.get('/v1/intents/:code', (c) => {
  const intent = getIntent(c.req.param('code'))
  if (!intent) return json(c, { error: 'Unknown code' }, 404)
  return json(c, publicIntent(intent))
})

app.post('/v1/intents/:code/confirm', async (c) => {
  const b = await c.req.json().catch(() => ({})) as { hash?: string }
  if (!b.hash || !/^0x[0-9a-fA-F]{64}$/.test(b.hash)) return json(c, { error: 'Need a transaction hash' }, 400)
  try {
    const intent = await confirmIntent(c.req.param('code'), b.hash as Hex)
    return json(c, publicIntent(intent))
  } catch (e) {
    return json(c, { error: (e as Error).message }, 400)
  }
})

app.get('/v1/link/:robloxUserId', (c) => {
  const link = getLink(c.req.param('robloxUserId'))
  return json(c, { linked: Boolean(link), address: link?.address ?? null })
})

app.post('/v1/link', async (c) => {
  const b = await c.req.json().catch(() => ({})) as { robloxUserId?: string; address?: string }
  if (!b.robloxUserId || !b.address || !isAddress(b.address)) {
    return json(c, { error: 'Need a Roblox user id and a wallet address' }, 400)
  }
  setLink(b.robloxUserId, b.address)
  return json(c, { linked: true, address: b.address, robloxUserId: b.robloxUserId })
})

serve({ fetch: app.fetch, port: ENV.port }, (info) => {
  console.log(`ponsblox api on http://localhost:${info.port}`)
})
