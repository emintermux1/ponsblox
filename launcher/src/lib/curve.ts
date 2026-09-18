import type { CurveId } from './copy.ts'

export const PHANTOM = 10
export const SUPPLY = 1_000_000_000

export function phantomOf(id: CurveId): number {
  switch (id) {
    case 0:
      return (PHANTOM * 12) / 10
    case 1:
      return PHANTOM
    case 2:
      return (PHANTOM * 8) / 10
    default: {
      const _n: never = id
      return _n
    }
  }
}

/** Spot quote per token after `quote` in, constant-product from ArcBondingPad. */
export function spotAfter(quote: number, id: CurveId): number {
  const phantom = phantomOf(id)
  const q = Math.max(0, quote)
  const reserveQuote = phantom + q
  const reserveToken = (SUPPLY * phantom) / reserveQuote
  return reserveQuote / reserveToken
}

export function curvePoints(id: CurveId, n = 64, maxQuote = 40): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * maxQuote
    out.push({ x, y: spotAfter(x, id) })
  }
  return out
}
