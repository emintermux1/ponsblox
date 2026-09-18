import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleApi } from './handleApi.ts'
import { SECURITY_HEADERS } from './security.ts'

type VercelReq = IncomingMessage & { body?: unknown }

function header(req: VercelReq, name: string): string | undefined {
  const value = req.headers[name]
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined
}

function apiPathname(req: VercelReq, url: URL): string {
  const raw = url.pathname.replace(/\/+$/, '') || '/'
  if (raw !== '/api/all' && raw !== '/api/all.js') return url.pathname
  const candidates = [
    header(req, 'x-forwarded-uri'),
    header(req, 'x-invoke-path'),
    header(req, 'x-matched-path'),
  ]
  for (const candidate of candidates) {
    if (!candidate) continue
    const path = candidate.startsWith('http') ? new URL(candidate).pathname : candidate.split('?')[0]
    if (path.startsWith('/api/') && path !== '/api/all' && path !== '/api/all.js') return path
  }
  return url.pathname
}

export default async function handler(req: VercelReq, res: ServerResponse) {
  const host = req.headers.host || 'localhost'
  const url = new URL(req.url || '/', `http://${host}`)
  const result = await handleApi({
    method: req.method || 'GET',
    pathname: apiPathname(req, url),
    search: url.searchParams,
    body: req.body,
    origin: typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
    host,
  })
  res.statusCode = result.status
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
  if (result.headers) {
    for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v)
  }
  res.setHeader('content-type', result.contentType || 'application/json')
  res.setHeader('cache-control', result.raw !== undefined && result.status === 302 ? 'no-store' : 's-maxage=60, stale-while-revalidate=180')
  res.end(result.raw !== undefined ? result.raw : JSON.stringify(result.json ?? {}))
}
