import { useState } from 'react'
import { DEMO_MONTH, DEMO_NAME, SUBJECT, YT_EMBED, YT_ID } from './lore.ts'

const STILL = `https://i.ytimg.com/vi/${YT_ID}/maxresdefault.jpg`
const STILL_FALLBACK = `https://i.ytimg.com/vi/${YT_ID}/hqdefault.jpg`
const PLAY_SRC = `${YT_EMBED}?autoplay=1&rel=0&modestbranding=1&playsinline=1`

export function LiveFeed({ panel = false }: { panel?: boolean }) {
  const [play, setPlay] = useState(false)

  return (
    <section className={panel ? 'film film--panel' : 'film'} id="live">
      <img
        className="film-still"
        src={STILL}
        alt={`${SUBJECT} · ${DEMO_NAME}`}
        onError={(ev) => {
          ev.currentTarget.src = STILL_FALLBACK
        }}
      />
      {play ? (
        <iframe
          className="film-frame"
          src={PLAY_SRC}
          title={`LIVE · Neuralink · ${SUBJECT} · ${DEMO_NAME}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button type="button" className="film-hit" onClick={() => setPlay(true)}>
          Play live Neuralink data
        </button>
      )}
      <div className="film-veil" aria-hidden />
      <div className="film-copy">
        <p className="film-live">
          <span className="live-dot" aria-hidden />
          Live Neuralink data
        </p>
        <h1>{SUBJECT}</h1>
        <p className="film-sub">
          {DEMO_NAME}
          <em> · {DEMO_MONTH}</em>
        </p>
        {play ? null : (
          <button type="button" className="film-play" onClick={() => setPlay(true)}>
            Play
          </button>
        )}
      </div>
    </section>
  )
}
