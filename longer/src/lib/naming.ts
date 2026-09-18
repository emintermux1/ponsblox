export const LONGER_SUFFIX = ' by LONGER'

export function byLongerName(raw: string): string {
  const base = raw.trim().replace(/\s+by LONGER$/i, '').trim()
  if (!base) return ''
  return `${base}${LONGER_SUFFIX}`
}

export function stripLongerSuffix(name: string): string {
  return name.replace(/\s+by LONGER$/i, '').trim()
}
