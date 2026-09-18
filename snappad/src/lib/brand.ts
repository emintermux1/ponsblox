import { SITE_URL } from './social.ts'

export const SNAP_PAD_PREFIX = 'By SnapPad'
export const DEFAULT_LOGO = `${SITE_URL}/brand/mark.jpg`

export function bySnapPadName(raw: string): string {
  const name = raw.trim()
  if (!name) return SNAP_PAD_PREFIX
  if (/^by\s+snappad\b/i.test(name)) {
    return name.replace(/^by\s+snappad\b/i, SNAP_PAD_PREFIX)
  }
  return `${SNAP_PAD_PREFIX} ${name}`
}

/** Pons stores the logo URL string (https, ≤512 bytes) — never a localhost or CDN blob. */
export function onchainLogoUrl(path?: string): string {
  const raw = (path || '').trim()
  if (/^https:\/\//i.test(raw) && new TextEncoder().encode(raw).length <= 512) return raw
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    const hosted = `${SITE_URL}${raw}`
    if (new TextEncoder().encode(hosted).length <= 512) return hosted
  }
  return DEFAULT_LOGO
}
