import { useRef, useState } from 'react'
import { Countdown } from './Countdown.tsx'
import { ageLabel } from '../lib/format.ts'
import type { SnapPair } from '../lib/markets.ts'

export function SnapStage({ pair, gone }: { pair: SnapPair; gone: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [broken, setBroken] = useState(false)
  const videoUrl = pair.videoUrl
  const watchUrl = pair.snapUrl || pair.sourceUrl
  const canPlay = Boolean(videoUrl) && !broken
  const quiet = Boolean(pair.videoTitle || pair.videoUrl)

  async function toggle() {
    const el = videoRef.current
    if (!el || !canPlay) {
      if (watchUrl) window.open(watchUrl, '_blank', 'noopener,noreferrer')
      return
    }
    if (!el.paused) {
      el.pause()
      return
    }
    el.muted = true
    try {
      await el.play()
    } catch {
      setBroken(true)
    }
  }

  return (
    <section className={`viewer__snap ${gone ? 'viewer__snap--gone' : ''} ${playing ? 'viewer__snap--live' : ''}`}>
      {canPlay ? (
        <video
          ref={videoRef}
          poster={pair.image}
          src={videoUrl}
          playsInline
          muted
          loop
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setBroken(true)}
        />
      ) : (
        <img src={pair.image} alt="" />
      )}
      <button
        type="button"
        className="viewer__hit"
        onClick={() => void toggle()}
        aria-label={playing ? 'Pause Snap' : canPlay ? 'Play Snap' : 'Watch this Snap'}
      />
      {!playing && (
        <span className="viewer__play" aria-hidden="true">
          <span />
        </span>
      )}
      <div className={`viewer__hud ${playing ? 'viewer__hud--play' : ''}`}>
        <Countdown createdAt={pair.createdAt} tone="dark" />
        <p>{pair.account} · {ageLabel(pair.createdAt)}</p>
        {!quiet && <h1>{pair.name}</h1>}
        {!quiet && pair.caption && <p className="viewer__cap">{pair.caption}</p>}
        {gone && <p className="viewer__gone">The Snap disappeared. The coin doesn’t.</p>}
      </div>
    </section>
  )
}
