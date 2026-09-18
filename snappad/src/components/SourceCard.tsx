import { X_AT, X_URL } from '../lib/social.ts'
import type { SnapKind } from '../lib/snap.ts'

type Props = {
  image: string
  account: string
  ticker: string
  name: string
  caption: string
  timestamp: string
  kind: SnapKind
  sourceUrl?: string
}

export function SourceCard({ image, account, ticker, name, caption, timestamp, kind, sourceUrl }: Props) {
  return (
    <article className="source">
      <div className="source__shot">
        <img src={image} alt="" onError={(e) => { e.currentTarget.src = '/brand/ghost.png' }} />
      </div>
      <div className="source__meta">
        <p className="source__kicker">Original Snap</p>
        <h3>{name} <span>${ticker}</span></h3>
        <dl>
          <div><dt>Account</dt><dd>{account}</dd></div>
          <div><dt>When</dt><dd>{timestamp}</dd></div>
          <div><dt>Type</dt><dd>{kind}</dd></div>
          <div>
            <dt>Pair</dt>
            <dd>${ticker} / $SNAP</dd>
          </div>
        </dl>
        {caption && <p className="source__cap">{caption}</p>}
        <p className="source__links">
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noreferrer">Snapchat</a>
          )}
          <a href={X_URL} target="_blank" rel="noreferrer">{X_AT}</a>
        </p>
      </div>
    </article>
  )
}
