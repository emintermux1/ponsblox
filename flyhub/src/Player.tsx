import { useEffect } from 'react'
import { ClipScene } from './ClipScene.tsx'
import { formatTime, formatViews, kindLabel, relatedTo, type Clip } from './clips.ts'

type Props = {
  clip: Clip
  tMs: number
  onClose: () => void
  onOpen: (clip: Clip) => void
}

export function Player({ clip, tMs, onClose, onOpen }: Props) {
  const related = relatedTo(clip)
  const bump = Math.floor(tMs / 900)

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="player" role="dialog" aria-modal="true" aria-label={clip.title}>
      <div className="player-scrim" onClick={onClose} />
      <div className="player-sheet">
        <header className="player-bar">
          <img src="/logo.png" alt="FlyHub" />
          <button type="button" className="player-x" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="player-stage">
          <ClipScene kind={clip.kind} seed={clip.id} detail="player" />
          <span className="thumb-hd">HD</span>
          <span className="thumb-live">LIVE</span>
        </div>
        <div className="player-meta">
          <h2>{clip.title}</h2>
          <p>
            <em>{kindLabel(clip.kind)}</em>
            <span>{formatViews(clip.views + bump)} views</span>
            <span>{formatTime(clip.mins, clip.secs)}</span>
          </p>
        </div>
        <div className="player-related">
          <p className="kicker">Related mating clips</p>
          <div className="player-rail">
            {related.map((row) => (
              <button type="button" key={row.id} className="thumb" onClick={() => onOpen(row)}>
                <div className="thumb-art">
                  <ClipScene kind={row.kind} seed={row.id} />
                  <span className="thumb-time">{formatTime(row.mins, row.secs)}</span>
                </div>
                <h3>{row.title}</h3>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
