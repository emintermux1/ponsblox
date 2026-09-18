import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Countdown } from './Countdown.tsx'
import { watchFeedTile } from '../lib/feedAutoplay.ts'
import type { SnapPair } from '../lib/markets.ts'

export function SnapTile({ pair, hero = false, wide = false, index = 0, live = false, priority = false, lcp = false }: {
  pair: SnapPair
  hero?: boolean
  wide?: boolean
  index?: number
  live?: boolean
  priority?: boolean
  lcp?: boolean
}) {
  const tileRef = useRef<HTMLAnchorElement>(null)
  const [armed, setArmed] = useState(false)
  const [on, setOn] = useState(false)
  const canLive = live && Boolean(pair.videoUrl)
  const cls = ['tile', hero ? 'tile--hero' : '', wide ? 'tile--wide' : '', on ? 'tile--on' : ''].filter(Boolean).join(' ')
  const title = pair.videoTitle || `${pair.name} $${pair.ticker}`

  useEffect(() => {
    if (!canLive) return
    const tile = tileRef.current
    if (!tile) return
    return watchFeedTile(tile, {
      onArm: () => setArmed(true),
      onDisarm: () => { setArmed(false); setOn(false) },
    })
  }, [canLive])

  return (
    <Link
      ref={tileRef}
      className={cls}
      to={`/s/${pair.id}`}
      style={{ '--i': String(index) } as CSSProperties}
    >
      <img
        src={pair.image}
        alt=""
        loading={priority || lcp ? 'eager' : 'lazy'}
        fetchPriority={lcp ? 'high' : 'auto'}
        decoding="async"
        onError={(e) => { e.currentTarget.src = '/brand/ghost.png' }}
      />
      {armed && pair.videoUrl && (
        <video
          className={on ? 'is-on' : ''}
          poster={pair.image}
          src={pair.videoUrl}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          onPlay={() => setOn(true)}
          onPause={() => setOn(false)}
        />
      )}
      <div className="tile__shade">
        <span>{pair.account} · ${pair.ticker}</span>
        <strong>{title}</strong>
        <Countdown createdAt={pair.createdAt} tone="dark" compact />
      </div>
    </Link>
  )
}
