const hits = new Map<string, { n: number; at: number }>()

export function rateLimit(key: string, max = 60, windowMs = 60_000): boolean {
  const now = Date.now()
  const cur = hits.get(key)
  if (!cur || now - cur.at > windowMs) {
    hits.set(key, { n: 1, at: now })
    return true
  }
  cur.n += 1
  return cur.n <= max
}

export function sameOrigin(req: { origin?: string; host?: string }): boolean {
  if (!req.origin) return true
  try {
    const host = (req.host || '').replace(/:\d+$/, '')
    const originHost = new URL(req.origin).hostname
    return originHost === host || originHost === 'localhost' || originHost === '127.0.0.1'
  } catch {
    return false
  }
}

export const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'content-security-policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob: ipfs:",
    "connect-src 'self' https://rpc.mainnet.chain.robinhood.com https://en.wikipedia.org https://wikimedia.org https://www.wikidata.org wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
}
