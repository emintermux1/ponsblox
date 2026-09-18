import { Link } from 'react-router-dom'
import { CaChip } from '../components/CaChip.tsx'
import { ChatRow } from '../components/ChatRow.tsx'
import { SnapTile } from '../components/SnapTile.tsx'
import { StoriesRail } from '../components/StoriesRail.tsx'
import { chatFeed, spotlightFeed } from '../lib/markets.ts'
import { usePageTitle } from '../lib/title.ts'

export function Home() {
  usePageTitle('Snappad — Turn any Snap into a coin.')
  const feed = chatFeed()
  const spots = spotlightFeed()
  const rail = spots.slice(0, 12)
  const mosaic = spots.slice(12)

  return (
    <main className="home">
      <StoriesRail />
      <section className="strip">
        <p>{spots.length} public Spotlights on-chain as markets. 24 hours, then only the coin.</p>
        <div className="strip__end">
          <CaChip />
          <Link className="btn btn--ink btn--sm" to="/launch">Snap it. Coin it.</Link>
        </div>
      </section>
      <section className="discover">
        <div className="rail" aria-label="Live Spotlights">
          {rail.map((p, i) => <SnapTile key={p.id} pair={p} wide index={i} live priority={i < 3} lcp={i === 0} />)}
        </div>
        <header className="discover__head">
          <h2>For You</h2>
          <p>Real Snapchat Spotlights. Each one is a ticker.</p>
        </header>
        <div className="foryou__grid">
          {mosaic.map((p, i) => <SnapTile key={p.id} pair={p} hero={i === 0} index={i} live priority={i === 0} />)}
        </div>
      </section>
      <section className="inbox">
        <header>
          <h2>Chat</h2>
          <p>Every Snap is a market.</p>
        </header>
        <div className="inbox__list">
          {feed.map((p) => <ChatRow key={p.id} pair={p} />)}
        </div>
      </section>
    </main>
  )
}
