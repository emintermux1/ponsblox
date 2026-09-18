import { useState } from 'react'
import { CopyButton } from './CopyButton.tsx'
import { gitpadUrl, shareIntentUrl } from '../lib/copy.ts'
import { trackLaunch } from '../lib/launchEvents.ts'
import { defaultLaunchPost, layoutForFormat, shareOgSrc, type ShareFormat } from '../lib/share.ts'
import { onNavClick } from '../lib/router.ts'
import { txUrl } from '../lib/chain.ts'

const FORMATS: { id: ShareFormat; label: string }[] = [
  { id: 'x', label: 'X landscape' },
  { id: 'square', label: 'X square' },
  { id: 'og', label: 'OpenGraph' },
]

export function ShareStudio({
  name,
  symbol,
  owner,
  repo,
  token,
  hash,
  stars,
  rank,
}: {
  name: string
  symbol: string
  owner: string
  repo: string
  token: string
  hash?: string
  stars?: number | null
  rank?: number | null
}) {
  const [format, setFormat] = useState<ShareFormat>('x')
  const [draft, setDraft] = useState(() => defaultLaunchPost({
    displayName: name,
    symbol,
    owner,
    repo,
    token,
    stars,
  }))
  const [reviewed, setReviewed] = useState(false)
  const layout = layoutForFormat(format)
  const og = shareOgSrc({
    layout,
    title: name,
    ticker: `$${symbol}`,
    repo: `${owner}/${repo}`,
    stars: stars != null ? `${stars.toLocaleString('en-US')} GitHub Stars` : '',
    contract: token,
    rank: rank != null ? String(rank) : undefined,
  })
  const link = gitpadUrl(`/token/${token}`)

  return (
    <section className="share">
      <p className="kicker">Share card</p>
      <h2>Review before you post.</h2>
      <div className="tabs">
        {FORMATS.map((l) => (
          <button key={l.id} type="button" className={format === l.id ? 'is-on' : ''} onClick={() => setFormat(l.id)}>
            {l.label}
          </button>
        ))}
      </div>
      <img src={og} alt={`${format} share card`} width={format === 'square' ? 600 : 600} height={format === 'square' ? 600 : 315} />
      <label>
        Suggested X copy
        <textarea
          className="field share__draft"
          rows={8}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setReviewed(false)
          }}
        />
      </label>
      <label className="check">
        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
        I reviewed this post. GitPad will not send it for me.
      </label>
      <div className="hero__cta">
        <a
          className={`btn btn--lime ${reviewed ? '' : 'is-off'}`}
          href={reviewed ? shareIntentUrl(draft) : undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!reviewed}
          onClick={(e) => {
            if (!reviewed) { e.preventDefault(); return }
            trackLaunch('share_clicked')
          }}
        >
          Share on X
        </a>
        <CopyButton value={draft} label="Copy Text" />
        <CopyButton value={token} label="Copy CA" />
        <CopyButton value={link} label="Copy GitPad Link" />
        {hash && (
          <a className="btn btn--ghost btn--sm" href={txUrl(hash)} target="_blank" rel="noreferrer">View Transaction</a>
        )}
        <a className="btn btn--paper btn--sm" href={`/token/${token}`} onClick={onNavClick(`/token/${token}`)}>View Token</a>
      </div>
      <p className="muted">Nothing is posted automatically. Share on X only opens an intent after you review the copy.</p>
    </section>
  )
}
