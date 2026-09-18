import { ClipScene } from './ClipScene.tsx'
import { formatTime, formatViews, kindLabel, type Clip } from './clips.ts'

type Props = {
  clips: Clip[]
  tMs: number
  onOpen: (clip: Clip) => void
}

export function HubGrid({ clips, tMs, onOpen }: Props) {
  const bump = Math.floor(tMs / 900)
  return (
    <div className="hub-grid">
      {clips.map((clip) => (
        <button type="button" key={clip.id} className="thumb" onClick={() => onOpen(clip)}>
          <div className="thumb-art">
            <ClipScene kind={clip.kind} seed={clip.id} />
            <span className="thumb-time">{formatTime(clip.mins, clip.secs)}</span>
            {clip.hd ? <span className="thumb-hd">HD</span> : null}
            <span className="thumb-live">LIVE</span>
          </div>
          <h3>{clip.title}</h3>
          <p>
            <em>{kindLabel(clip.kind)}</em>
            <span>{formatViews(clip.views + bump)} views</span>
          </p>
        </button>
      ))}
    </div>
  )
}
