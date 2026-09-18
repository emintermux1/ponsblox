export type SparkPoint = { t: number; n: number }

export type Bar = { x: number; y: number; w: number; h: number; n: number }

export function niceCeil(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 1
  const exp = 10 ** Math.floor(Math.log10(n))
  const m = n / exp
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10
  return nice * exp
}

export function barLayout(values: number[], width = 100, height = 100): {
  bars: Bar[]
  max: number
} {
  const max = niceCeil(Math.max(0, ...values))
  if (values.length === 0 || max <= 0) return { bars: [], max }
  const slot = width / values.length
  const gap = values.length > 24 ? 0.35 : values.length > 8 ? 1 : 2
  const cap = values.length <= 8 ? 7 : values.length <= 20 ? 4 : slot
  const w = Math.min(cap, Math.max(0.6, slot - gap))
  const bars = values.map((n, i) => {
    const h = (Math.max(0, n) / max) * height
    return { x: i * slot + (slot - w) / 2, y: height - h, w, h, n }
  })
  return { bars, max }
}

export function shareOf(n: number, max: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(max) || max <= 0) return 0
  return Math.max(0, Math.min(1, n / max))
}

export function sinceLabel(t: number, now = Date.now()): string {
  const s = Math.max(0, now - t)
  if (s < 45_000) return 'now'
  if (s < 90 * 60_000) return `${Math.max(1, Math.round(s / 60_000))}m ago`
  if (s < 36 * 3_600_000) return `${Math.max(1, Math.round(s / 3_600_000))}h ago`
  return `${Math.max(1, Math.round(s / 86_400_000))}d ago`
}
