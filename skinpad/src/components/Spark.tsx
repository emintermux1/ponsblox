import { useEffect, useState } from 'react'
import { fetchHistory, type HistoryResponse } from '../lib/api.ts'
import { fmtUsd } from '../lib/format.ts'

function sourceLabel(source: HistoryResponse['source']): string {
  switch (source) {
    case 'steam_history': return 'Steam price history'
    case 'snapshots': return 'SkinPad median snapshots'
    default: {
      const _e: never = source
      return _e
    }
  }
}

/**
 * Real market-value sparkline. Points come from Steam's price history when it
 * is reachable, otherwise from our own accumulated median snapshots. With
 * fewer than 2 real points it says so instead of drawing a fake curve.
 */
export function PriceSpark({ skinId }: { skinId: string }) {
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setData(null)
    setFailed(false)
    void fetchHistory(skinId).then(setData).catch(() => setFailed(true))
  }, [skinId])

  if (failed) return null
  if (!data) return <figure className="spark"><figcaption>Price history</figcaption><p className="muted">Loading…</p></figure>

  const values = data.points.map((p) => p.usd)
  if (values.length < 2) {
    return (
      <figure className="spark">
        <figcaption>Price history</figcaption>
        <p className="muted">Collecting real price points — check back after a few refreshes.</p>
      </figure>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const xy = (v: number, i: number): [number, number] => [
    (i / (values.length - 1)) * 100,
    37 - ((v - min) / span) * 30,
  ]
  const pts = values.map((v, i) => xy(v, i).join(',')).join(' ')
  const [endX, endY] = xy(values[values.length - 1], values.length - 1)
  const first = data.points[0]
  const days = Math.max(1, Math.round((Date.now() - first.t) / 86_400_000))

  return (
    <figure className="spark">
      <figcaption>
        <span>{sourceLabel(data.source)} · last {days}d</span>
        <span className="spark__range">{fmtUsd(min)} – {fmtUsd(max)}</span>
      </figcaption>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-label={`Price from ${fmtUsd(values[0])} to ${fmtUsd(values[values.length - 1])}`}>
        <polyline fill="none" stroke="currentColor" strokeWidth="1.2" points={pts} vectorEffect="non-scaling-stroke" pathLength={100} />
        <circle className="spark__dot" cx={endX} cy={endY} r="1.6" />
      </svg>
    </figure>
  )
}
