import type { WalletClient } from 'viem'
import type { SupportedChain } from './chain.ts'

export type DomainError = 'empty' | 'length' | 'charset' | 'tld' | 'reserved'

export type DnsRecord = {
  type: 'CNAME' | 'A' | 'TXT'
  name: string
  value: string
}

export type DomainStatus = {
  domain: string
  slug: string
  verified: boolean
  configured: boolean
  records: DnsRecord[]
}

const MAX_DOMAIN = 253
const MAX_LABEL = 63
const LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
/** Hosts we serve ourselves or that nobody can point at us. */
const RESERVED_SUFFIXES = ['launcher.family', 'localhost', 'vercel.app', 'vercel-dns.com']

export function normalizeDomain(raw: string): string {
  let h = raw.trim().toLowerCase()
  h = h.replace(/^https?:\/\//, '')
  h = h.split('/')[0] ?? ''
  h = h.split(':')[0] ?? ''
  return h.replace(/\.$/, '')
}

export function domainError(raw: string): DomainError | null {
  const host = normalizeDomain(raw)
  if (!host) return 'empty'
  if (host.length > MAX_DOMAIN) return 'length'
  const labels = host.split('.')
  if (labels.length < 2) return 'tld'
  for (const label of labels) {
    if (!label || label.length > MAX_LABEL) return 'length'
    if (!LABEL.test(label)) return 'charset'
  }
  const tld = labels[labels.length - 1]
  if (!/^[a-z]{2,63}$/.test(tld)) return 'tld'
  for (const suffix of RESERVED_SUFFIXES) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return 'reserved'
  }
  return null
}

export function domainMessage(err: DomainError): string {
  switch (err) {
    case 'empty':
      return 'Type a domain.'
    case 'length':
      return 'That domain is too long.'
    case 'charset':
      return 'Use letters, digits and hyphens only.'
    case 'tld':
      return 'Use a full domain like pad.example.com.'
    case 'reserved':
      return 'That domain is already served by LAUNCHER.'
    default: {
      const _n: never = err
      return _n
    }
  }
}

/** Apex domains need an A record; anything deeper is a CNAME. */
export function isApex(host: string): boolean {
  return normalizeDomain(host).split('.').length === 2
}

export function unixMinute(now = Date.now()): number {
  return Math.floor(now / 60_000)
}

/** The exact text the wallet signs; the server rebuilds and verifies it. */
export function domainMessageToSign(slug: string, domain: string, minute: number): string {
  return `launcher:domain:${slug}:${domain}:${minute}`
}

/** Hosts we cannot resolve locally and must ask /api/resolve about. */
export function isCustomHost(host: string): boolean {
  const h = normalizeDomain(host)
  if (!h) return false
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost')) return false
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return false
  for (const suffix of ['launcher.family', 'vercel.app']) {
    if (h === suffix || h.endsWith(`.${suffix}`)) return false
  }
  return true
}

type ApiError = { error?: string }

async function readJson<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as T & ApiError
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status}).`)
  return json
}

export async function resolveCustomHost(host: string): Promise<string | null> {
  if (!isCustomHost(host)) return null
  try {
    const res = await fetch(`/api/resolve?host=${encodeURIComponent(normalizeDomain(host))}`)
    if (!res.ok) return null
    const json = (await res.json()) as { slug?: string }
    return typeof json.slug === 'string' && json.slug ? json.slug : null
  } catch {
    return null
  }
}

export async function connectDomain(
  wallet: WalletClient,
  account: `0x${string}`,
  input: { slug: string; domain: string; chain: SupportedChain },
): Promise<DomainStatus> {
  const domain = normalizeDomain(input.domain)
  const err = domainError(domain)
  if (err) throw new Error(domainMessage(err))
  const minute = unixMinute()
  const signature = await wallet.signMessage({
    account,
    message: domainMessageToSign(input.slug, domain, minute),
  })
  const res = await fetch('/api/domain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: input.slug, domain, chain: input.chain, minute, signature }),
  })
  return readJson<DomainStatus>(res)
}

export async function domainStatus(domain: string): Promise<DomainStatus> {
  const res = await fetch(`/api/domain?domain=${encodeURIComponent(normalizeDomain(domain))}`)
  return readJson<DomainStatus>(res)
}
