export function walkSeries(seed: number, points = 80): number[] {
  const out: number[] = []
  let v = 0.42 + (seed % 9) * 0.07
  for (let i = 0; i < points; i++) {
    v += Math.sin((i + seed) / 6) * 0.028 + ((seed * (i + 3)) % 7) * 0.0032 - 0.011
    out.push(Math.max(0.06, v))
  }
  return out
}

export function markSeries(price: number, seed: string, points = 56): number[] {
  const s = seed.split('').reduce((n, c) => n + c.charCodeAt(0), 0)
  const out: number[] = []
  for (let i = 0; i < points; i++) {
    const wobble = Math.sin((i + s) / 7) * 0.01 + (((s * (i + 1)) % 5) - 2) * 0.0012
    out.push(Math.max(price * 0.9, price * (1 + wobble)))
  }
  return out
}

export function stepSeries(prev: number[], t: number): number[] {
  if (prev.length < 2) return prev
  const last = prev[prev.length - 1]
  const wave = Math.sin(t / 430) * last * 0.01
  const tick = ((t % 19) - 9) * last * 0.0007
  return [...prev.slice(1), Math.max(last * 0.45, last + wave + tick)]
}
