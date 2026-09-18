import { Link } from 'react-router-dom'
import { PairCard } from '../components/PairCard.tsx'
import { Rail } from '../components/Rail.tsx'
import { filterPairs } from '../lib/markets.ts'
import { usePageTitle } from '../lib/title.ts'

export function Home() {
  usePageTitle('redditpad — Pair the front page of the internet.')
  const trending = filterPairs({ tab: 'hot' })

  return (
    <main className="community">
      <div className="community__banner" aria-hidden="true" />
      <div className="shell">
        <div className="shell__main">
          <header className="comm">
            <img src="/brand/redditpad-mark.jpg" alt="" className="comm__mark" />
            <div className="comm__text">
              <h1>Pair the front page of the internet.</h1>
              <p>Turn Reddit communities into onchain markets backed by $RDDT.</p>
              <div className="comm__cta">
                <Link className="btn btn--accent" to="/launch">Launch a Pair</Link>
                <Link className="btn" to="/explore">Explore RedditPad</Link>
              </div>
            </div>
          </header>
          <nav className="sort" aria-label="Sort">
            <Link className="on" to="/">Hot</Link>
            <Link to="/explore?tab=new">New</Link>
            <Link to="/explore?tab=top">Top</Link>
            <Link to="/explore?tab=bonding">Bonding</Link>
            <Link to="/graduated">Graduated</Link>
          </nav>
          {trending.length === 0 ? (
            <div className="empty">
              <p>No pairs yet. Launch the first one.</p>
              <Link className="btn btn--accent" to="/launch">Launch a Pair</Link>
            </div>
          ) : (
            <div className="feed">
              {trending.map((p) => <PairCard key={p.id} pair={p} />)}
            </div>
          )}
        </div>
        <Rail />
      </div>
    </main>
  )
}
