import { domainError, normalizeDomain, readDomains } from './domain.js'

/** GET /api/resolve?host=pad.example.com → { host, slug } for connected custom domains. */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const url = new URL(req.url || '/', 'http://local')
  const host = normalizeDomain(url.searchParams.get('host') || '')
  if (domainError(host)) {
    res.status(400).json({ error: 'Bad host.' })
    return
  }
  try {
    const map = await readDomains()
    const slug = typeof map[host] === 'string' ? map[host] : null
    if (!slug) {
      res.setHeader?.('cache-control', 'public, max-age=30')
      res.status(404).json({ error: 'No pad on this host.', host })
      return
    }
    res.setHeader?.('cache-control', 'public, max-age=60, s-maxage=300')
    res.status(200).json({ host, slug })
  } catch (e) {
    const status = e && typeof e === 'object' && 'status' in e ? Number(e.status) : 500
    res.status(status || 500).json({ error: e instanceof Error ? e.message : 'Resolve failed' })
  }
}
