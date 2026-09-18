import { Link } from 'react-router-dom'
import { compact, usd } from '../lib/format.ts'
import { filterPairs, pairHref } from '../lib/markets.ts'
import { OfficialCa } from './OfficialCa.tsx'
import { XLink } from './XLink.tsx'

export function Rail() {
  const hot = filterPairs({ tab: 'hot' }).slice(0, 6)
  return (
    <aside className="rail">
      <section className="side">
        <h2>About RedditPad</h2>
        <p>Reddit culture, paired. Every community deserves a ticker.</p>
        <p>Launches lock to <b>$TOKEN / $RDDT</b>. Onchain quote on Pons V2 is ETH on Robinhood Chain 4663 — not a Reddit stock CA.</p>
        <OfficialCa variant="about" />
        <p><XLink /></p>
        <Link className="btn btn--accent btn--sm" to="/launch">Launch a Pair</Link>
      </section>
      <section className="side">
        <h2>Pair lock</h2>
        <p className="side__lock">$TICKER / $RDDT</p>
        <p className="tiny">Permanent product pair. Factory still settles in ETH.</p>
      </section>
      <section className="side">
        <h2>Trending communities</h2>
        <ol className="side__list">
          {hot.map((p, i) => (
            <li key={p.id}>
              <span className="mono">{i + 1}</span>
              <Link to={pairHref(p)}>
                {p.subreddit}
                <em>{usd(p.mcap)} · {compact(p.holders)}</em>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  )
}
