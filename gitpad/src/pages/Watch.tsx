import { useEffect, useMemo, useState } from 'react'
import { EmptyState, ErrorState } from '../components/ErrorState.tsx'
import { fetchActivity, fetchFirst, fetchWatch, saveWatch, type ActivityEvent, type BoardRow, type WatchItem } from '../lib/api.ts'
import { timeAgoMs } from '../lib/format.ts'
import { launchPath, onNavClick } from '../lib/router.ts'
import { useWallet } from '../lib/wallet.tsx'

type Dash = 'watching' | 'tokens' | 'activity' | 'first'

function matches(item: WatchItem, e: ActivityEvent): boolean {
  const repoHit = item.kind === 'repo'
    && !!item.owner && !!item.name
    && e.owner?.toLowerCase() === item.owner.toLowerCase()
    && e.name?.toLowerCase() === item.name.toLowerCase()
  const tokenHit = item.kind === 'token'
    && !!item.token && e.token?.toLowerCase() === item.token.toLowerCase()
  if (!repoHit && !tokenHit) return false
  switch (e.kind) {
    case 'trending_detected':
    case 'star_growth':
    case 'rank_moved':
    case 'release_published':
      return item.alerts.trending
    case 'token_launched':
    case 'fee_distributed':
      return item.alerts.launch
    case 'repo_claimed':
      return repoHit
    default: {
      const _e: never = e.kind
      return _e
    }
  }
}

export function Watch() {
  const w = useWallet()
  const [tab, setTab] = useState<Dash>('watching')
  const [items, setItems] = useState<WatchItem[]>([])
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [first, setFirst] = useState<BoardRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void fetchActivity().then((r) => setEvents(r.events)).catch(() => {})
    void fetchFirst(1).then((r) => setFirst(r.rows)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!w.address) return
    void fetchWatch(w.address).then((r) => setItems(r.items)).catch((e: Error) => setErr(e.message))
  }, [w.address])

  const matched = useMemo(() => events.filter((e) => items.some((i) => matches(i, e))), [events, items])
  const watchingRepos = items.filter((i) => i.kind === 'repo')
  const watchingTokens = items.filter((i) => i.kind === 'token')
  const opportunities = first.filter((row) => watchingRepos.some((i) => (
    i.owner?.toLowerCase() === row.repo.owner.toLowerCase()
    && i.name?.toLowerCase() === row.repo.name.toLowerCase()
  )))

  async function drop(item: WatchItem) {
    if (!w.address) return
    const next = await saveWatch({
      wallet: w.address,
      kind: item.kind,
      remove: true,
      token: item.token,
      owner: item.owner,
      name: item.name,
      githubId: item.githubId,
    })
    setItems(next)
  }

  async function toggle(item: WatchItem, key: 'trending' | 'launch') {
    if (!w.address) return
    const next = await saveWatch({
      wallet: w.address,
      kind: item.kind,
      token: item.token,
      owner: item.owner,
      name: item.name,
      githubId: item.githubId,
      alerts: { ...item.alerts, [key]: !item.alerts[key] },
    })
    setItems(next)
  }

  return (
    <main className="paper paper--page">
      <p className="kicker">Watchlist</p>
      <h1>Saved before the tape moves.</h1>
      <p className="muted">Alerts only print when the index writes a matching event. Nothing is simulated.</p>
      {!w.address && <p className="err">Connect a wallet to store watches against that address.</p>}
      <ErrorState error={err} />
      <div className="tabs">
        <button type="button" className={tab === 'watching' ? 'is-on' : ''} onClick={() => setTab('watching')}>WATCHING</button>
        <button type="button" className={tab === 'tokens' ? 'is-on' : ''} onClick={() => setTab('tokens')}>LIVE TOKENS</button>
        <button type="button" className={tab === 'activity' ? 'is-on' : ''} onClick={() => setTab('activity')}>RECENT ACTIVITY</button>
        <button type="button" className={tab === 'first' ? 'is-on' : ''} onClick={() => setTab('first')}>LAUNCH OPPORTUNITIES</button>
      </div>

      {tab === 'watching' && (
        <section>
          {watchingRepos.map((i) => (
            <p key={`${i.githubId}-${i.owner}`}>
              <a href={`/repo/${i.owner}/${i.name}`} onClick={onNavClick(`/repo/${i.owner}/${i.name}`)}>{i.owner}/{i.name}</a>
              {' · '}
              <label className="check">
                <input type="checkbox" checked={i.alerts.trending} onChange={() => void toggle(i, 'trending')} />
                Momentum
              </label>
              {' '}
              <label className="check">
                <input type="checkbox" checked={i.alerts.launch} onChange={() => void toggle(i, 'launch')} />
                Launch
              </label>
              {' · '}<button type="button" className="linkish" onClick={() => void drop(i)}>Remove</button>
            </p>
          ))}
          {!watchingRepos.length && <EmptyState title="No repos" body="Watch from a repository page before it launches." />}
        </section>
      )}

      {tab === 'tokens' && (
        <section>
          {watchingTokens.map((i) => (
            <p key={i.token}>
              <a href={`/token/${i.token}`} onClick={onNavClick(`/token/${i.token}`)}>{i.token?.slice(0, 10)}…</a>
              {' · '}
              <label className="check">
                <input type="checkbox" checked={i.alerts.launch} onChange={() => void toggle(i, 'launch')} />
                Activity alerts
              </label>
              {' · '}<button type="button" className="linkish" onClick={() => void drop(i)}>Remove</button>
            </p>
          ))}
          {!watchingTokens.length && <EmptyState title="No tokens" body="Watch from a token page." />}
        </section>
      )}

      {tab === 'activity' && (
        <ul className="tape">
          {(matched.length ? matched : []).map((e) => (
            <li key={e.id}>
              <span className="mono">{timeAgoMs(e.at)}</span>
              <strong>{e.title}</strong>
              <em>{e.body}</em>
            </li>
          ))}
          {!matched.length && <EmptyState title="No matched alerts" body="When a watched repository trends, ships a release we indexed, or launches, it prints here." />}
        </ul>
      )}

      {tab === 'first' && (
        <section>
          <p className="muted">Watched repositories that are still un-tokenized in the current Be First window.</p>
          {opportunities.map((row) => (
            <p key={row.repo.id}>
              <a href={`/repo/${row.repo.owner}/${row.repo.name}`} onClick={onNavClick(`/repo/${row.repo.owner}/${row.repo.name}`)}>
                {row.repo.fullName}
              </a>
              {' · '}
              <a className="btn btn--lime btn--sm" href={launchPath(row.repo.owner, row.repo.name)} onClick={onNavClick(launchPath(row.repo.owner, row.repo.name))}>
                Launch
              </a>
            </p>
          ))}
          {!opportunities.length && <EmptyState title="No launch overlap" body="Watch a trending repository without a token to see it here." />}
        </section>
      )}
    </main>
  )
}
