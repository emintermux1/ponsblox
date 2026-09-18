import { useEffect, useState } from 'react'
import { EmptyState, ErrorState, SkeletonGrid } from '../components/ErrorState.tsx'
import { MomentumBadge, signalFromRepo } from '../components/MomentumBadge.tsx'
import { fetchFirst, type BoardRow } from '../lib/api.ts'
import { compact } from '../lib/format.ts'
import { launchPath, onNavClick, repoPath } from '../lib/router.ts'

export function First() {
  const [rows, setRows] = useState<BoardRow[]>([])
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setBusy(true)
    void fetchFirst(page)
      .then((r) => { if (live) setRows(r.rows) })
      .catch((e: Error) => { if (live) setErr(e.message) })
      .finally(() => { if (live) setBusy(false) })
    return () => { live = false }
  }, [page])

  return (
    <main className="ink paper--page firstpage">
      <p className="kicker">Be First</p>
      <h1>Trending on GitHub. Not yet tokenized.</h1>
      <p className="lede">Buy the launch with ETH on Robinhood. These repos have no GitPad token yet.</p>
      <ErrorState error={err} />
      {busy && !rows.length && <SkeletonGrid n={3} />}
      {!busy && !rows.length && <EmptyState title="No open slots" body="Every repository in this trending window already has a GitPad token, or GitHub has not returned a window yet." />}
      <ol className="firstlist">
        {rows.map((row) => {
          const r = row.repo
          const sig = signalFromRepo(r)
          return (
            <li key={r.id}>
              <p className="kicker">TRENDING #{String(row.rank).padStart(2, '0')}</p>
              <h2>
                <a href={repoPath(r.owner, r.name)} onClick={onNavClick(repoPath(r.owner, r.name))}>{r.owner}/{r.name}</a>
              </h2>
              <p>⭐ {compact(r.stars)} {r.stars7d != null ? <span>↑ +{compact(r.stars7d)} this week</span> : null}</p>
              <p className="mono firstlist__quote">Quote: ETH</p>
              <MomentumBadge signal={sig} explain />
              <p className="firstlist__open">NOT YET TOKENIZED</p>
              <div className="hero__cta">
                <a className="btn btn--lime btn--lg" href={launchPath(r.owner, r.name)} onClick={onNavClick(launchPath(r.owner, r.name))}>
                  Launch
                </a>
                <a className="btn btn--ghost" href={repoPath(r.owner, r.name)} onClick={onNavClick(repoPath(r.owner, r.name))}>View</a>
              </div>
            </li>
          )
        })}
      </ol>
      <div className="pager">
        <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span className="mono">Page {page}</span>
        <button type="button" className="btn btn--ghost" disabled={rows.length < 8} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </main>
  )
}
