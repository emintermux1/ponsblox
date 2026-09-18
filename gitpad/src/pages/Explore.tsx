import { useState } from 'react'
import { ErrorState, SkeletonGrid, EmptyState } from '../components/ErrorState.tsx'
import { RepoCard } from '../components/RepoCard.tsx'
import { useTrendingRepositories } from '../hooks/useTrendingRepositories.ts'
import { loadIndexed } from '../lib/tokens.ts'
import { compact, quoteLabel } from '../lib/format.ts'
import { explorePath, onNavClick, repoPath, type ExploreSort } from '../lib/router.ts'
import type { TokenRecord } from '../lib/pons.ts'
import { useEffect } from 'react'

const TABS: { id: ExploreSort | 'tokenized'; label: string }[] = [
  { id: 'trending', label: 'Trending Now' },
  { id: 'growing', label: 'Fastest Growing' },
  { id: 'today', label: 'Most Starred Today' },
  { id: 'forked', label: 'Most Forked' },
  { id: 'ai', label: 'AI' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'devtools', label: 'Developer Tools' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'rising', label: 'New & Rising' },
  { id: 'starred', label: 'Most Starred' },
  { id: 'tokenized', label: 'Tokenized' },
]

export function Explore({ sort, q }: { sort: ExploreSort | 'tokenized'; q: string }) {
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState(q)
  const [query, setQuery] = useState(q)
  const list = useTrendingRepositories(sort === 'tokenized' ? 'trending' : sort, sort === 'tokenized' ? '' : query, page, sort !== 'tokenized')
  const [tokenized, setTokenized] = useState<TokenRecord[]>([])
  const [tokErr, setTokErr] = useState<string | null>(null)
  const [tokBusy, setTokBusy] = useState(sort === 'tokenized')

  useEffect(() => { setPage(1) }, [sort, query])

  useEffect(() => {
    if (sort !== 'tokenized') return
    let live = true
    setTokBusy(true)
    void loadIndexed()
      .then((rows) => { if (live) setTokenized(rows) })
      .catch((e: Error) => { if (live) setTokErr(e.message) })
      .finally(() => { if (live) setTokBusy(false) })
    return () => { live = false }
  }, [sort])

  return (
    <main className="paper paper--page">
      <header className="sec">
        <div>
          <p className="kicker">Explore</p>
          <h1>Explore repositories</h1>
          <p>New launches buy with ETH. Ranked by velocity, recency, and activity.</p>
        </div>
      </header>
      <div className="tabs">
        {TABS.map((t) => (
          <a key={t.id} href={explorePath(t.id, query)} className={t.id === sort ? 'is-on' : ''} onClick={onNavClick(explorePath(t.id, query))}>
            {t.label}
          </a>
        ))}
      </div>
      {sort !== 'tokenized' && (
        <form className="search" onSubmit={(e) => { e.preventDefault(); setQuery(draft) }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a GitHub term…" aria-label="Search repositories" />
          <span className="mono">enter</span>
        </form>
      )}
      <ErrorState error={sort === 'tokenized' ? tokErr : list.error} />
      {sort === 'tokenized' ? (
        tokBusy ? <SkeletonGrid /> : tokenized.length ? (
          <div className="grid">
            {tokenized.map((t) => (
              <article key={t.token} className="rcard">
                <a className="rcard__main" href={`/token/${t.token}`} onClick={onNavClick(`/token/${t.token}`)}>
                  <header className="rcard__top">
                    <span className="rcard__rank">{t.symbol}</span>
                    <div>
                      <strong>{t.name}</strong>
                      <em>{t.repo ? `${t.repo.owner}/${t.repo.name}` : 'unpaired'}</em>
                    </div>
                  </header>
                  <p>{t.description || 'Launched on Pons V2.'}</p>
                  <dl>
                    <div><dt>Cap</dt><dd>{t.capRblx ? compact(Number(t.capRblx)) : '—'} {quoteLabel(t.pairToken, t.pairSymbol)}</dd></div>
                    <div><dt>Phase</dt><dd>{t.graduated ? 'Graduated' : 'Curve'}</dd></div>
                  </dl>
                </a>
                {t.repo && (
                  <footer className="rcard__act">
                    <a href={repoPath(t.repo.owner, t.repo.name)} onClick={onNavClick(repoPath(t.repo.owner, t.repo.name))}>Repo</a>
                  </footer>
                )}
              </article>
            ))}
          </div>
        ) : <EmptyState title="No launches indexed" body="Launch from a repository and it will show here." />
      ) : (
        <>
          {list.busy && !list.repos.length && <SkeletonGrid />}
          <div className="grid">{list.repos.map((r) => <RepoCard key={`${r.id}-${r.rank}`} repo={r} />)}</div>
          {!list.done && (
            <button type="button" className="btn btn--ink" disabled={list.busy} onClick={() => setPage((n) => n + 1)}>
              {list.busy ? 'Loading…' : 'Load more'}
            </button>
          )}
        </>
      )}
    </main>
  )
}
