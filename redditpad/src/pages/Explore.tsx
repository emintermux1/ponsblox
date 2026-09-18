import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PairCard } from '../components/PairCard.tsx'
import { Rail } from '../components/Rail.tsx'
import { filterPairs, kindLabel, type Kind, type SortTab } from '../lib/markets.ts'
import { usePageTitle } from '../lib/title.ts'

const TABS: SortTab[] = ['hot', 'new', 'top', 'bonding', 'graduated']
const KINDS: Array<Kind | 'all'> = ['all', 'subreddit', 'meme', 'post', 'character', 'lore']

function tabLabel(tab: SortTab): string {
  switch (tab) {
    case 'hot': return 'Hot'
    case 'new': return 'New'
    case 'top': return 'Top'
    case 'bonding': return 'Bonding'
    case 'graduated': return 'Graduated'
    default: {
      const _e: never = tab
      return _e
    }
  }
}

function parseTab(raw: string | null): SortTab {
  switch (raw) {
    case 'new':
    case 'top':
    case 'bonding':
    case 'graduated':
    case 'hot':
      return raw
    default:
      return 'hot'
  }
}

function parseKind(raw: string | null): Kind | 'all' {
  switch (raw) {
    case 'subreddit':
    case 'meme':
    case 'post':
    case 'character':
    case 'lore':
      return raw
    default:
      return 'all'
  }
}

function heading(forcedTab?: SortTab): string {
  switch (forcedTab) {
    case 'hot': return 'Trending Reddit pairs'
    case 'new': return 'Newest pairs'
    case 'top': return 'Top pairs'
    case 'bonding': return 'Bonding pairs'
    case 'graduated': return 'Graduated pairs'
    case undefined: return 'Explore'
    default: {
      const _e: never = forcedTab
      return _e
    }
  }
}

export function Explore({ forcedTab }: { forcedTab?: SortTab }) {
  const [params, setParams] = useSearchParams()
  const tab = forcedTab ?? parseTab(params.get('tab'))
  const kind = parseKind(params.get('kind'))
  const q = params.get('q') || ''
  const [draft, setDraft] = useState(q)

  usePageTitle(`${heading(forcedTab)} — redditpad`)

  const rows = useMemo(() => filterPairs({ q, tab, kind }), [q, tab, kind])

  function set(next: { q?: string; tab?: SortTab; kind?: Kind | 'all' }) {
    const p = new URLSearchParams(params)
    if (next.q != null) {
      if (next.q) p.set('q', next.q)
      else p.delete('q')
    }
    if (next.tab) p.set('tab', next.tab)
    if (next.kind) {
      if (next.kind === 'all') p.delete('kind')
      else p.set('kind', next.kind)
    }
    setParams(p, { replace: true })
  }

  return (
    <main>
      <div className="shell">
        <div className="shell__main">
          <header className="comm comm--plain">
            <div>
              <h1>{heading(forcedTab)}</h1>
              <p>Communities as markets. Search tickers, subs, or Reddit posts.</p>
            </div>
          </header>
          <form
            className="explore__search"
            onSubmit={(e) => {
              e.preventDefault()
              set({ q: draft.trim() })
            }}
          >
            <input
              value={draft}
              onChange={(e) => {
                const next = e.target.value
                setDraft(next)
                set({ q: next.trim() })
              }}
              placeholder="Search communities, tickers or Reddit posts"
              aria-label="Search communities, tickers or Reddit posts"
            />
          </form>
          {!forcedTab && (
            <nav className="sort" role="tablist" aria-label="Sort">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  className={tab === t ? 'on' : ''}
                  onClick={() => set({ tab: t })}
                >
                  {tabLabel(t)}
                </button>
              ))}
            </nav>
          )}
          <div className="kindrow" role="group" aria-label="Kind">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                className={kind === k ? 'on' : ''}
                onClick={() => set({ kind: k })}
              >
                {k === 'all' ? 'All' : kindLabel(k)}
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <div className="empty">
              <p>No pairs match that search.</p>
              <div className="row">
                <button type="button" className="btn" onClick={() => { setDraft(''); set({ q: '', kind: 'all' }) }}>Clear filters</button>
                <Link className="btn btn--accent" to="/launch">Launch a Pair</Link>
              </div>
            </div>
          ) : (
            <div className="feed">
              {rows.map((p) => <PairCard key={p.id} pair={p} />)}
            </div>
          )}
        </div>
        <Rail />
      </div>
    </main>
  )
}
