export function seedFrom(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function next(state: number): number {
  let x = state
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  return x >>> 0
}

export function sparkSeries(id: string, n = 28, start = 1): number[] {
  let s = seedFrom(id)
  const out: number[] = []
  let v = start
  for (let i = 0; i < n; i++) {
    s = next(s)
    const drift = ((s % 1000) / 1000 - 0.46) * 0.08
    v = Math.max(0.12, v * (1 + drift))
    out.push(v)
  }
  return out
}

export function candleSeries(id: string, n = 48): { o: number; h: number; l: number; c: number }[] {
  let s = seedFrom(`${id}:candles`)
  const out: { o: number; h: number; l: number; c: number }[] = []
  let c = 1
  for (let i = 0; i < n; i++) {
    s = next(s)
    const o = c
    const move = ((s % 1000) / 1000 - 0.48) * 0.12
    c = Math.max(0.08, o * (1 + move))
    s = next(s)
    const w = 0.015 + ((s % 1000) / 1000) * 0.04
    const h = Math.max(o, c) * (1 + w)
    const l = Math.min(o, c) * (1 - w)
    out.push({ o, h, l, c })
  }
  return out
}

export function pathFrom(values: number[], w = 120, h = 36): string {
  if (!values.length) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 2) - 1
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}
