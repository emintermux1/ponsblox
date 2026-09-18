import { useEffect, useState } from 'react'
import { MarketTable } from '../components/MarketRow.tsx'
import { SearchBox } from '../components/SearchBox.tsx'
import { TopicCard } from '../components/TopicCard.tsx'
import { COPY } from '../lib/copy.ts'
import { loadWikiMarkets, seedMarkets } from '../lib/markets.ts'
import type { TokenRecord } from '../lib/pons/index.ts'
import { hrefFor, onNav } from '../lib/router.ts'
import { fetchMostViewed, fetchTrending, type TrendingItem } from '../lib/wiki.ts'
import { BUY, CA, CHAIN, TICKER, dexHref, explorerHref } from '../lore.ts'

function OfficialToken() {
  const [copied, setCopied] = useState(false)

  async function copyCa() {
    if (!navigator.clipboard) return
    await navigator.clipboard.writeText(CA)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <aside className="infobox" aria-label={`${TICKER} official token`}>
      <div className="infobox__title">{TICKER} <span className="product-tag">WikiPad</span></div>
      <table>
        <tbody>
          <tr><th>Type</th><td>Official token</td></tr>
          <tr><th>Ticker</th><td>{TICKER}</td></tr>
          <tr><th>Chain</th><td>{CHAIN}</td></tr>
          <tr>
            <th>CA</th>
            <td>
              <button type="button" className="linkish mono" onClick={() => void copyCa()}>
                {copied ? 'Copied' : CA}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="infobox__links">
        <a href={BUY} target="_blank" rel="noreferrer">Buy</a>
        {' · '}
        <a href={dexHref()} target="_blank" rel="noreferrer">GMGN</a>
        {' · '}
        <a href={explorerHref()} target="_blank" rel="noreferrer">Explorer</a>
      </p>
    </aside>
  )
}

export function Home() {
  const [trending, setTrending] = useState<TrendingItem[] | null>(null)
  const [viewed, setViewed] = useState<TrendingItem[] | null>(null)
  const [markets, setMarkets] = useState<TokenRecord[]>(() => seedMarkets())
  const [marketBusy, setMarketBusy] = useState(false)
  const launch = hrefFor({ name: 'launch', title: null })

  function loadViral() {
    setTrending(null)
    void fetchTrending().then(setTrending).catch(() => setTrending([]))
    void fetchMostViewed().then(setViewed).catch(() => setViewed([]))
  }

  function loadMarkets() {
    setMarketBusy(true)
    void loadWikiMarkets(setMarkets)
      .then(setMarkets)
      .catch(() => setMarkets(seedMarkets()))
      .finally(() => setMarketBusy(false))
  }

  useEffect(() => {
    loadViral()
    loadMarkets()
  }, [])

  return (
    <main className="article">
      <h1 className="firstHeading">{COPY.wordmark}</h1>
      <p className="subtitle">From WikiPad, the knowledge markets</p>
      <p className="lead">{COPY.tagline}</p>
      <p>{COPY.searchLead}</p>
      <p className="muted">{COPY.knowledge} {COPY.editorFees}</p>
      <p>
        <a className="btn" href={launch} onClick={(e) => onNav(e, launch)}>Launch a Page</a>
      </p>
      <SearchBox large autoFocus />

      <section className="viral">
        <OfficialToken />
        <h2>Viral topics</h2>
        <p className="muted">{COPY.editorFees}</p>
        {!trending && <p className="muted">Loading Wikimedia’s most-read articles…</p>}
        {trending && trending.length === 0 && (
          <p className="empty">
            Wikimedia did not return a top list just now.{' '}
            <button type="button" className="linkish" onClick={loadViral}>Retry</button>
          </p>
        )}
        <div className="card-list">
          {trending?.map((item) => <TopicCard key={item.title} item={item} />)}
        </div>
      </section>

      <h2>Recently Launched</h2>
      <p>
        <a href="/markets" onClick={(e) => onNav(e, '/markets')}>All launched markets</a>
        {marketBusy && <span className="muted"> · updating…</span>}
      </p>
      <MarketTable
        rows={markets.slice(0, 8)}
        empty="No WikiPad markets yet. Pair a page to launch the first."
      />

      <h2>Most viewed</h2>
      {!viewed && <p className="muted">Loading…</p>}
      <div className="card-list">
        {viewed
          ?.filter((item) => !trending?.some((t) => t.title === item.title))
          .map((item) => <TopicCard key={`v-${item.title}`} item={item} />)}
      </div>
    </main>
  )
}
