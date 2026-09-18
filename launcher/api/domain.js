import { createPublicClient, http, keccak256, parseAbi, stringToBytes, verifyMessage } from 'viem'

const VERCEL_API = 'https://api.vercel.com'
const EDGE_READ = 'https://edge-config.vercel.com'
const DOMAINS_KEY = 'domains'
const MINUTE_SKEW = 2
const MAX_DOMAIN = 253
const MAX_LABEL = 63
const LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
const RESERVED_SUFFIXES = ['launcher.family', 'localhost', 'vercel.app', 'vercel-dns.com']
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Same addresses the client uses (src/lib/chain.ts). Env overrides only. */
const CHAINS = {
  robinhood: {
    id: 4663,
    rpc: process.env.ROBINHOOD_RPC || 'https://rpc.mainnet.chain.robinhood.com',
    registry: process.env.LAUNCHER_REGISTRY || '0xc801579C373832BAB4F2cB9c90d3582E3927938E',
  },
  arc: {
    id: 5042002,
    rpc: process.env.ARC_RPC || 'https://rpc.testnet.arc.io',
    registry: process.env.ARC_REGISTRY || '0x5d5AA1024f8fAff21A837BfC1c69f571e52367Df',
  },
}

const REGISTRY_ABI = parseAbi([
  'function pads(bytes32) view returns (address owner, uint64 chainId, uint16 ownerFeeBps, uint16 creatorFeeBps, uint128 launchFeeWei, uint8 curveId, string slug, string name, string brandURI, bool exists)',
])

function fail(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

export function normalizeDomain(raw) {
  let h = String(raw || '').trim().toLowerCase()
  h = h.replace(/^https?:\/\//, '')
  h = h.split('/')[0] || ''
  h = h.split(':')[0] || ''
  return h.replace(/\.$/, '')
}

/** Mirrors domainError in src/lib/domain.ts. */
export function domainError(raw) {
  const host = normalizeDomain(raw)
  if (!host) return 'empty'
  if (host.length > MAX_DOMAIN) return 'length'
  const labels = host.split('.')
  if (labels.length < 2) return 'tld'
  for (const label of labels) {
    if (!label || label.length > MAX_LABEL) return 'length'
    if (!LABEL.test(label)) return 'charset'
  }
  if (!/^[a-z]{2,63}$/.test(labels[labels.length - 1])) return 'tld'
  for (const suffix of RESERVED_SUFFIXES) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return 'reserved'
  }
  return null
}

function vercelEnv() {
  const token = (process.env.VERCEL_TOKEN || '').trim()
  const projectId = (process.env.VERCEL_PROJECT_ID || '').trim()
  const teamId = (process.env.VERCEL_TEAM_ID || '').trim()
  if (!token || !projectId) throw fail(503, 'Custom domains are not configured on this deployment.')
  return { token, projectId, teamId }
}

export function edgeConfig() {
  const raw = (process.env.EDGE_CONFIG || '').trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    const id = u.pathname.replace(/^\/+/, '').split('/')[0]
    const token = u.searchParams.get('token') || ''
    if (!id || !token) return null
    return { id, token }
  } catch {
    return null
  }
}

async function vercel(path, init = {}) {
  const { token, teamId } = vercelEnv()
  const url = new URL(`${VERCEL_API}${path}`)
  if (teamId) url.searchParams.set('teamId', teamId)
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const text = await res.text()
  let json = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = {}
  }
  if (res.status === 401 || res.status === 403) {
    throw fail(503, 'Domain service token is invalid or expired. Replace VERCEL_TOKEN.')
  }
  return { ok: res.ok, status: res.status, json }
}

export async function readDomains() {
  const ec = edgeConfig()
  if (!ec) return {}
  const res = await fetch(`${EDGE_READ}/${ec.id}/item/${DOMAINS_KEY}?token=${ec.token}`, {
    headers: { 'cache-control': 'no-cache' },
  })
  if (res.status === 404) return {}
  if (!res.ok) throw fail(502, 'Domain map is unavailable.')
  const json = await res.json().catch(() => ({}))
  return json && typeof json === 'object' && !Array.isArray(json) ? json : {}
}

async function writeDomain(domain, slug) {
  const ec = edgeConfig()
  if (!ec) throw fail(503, 'Domain map is not configured. Set EDGE_CONFIG.')
  const current = await readDomains()
  const next = { ...current, [domain]: slug }
  const { ok, json } = await vercel(`/v1/edge-config/${ec.id}/items`, {
    method: 'PATCH',
    body: JSON.stringify({ items: [{ operation: 'upsert', key: DOMAINS_KEY, value: next }] }),
  })
  if (!ok) throw fail(502, json?.error?.message || 'Could not save the domain map.')
}

async function padOwner(chain, slug) {
  const cfg = CHAINS[chain]
  if (!cfg) throw fail(400, 'Unknown chain.')
  const client = createPublicClient({ transport: http(cfg.rpc, { timeout: 12_000 }) })
  const row = await client.readContract({
    address: cfg.registry,
    abi: REGISTRY_ABI,
    functionName: 'pads',
    args: [keccak256(stringToBytes(slug))],
  }).catch(() => null)
  if (!row || !row[9]) throw fail(404, 'Pad is not on-chain yet.')
  return row[0]
}

function recordsFor(domain, verification) {
  const apex = domain.split('.').length === 2
  const records = apex
    ? [{ type: 'A', name: '@', value: '76.76.21.21' }]
    : [{ type: 'CNAME', name: domain.split('.')[0], value: 'cname.vercel-dns.com' }]
  for (const v of Array.isArray(verification) ? verification : []) {
    if (v?.type && v?.domain && v?.value) {
      records.push({ type: String(v.type).toUpperCase(), name: String(v.domain), value: String(v.value) })
    }
  }
  return records
}

async function domainState(domain, slug) {
  const { projectId } = vercelEnv()
  const [meta, config] = await Promise.all([
    vercel(`/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}`),
    vercel(`/v6/domains/${encodeURIComponent(domain)}/config`),
  ])
  if (!meta.ok) throw fail(meta.status === 404 ? 404 : 502, meta.json?.error?.message || 'Domain not found on the project.')
  return {
    domain,
    slug,
    verified: Boolean(meta.json.verified),
    configured: config.ok ? !config.json.misconfigured : false,
    records: recordsFor(domain, meta.json.verification),
  }
}

async function addDomain(domain) {
  const { projectId } = vercelEnv()
  const { ok, status, json } = await vercel(`/v10/projects/${projectId}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: domain }),
  })
  if (ok) return json
  const code = json?.error?.code || ''
  if (status === 409 && /already|exists|in_use/i.test(`${code} ${json?.error?.message || ''}`)) {
    if (code === 'domain_already_in_use') throw fail(409, 'That domain is attached to another Vercel project.')
    return null
  }
  throw fail(502, json?.error?.message || 'Vercel rejected the domain.')
}

export async function verifyOwner(body) {
  const slug = String(body.slug || '').trim().toLowerCase()
  const domain = normalizeDomain(body.domain)
  const chain = body.chain === 'arc' ? 'arc' : body.chain === 'robinhood' ? 'robinhood' : null
  const minute = Number(body.minute)
  const signature = String(body.signature || '')
  if (!SLUG.test(slug) || slug.length < 3 || slug.length > 32) throw fail(400, 'Bad slug.')
  const bad = domainError(domain)
  if (bad) throw fail(400, `Bad domain (${bad}).`)
  if (!chain) throw fail(400, 'Unknown chain.')
  if (!Number.isInteger(minute) || Math.abs(Math.floor(Date.now() / 60_000) - minute) > MINUTE_SKEW) {
    throw fail(401, 'Signature expired. Sign again.')
  }
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) throw fail(401, 'Bad signature.')
  const owner = await padOwner(chain, slug)
  const message = `launcher:domain:${slug}:${domain}:${minute}`
  const okSig = await verifyMessage({ address: owner, message, signature }).catch(() => false)
  if (!okSig) throw fail(401, 'Only the pad owner can connect a domain.')
  return { slug, domain, chain, owner }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url || '/', 'http://local')
      const domain = normalizeDomain(url.searchParams.get('domain') || '')
      const bad = domainError(domain)
      if (bad) {
        res.status(400).json({ error: `Bad domain (${bad}).` })
        return
      }
      const map = await readDomains()
      const slug = typeof map[domain] === 'string' ? map[domain] : null
      if (!slug) {
        res.status(404).json({ error: 'Domain is not connected to a pad.' })
        return
      }
      res.status(200).json(await domainState(domain, slug))
      return
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }
    const { slug, domain } = await verifyOwner(req.body || {})
    const map = await readDomains()
    if (map[domain] && map[domain] !== slug) throw fail(409, 'That domain already points at another pad.')
    const added = await addDomain(domain)
    await writeDomain(domain, slug)
    const state = await domainState(domain, slug).catch(() => null)
    res.status(200).json(
      state || {
        domain,
        slug,
        verified: Boolean(added?.verified),
        configured: false,
        records: recordsFor(domain, added?.verification),
      },
    )
  } catch (e) {
    const status = e && typeof e === 'object' && 'status' in e ? Number(e.status) : 500
    res.status(status || 500).json({ error: e instanceof Error ? e.message : 'Domain request failed' })
  }
}
