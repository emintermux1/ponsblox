import { RESERVED_SLUGS, slugError } from './slug.ts'

export type HostKind = 'studio' | 'tenant'

export type TenantResolve = {
  kind: HostKind
  slug: string | null
}

const APEX = ['launcher.family', 'www.launcher.family', 'localhost', '127.0.0.1']

function hostName(host: string): string {
  return host.trim().toLowerCase().split(':')[0] ?? ''
}

export function tenantFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/p\/([a-z0-9-]{3,32})\/?$/i)
  if (!m?.[1]) return null
  const slug = m[1].toLowerCase()
  return slugError(slug) ? null : slug
}

export function tenantFromHost(host: string): string | null {
  const h = hostName(host)
  if (!h) return null
  if (APEX.includes(h)) return null
  if (h.endsWith('.localhost')) {
    const slug = h.slice(0, -'.localhost'.length)
    if (RESERVED_SLUGS.has(slug) || slugError(slug)) return null
    return slug
  }
  if (h.endsWith('.launcher.family')) {
    const slug = h.slice(0, -'.launcher.family'.length)
    if (RESERVED_SLUGS.has(slug) || slugError(slug)) return null
    return slug
  }
  return null
}

export function resolveTenant(host: string, pathname: string): TenantResolve {
  const fromPath = tenantFromPath(pathname)
  if (fromPath) return { kind: 'tenant', slug: fromPath }
  const fromHost = tenantFromHost(host)
  if (fromHost) return { kind: 'tenant', slug: fromHost }
  return { kind: 'studio', slug: null }
}

export function tenantUrl(slug: string, origin?: string): string {
  const o = origin || (typeof location !== 'undefined' ? location.origin : 'http://localhost:5190')
  try {
    const u = new URL(o)
    if (u.hostname === 'launcher.family' || u.hostname === 'www.launcher.family') {
      return `https://${slug}.launcher.family/`
    }
    if (u.hostname.endsWith('.launcher.family')) {
      return `https://${slug}.launcher.family/`
    }
  } catch {
    /* local */
  }
  return `${o.replace(/\/$/, '')}/p/${slug}`
}

/** Apex studio origin so wildcard tenants do not link Studio to themselves. */
export function studioOrigin(origin?: string): string {
  const o = origin || (typeof location !== 'undefined' ? location.origin : 'http://localhost:5190')
  try {
    const u = new URL(o)
    if (u.hostname.endsWith('.launcher.family')) return 'https://launcher.family'
    if (u.hostname.endsWith('.localhost')) {
      return `${u.protocol}//localhost${u.port ? `:${u.port}` : ''}`
    }
  } catch {
    /* local */
  }
  return o.replace(/\/$/, '')
}

export function studioUrl(origin?: string): string {
  return `${studioOrigin(origin)}/`
}

export function padsUrl(origin?: string): string {
  return `${studioOrigin(origin)}/pads`
}
