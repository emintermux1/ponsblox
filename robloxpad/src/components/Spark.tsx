import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { fetchHistory, type HistoryResponse } from '../lib/api.ts'
import { barLayout, sinceLabel } from '../lib/chart.ts'
import { formatPlayers } from '../lib/games.ts'
import { ease, stagger } from '../lib/motion.ts'

function sourceLabel(source: HistoryResponse['source']): string {
  switch (source) {
    case 'snapshots': return 'Playing'
    default: {
      const _e: never = source
      return _e
    }
  }
}

function signedPlayers(n: number): string {
  if (n === 0) return '0'
  return `${n > 0 ? '+' : '−'}${formatPlayers(Math.abs(n))}`
}

export function PlayerSpark({
  gameId,
  playing,
}: {
  gameId: string
  playing?: number
  likeRatio?: number
}) {
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const reduce = useReducedMotion()

  useEffect(() => {
    setData(null)
    setFailed(false)
    void fetchHistory(gameId).then(setData).catch(() => setFailed(true))
  }, [gameId])

  if (failed && playing == null) return null

  if (!data && !failed) {
    return (
      <figure className="spark">
        <figcaption>Playing</figcaption>
        {playing != null && <p className="spark__now"><strong>{formatPlayers(playing)}</strong></p>}
        <p className="muted">Loading…</p>
      </figure>
    )
  }

  const points = [...(data?.points || [])]
  if (playing != null && (points.length === 0 || points[points.length - 1].n !== playing)) {
    points.push({ t: Date.now(), n: playing })
  }

  const last = points[points.length - 1]
  const first = points[0]
  const now = last?.n ?? playing ?? 0

  if (points.length < 2) {
    return (
      <figure className="spark">
        <figcaption>Playing now</figcaption>
        <p className="spark__now"><strong>{formatPlayers(now)}</strong></p>
        <p className="muted">One reading so far. More bars appear as CCU is snapshotted.</p>
      </figure>
    )
  }

  const { bars, max } = barLayout(points.map((p) => p.n))
  const delta = now - first.n
  const mid = max / 2

  return (
    <figure className="spark">
      <figcaption>
        <span>{data ? sourceLabel(data.source) : 'Playing'}</span>
        <span className="spark__range">
          {delta === 0 ? 'unchanged' : `${signedPlayers(delta)} · ${sinceLabel(first.t)}`}
        </span>
      </figcaption>
      <p className="spark__now"><strong>{formatPlayers(now)}</strong></p>
      <div className="chart">
        <div className="chart__y" aria-hidden>
          <span>{formatPlayers(max)}</span>
          <span>{formatPlayers(mid)}</span>
          <span>0</span>
        </div>
        <svg className="chart__plot" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Playing ${formatPlayers(now)}, scale 0 to ${formatPlayers(max)}`}>
          <line className="chart__grid" x1="0" y1="0" x2="100" y2="0" />
          <line className="chart__grid" x1="0" y1="50" x2="100" y2="50" />
          <line className="chart__grid" x1="0" y1="100" x2="100" y2="100" />
          {bars.map((b, i) => (
            <motion.rect
              key={`${points[i].t}-${b.n}`}
              className="chart__bar"
              x={b.x}
              width={b.w}
              initial={reduce ? false : { y: 100, height: 0 }}
              animate={{ y: b.y, height: Math.max(b.h, 0.4) }}
              transition={{ duration: 0.45, ease, delay: stagger(i, 16, 0.03) }}
            />
          ))}
        </svg>
      </div>
      <div className="chart__x">
        <span>{sinceLabel(first.t)}</span>
        <span>{points.length} readings</span>
        <span>now</span>
      </div>
    </figure>
  )
}
