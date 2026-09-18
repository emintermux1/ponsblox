import { RepoDossier } from '../RepoDossier.tsx'
import type { RepoCard, RepoDetail, TokenRow } from '../../lib/api.ts'
import { compact } from '../../lib/format.ts'
import { onNavClick } from '../../lib/router.ts'

export function RepoConfirm({
  owner,
  name,
  detail,
  hint,
  resolving,
  failed,
  canonical,
  onUse,
  onCommunity,
}: {
  owner: string
  name: string
  detail: RepoDetail | null
  hint: RepoCard | null
  resolving: boolean
  failed: boolean
  canonical: TokenRow | null
  onUse: () => void
  onCommunity: () => void
}) {
  const row = detail || hint
  if (!row && !resolving && !failed) return null
  if (!row && failed) {
    return (
      <div className="rconfirm">
        <p className="kicker">UNRESOLVED</p>
        <h2>{owner}/{name}</h2>
        <p className="err">GitHub has not confirmed this repository yet. GitPad will not continue without a canonical id.</p>
      </div>
    )
  }
  return (
    <div className={`rconfirm${detail ? ' rconfirm--ready' : ''}`}>
      <p className="kicker">
        {canonical ? 'ALREADY TOKENIZED' : resolving && !detail ? 'RESOLVING' : 'AVAILABLE TO LAUNCH'}
        {detail && <span className="tick" aria-hidden> ✓</span>}
      </p>
      {row && (
        <>
          <div className="rconfirm__head">
            <img src={row.avatarUrl} alt="" width={56} height={56} />
            <div>
              <h2>{row.owner}/{row.name}</h2>
              <p>{compact(row.stars)} stars · {compact(row.forks)} forks · {row.language || '—'}</p>
            </div>
          </div>
          <p className="mono">
            {row.rank ? `TRENDING #${row.rank}` : `GitPad Trend ${row.trendScore}`}
            {detail ? ` · GitHub id ${detail.id}` : ''}
            {detail?.stars7d != null ? ` · ↑ +${compact(detail.stars7d)} / 7D` : row.stars7d != null ? ` · ↑ +${compact(row.stars7d)} / 7D` : ''}
          </p>
          {row.description && <p>{row.description}</p>}
        </>
      )}
      {canonical && (
        <>
          <p>{canonical.displayName} ${canonical.symbol}</p>
          <p className="mono break">CA: {canonical.address}</p>
          <div className="hero__cta">
            <a className="btn btn--lime" href={`/token/${canonical.address}`} onClick={onNavClick(`/token/${canonical.address}`)}>View Token</a>
            <button type="button" className="btn btn--ghost" onClick={onCommunity}>Launch community token</button>
          </div>
          <p className="muted">A community launch is explicit. GitPad will not silently mint another canonical.</p>
        </>
      )}
      {!canonical && row && (
        <>
          {!detail && resolving && (
            <p className="muted">Resolving canonical GitHub id…</p>
          )}
          {!detail && failed && (
            <p className="err">GitHub has not confirmed this repository yet. GitPad will not continue without a canonical id.</p>
          )}
          <button type="button" className="btn btn--lime btn--lg" disabled={!detail} onClick={onUse}>
            Use this repository
          </button>
        </>
      )}
      {detail && <RepoDossier detail={detail} />}
    </div>
  )
}
