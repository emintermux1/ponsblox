import { githubReadmeAssets, Readme } from './Readme.tsx'
import type { RepoDetail } from '../lib/api.ts'
import { compact, LANG_COLOR, timeAgo } from '../lib/format.ts'

export function RepoDossier({
  detail,
  compactReadme = true,
}: {
  detail: RepoDetail
  compactReadme?: boolean
}) {
  const created = new Date(detail.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return (
    <div className="dossier">
      <div className="dossier__head">
        <img src={detail.avatarUrl} alt="" width={48} height={48} />
        <div>
          <strong>{detail.owner}/{detail.name}</strong>
          <p>{detail.description || 'No description on GitHub.'}</p>
        </div>
      </div>
      <ul className="stats">
        <li><span>Stars</span><b>{compact(detail.stars)}</b></li>
        <li><span>Forks</span><b>{compact(detail.forks)}</b></li>
        <li><span>Watchers</span><b>{compact(detail.subscribers || detail.watchers)}</b></li>
        <li><span>Language</span><b>{detail.language || '—'}</b></li>
        <li><span>Created</span><b>{created}</b></li>
        <li><span>7d growth</span><b>{detail.stars7d == null ? '—' : `+${compact(detail.stars7d)}`}</b></li>
      </ul>
      {detail.languages.length > 0 && (
        <ul className="langs">
          {detail.languages.map((l) => (
            <li key={l.name}>
              <i style={{ background: LANG_COLOR[l.name] || '#8a867a' }} />
              {l.name}
            </li>
          ))}
        </ul>
      )}
      {detail.contributors.length > 0 && (
        <>
          <h3>Contributors</h3>
          <ul className="people">
            {detail.contributors.slice(0, 8).map((c) => (
              <li key={c.login}>
                <img src={c.avatarUrl} alt="" />
                <a href={c.htmlUrl} target="_blank" rel="noreferrer">{c.login}</a>
                <em className="mono">{c.contributions}</em>
              </li>
            ))}
          </ul>
        </>
      )}
      {detail.latestRelease && (
        <p className="mono">
          Latest release {detail.latestRelease.tag}
          {detail.latestRelease.publishedAt ? ` · ${timeAgo(detail.latestRelease.publishedAt)}` : ''}
        </p>
      )}
      {detail.commits.length > 0 && (
        <>
          <h3>Recent commits</h3>
          <ul className="pick">
            {detail.commits.slice(0, 5).map((c) => (
              <li key={c.sha}>
                <span className="mono">{c.sha}</span> {c.message}
                <em className="muted"> {c.author} · {timeAgo(c.date)}</em>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3>README</h3>
      <Readme
        markdown={compactReadme ? detail.readme.slice(0, 2500) : detail.readme}
        assets={githubReadmeAssets(detail.owner, detail.name)}
      />
    </div>
  )
}
