import { rateLimit } from './security.ts'
import { ApiError, loadMostViewed, loadPage, loadTrending, searchPages } from './wiki.ts'

export type ApiReq = {
  method: string
  pathname: string
  search: URLSearchParams
  body?: unknown
  origin?: string
  host?: string
  ip?: string
}

export type ApiRes = { status: number; json?: unknown; raw?: string; contentType?: string }

export async function handleApi(req: ApiReq): Promise<ApiRes> {
  const path = req.pathname.replace(/\/+$/, '') || '/'
  if (!rateLimit(`${req.ip || 'local'}:${path}`, 80)) {
    return { status: 429, json: { error: 'Rate limited. Wait a minute.' } }
  }
  try {
    if (path === '/api/health' && req.method === 'GET') {
      return { status: 200, json: { ok: true, product: 'WikiPad' } }
    }
    if (path === '/api/wiki/search' && req.method === 'GET') {
      const q = req.search.get('q') || ''
      const results = await searchPages(q)
      return { status: 200, json: { results, q } }
    }
    if (path === '/api/wiki/page' && req.method === 'GET') {
      const title = req.search.get('title') || ''
      const page = await loadPage(title)
      return { status: 200, json: page }
    }
    if (path === '/api/wiki/trending' && req.method === 'GET') {
      const results = await loadTrending()
      return { status: 200, json: { results } }
    }
    if (path === '/api/wiki/top' && req.method === 'GET') {
      const results = await loadMostViewed()
      return { status: 200, json: { results } }
    }
    return { status: 404, json: { error: 'Not found' } }
  } catch (e) {
    if (e instanceof ApiError) {
      const msg = e.message
      if (/eth_call|HTTP request failed|rpc\.mainnet|viem|0x[a-fA-F0-9]{24,}/i.test(msg)) {
        return { status: 502, json: { error: 'Wikipedia is unavailable. Try again.' } }
      }
      return { status: e.status, json: { error: msg } }
    }
    return { status: 500, json: { error: 'Something failed.' } }
  }
}
