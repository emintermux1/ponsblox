/** Roblox JSONEncode rejects inf / -inf / NaN. Also drop bigint by rendering strings. */
export function robloxSafe(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(robloxSafe)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = robloxSafe(v)
    return out
  }
  return null
}
