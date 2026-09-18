import { useEffect, useState } from 'react'
import { CopyButton } from '../components/CopyButton.tsx'
import { LiveOnPons } from '../components/LiveOnPons.tsx'
import { MomentumBadge, signalFromRepo } from '../components/MomentumBadge.tsx'
import { githubReadmeAssets, Readme } from '../components/Readme.tsx'
import { ErrorState } from '../components/ErrorState.tsx'
import { Spark } from '../components/Spark.tsx'
import { fetchAnalytics, fetchRepoBundle, saveWatch, type RepoDetail, type TokenRow, type VerifiedMaintainer } from '../lib/api.ts'
import { compact, LANG_COLOR, timeAgo, X_URL } from '../lib/format.ts'
import { launchPath, onNavClick } from '../lib/router.ts'
import { useWallet } from '../lib/wallet.tsx'

type Tab = 'overview' | 'activity' | 'token' | 'fees' | 'readme'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'activity', label: 'ACTIVITY' },
  { id: 'token', label: 'TOKEN' },
  { id: 'fees', label: 'FEES' },
  { id: 'readme', label: 'README' },
]

export function Repo({ owner, repo }: { owner: string; repo: string }) {
  const w = useWallet()
  const [tab, setTab] = useState<Tab>('overview')
  const [data, setData] = useState<RepoDetail | null>(null)
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [verified, setVerified] = useState<VerifiedMaintainer | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [watching, setWatching] = useState(false)
  const [stars, setStars] = useState<number[]>([])

  useEffect(() => {
    let live = true
    setData(null)
    setErr(null)
    void fetchRepoBundle(owner, repo)
      .then((row) => {
        if (!live) return
        setData(row.repo)
        setTokens(row.tokens)
        setVerified(row.verified)
      })
      .catch((e: Error) => { if (live) setErr(e.message) })
    return () => { live = false }
  }, [owner, repo])

  useEffect(() => {
    if (!data?.id) return
    void fetchAnalytics({ githubId: data.id, range: '30D' })
      .then((a) => setStars(a.repo.map((p) => p.stars)))
      .catch(() => setStars([]))
  }, [data?.id])

  const canonical = tokens.find((t) => t.kind === 'canonical') || tokens[0] || null
  const sig = data ? signalFromRepo(data) : null

  return (
    <main>
      <section className="repohead">
        <p className="kicker">{owner} · GitPad Trend {data ? `#${data.rank || data.trendScore}` : '—'}</p>
        <h1>{owner}/{repo}</h1>
        {data && <p className="lede">{data.description || 'No description on GitHub.'}</p>}
        <ErrorState error={err} />
        {data?.renamedFrom && <p className="ok">Canonical GitHub id {data.id} — redirected from {data.renamedFrom}.</p>}
        {data?.fork && <p className="err">Fork{data.parentFullName ? ` of ${data.parentFullName}` : ''}. Origin is listed separately.</p>}
        {data?.archived && <p className="err">Archived on GitHub.</p>}
        {data?.disabled && <p className="err">Disabled on GitHub.</p>}
        {data?.mirror && <p className="err">Mirror repository.</p>}
        {verified && (
          <p className="ok">✓ VERIFIED MAINTAINER · {verified.login}. This does not endorse any existing token.</p>
        )}
        {sig && <MomentumBadge signal={sig} explain />}
        <div className="hero__cta">
          <a className="btn btn--lime btn--lg" href={launchPath(data?.owner || owner, data?.name || repo)} onClick={onNavClick(launchPath(data?.owner || owner, data?.name || repo))}>
            {canonical ? 'Launch another' : 'Launch Repository'}
          </a>
          <a className="btn btn--paper btn--lg" href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noreferrer">Official GitHub</a>
          <a className="btn btn--ghost btn--lg" href={`/claim?repo=${owner}/${repo}`} onClick={onNavClick(`/claim?repo=${owner}/${repo}`)}>CLAIM THIS REPOSITORY</a>
          {w.address && data && (
            <button
              type="button"
              className="btn btn--ghost btn--lg"
              disabled={watching}
              onClick={() => {
                void saveWatch({ wallet: w.address, kind: 'repo', owner: data.owner, name: data.name, githubId: data.id, alerts: { trending: true, launch: true } })
                  .then(() => setWatching(true))
              }}
            >
              {watching ? 'Watching' : 'Watch'}
            </button>
          )}
          <CopyButton value={`https://github.com/${owner}/${repo}`} label="Copy repository URL" className="btn btn--ghost btn--lg" />
        </div>
      </section>

      {data && (
        <>
          <div className="tabs tabbar">
            {TABS.map((t) => (
              <button key={t.id} type="button" className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          {tab === 'overview' && (
            <section className="paper">
              <ul className="stats">
                <li><span>Stars</span><b>{compact(data.stars)}</b></li>
                <li><span>7d stars</span><b>{data.stars7d == null ? '—' : `+${compact(data.stars7d)}`}</b></li>
                <li><span>Forks</span><b>{compact(data.forks)}</b></li>
                <li><span>Contributors</span><b>{data.contributors.length}</b></li>
                <li><span>Language</span><b>{data.language || '—'}</b></li>
                <li><span>Pushed</span><b>{timeAgo(data.pushedAt)}</b></li>
              </ul>
              <div className="split">
                <div>
                  <h3>Languages</h3>
                  <ul className="langs">
                    {data.languages.map((l) => (
                      <li key={l.name}>
                        <i style={{ background: LANG_COLOR[l.name] || '#8a867a' }} />
                        {l.name}
                      </li>
                    ))}
                    {!data.languages.length && <li className="muted">No language data.</li>}
                  </ul>
                  <h3>Contributors</h3>
                  <ul className="people">
                    {data.contributors.map((c) => (
                      <li key={c.login}>
                        <img src={c.avatarUrl} alt="" />
                        <a href={c.htmlUrl} target="_blank" rel="noreferrer">{c.login}</a>
                        <em className="mono">{c.contributions}</em>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Star history</h3>
                  {stars.length ? <Spark label="Stars" values={stars} /> : <p className="muted">Star history appears after this repository is read more than once.</p>}
                  <p className="muted">{data.license ? `License ${data.license}` : 'No license detected'} · default {data.defaultBranch}</p>
                </div>
              </div>
            </section>
          )}

          {tab === 'activity' && (
            <section className="paper">
              <h2>GitHub activity</h2>
              <Activity weeks={data.commitActivity} />
              <ul className="tape">
                {data.commits.map((c) => (
                  <li key={c.sha}>
                    <a href={c.htmlUrl} target="_blank" rel="noreferrer"><strong>{c.sha}</strong></a>
                    <em>{c.message} · {c.author} · {timeAgo(c.date)}</em>
                  </li>
                ))}
              </ul>
              {!data.commits.length && <p className="muted">No recent commits returned.</p>}
            </section>
          )}

          {tab === 'token' && (
            <section className="ink">
              <header className="sec">
                <div>
                  <p className="kicker">CODE → TOKEN</p>
                  <h2>GitPad token</h2>
                </div>
                <LiveOnPons />
              </header>
              {!tokens.length && (
                <div className="status">
                  <p className="kicker">NOT YET TOKENIZED</p>
                  <p>THIS REPOSITORY HAS NOT BEEN TOKENIZED</p>
                  <a className="btn btn--lime" href={launchPath(owner, repo)} onClick={onNavClick(launchPath(owner, repo))}>Launch Repository</a>
                </div>
              )}
              {tokens.map((t) => (
                <div className="status" key={t.address}>
                  <p className="kicker">{t.kind === 'canonical' ? 'Canonical GitPad token' : t.kind === 'community' ? 'Community token' : 'Unverified token'}</p>
                  <p><strong>{t.displayName}</strong> <span className="mono">${t.symbol}</span></p>
                  <p className="mono">{t.address}</p>
                  <p>{new Date(t.deployedAt).toLocaleString()}</p>
                  <div className="hero__cta">
                    <a className="btn btn--lime" href={`/token/${t.address}`} onClick={onNavClick(`/token/${t.address}`)}>Open token</a>
                    <a className="btn btn--paper" href={X_URL} target="_blank" rel="noreferrer">X</a>
                    <CopyButton value={t.address} label="Copy CA" />
                  </div>
                </div>
              ))}
            </section>
          )}

          {tab === 'fees' && (
            <section className="paper">
              <h2>Fees</h2>
              {canonical ? (
                <>
                  <p>Fee routes and distributions live on the token page. A verified maintainer badge is not an endorsement of {canonical.displayName}.</p>
                  <a className="btn btn--ink" href={`/fees/${canonical.address}`} onClick={onNavClick(`/fees/${canonical.address}`)}>Open fee desk</a>
                </>
              ) : (
                <p>No GitPad token — no fee desk.</p>
              )}
            </section>
          )}

          {tab === 'readme' && (
            <section className="paper">
              <h2>README</h2>
              <Readme markdown={data.readme} assets={githubReadmeAssets(data.owner, data.name)} />
            </section>
          )}
        </>
      )}
    </main>
  )
}

function Activity({ weeks }: { weeks: { week: number; total: number }[] }) {
  const slice = weeks.slice(-26)
  const max = Math.max(1, ...slice.map((w) => w.total))
  if (!slice.length) return <p className="muted">Activity heatmap is still warming on GitHub.</p>
  return (
    <div className="bars" aria-label="Weekly commits">
      {slice.map((w) => (
        <i key={w.week} style={{ height: `${Math.max(8, Math.round((w.total / max) * 72))}px` }} title={`${w.total} commits`} />
      ))}
    </div>
  )
}
