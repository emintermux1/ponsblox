export const RESERVED_SLUGS = new Set([
  'www',
  'app',
  'api',
  'studio',
  'docs',
  'launcher',
  'p',
  'preview',
  'staging',
])

export type SlugError = 'length' | 'charset' | 'reserved' | 'hyphen'

export function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase()
}

export function slugError(raw: string): SlugError | null {
  const slug = normalizeSlug(raw)
  if (slug.length < 3 || slug.length > 32) return 'length'
  if (slug.startsWith('-') || slug.endsWith('-')) return 'hyphen'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'charset'
  if (RESERVED_SLUGS.has(slug)) return 'reserved'
  return null
}

export function assertSlug(raw: string): string {
  const slug = normalizeSlug(raw)
  const err = slugError(slug)
  if (err) throw new Error(err)
  return slug
}
