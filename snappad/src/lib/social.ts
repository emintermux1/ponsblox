export const SITE_URL = 'https://snappad.family'
export const X_HANDLE = 'snappadfamily'
export const X_URL = 'https://x.com/snappadfamily'
export const X_AT = '@snappadfamily'
export const SNAP_CA = '0xd696bd85d42f130e4e15d0e1faafa054b7e5388e'
export const SNAP_CA_SHORT = '0xd696…5388e'

export function isSnapchatUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.replace(/^www\./, '')
    return host === 'snapchat.com' || host === 't.snapchat.com' || host.endsWith('.snapchat.com')
  } catch {
    return false
  }
}

/** Pons website field: public Snapchat profile or Spotlight — never snappad.family. */
export function snapchatWebsite(raw?: string, account?: string): string {
  const url = (raw || '').trim()
  if (isSnapchatUrl(url)) return url
  const handle = (account || '').replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '')
  if (handle) return `https://www.snapchat.com/@${handle}`
  return 'https://www.snapchat.com'
}
