import { useState } from 'react'
import { Link } from 'react-router-dom'
import { commentCount } from '../lib/comments.ts'
import { ageLabel, compact, pct, usd } from '../lib/format.ts'
import { pairHref, sparkFor, type Pair } from '../lib/markets.ts'
import { pairVote, setPairVote, shownScore } from '../lib/pairVotes.ts'
import { PairBadge } from './PairBadge.tsx'
import { Spark } from './Spark.tsx'
import { Vote } from './Vote.tsx'

export function PairCard({ pair }: { pair: Pair; feed?: boolean }) {
  const spark = sparkFor(pair)
  const [vote, setVote] = useState(() => pairVote(pair.id))
  const score = shownScore(pair.id, pair.holders, pair.volume)
  const comments = commentCount(pair.id)
  const href = pairHref(pair)

  return (
    <article className="post">
      <Vote
        score={score}
        vote={vote}
        onVote={(d) => setVote(setPairVote(pair.id, d))}
      />
      <Link to={href} className="post__thumb">
        <img
          src={pair.image}
          alt=""
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/brand/reddit-icon.png' }}
        />
      </Link>
      <div className="post__body">
        <h3 className="post__title">
          <Link to={href}>{pair.name}</Link>
          <PairBadge ticker={pair.ticker} />
          <span className={`chg ${pair.change24h >= 0 ? 'chg--up' : 'chg--dn'}`}>{pct(pair.change24h)}</span>
        </h3>
        <p className="post__meta">
          Posted in <a href={pair.sourceUrl} target="_blank" rel="noreferrer">{pair.subreddit}</a>
          {' · '}
          {ageLabel(pair.createdAt)}
        </p>
        <p className="post__blurb">{pair.blurb}</p>
        <p className="post__stats">
          <span>mcap {usd(pair.mcap)}</span>
          <span>vol {usd(pair.volume)}</span>
          <span>{pair.status === 'graduated' ? 'graduated' : `${pair.bonding}% bonded`}</span>
          <span>{compact(pair.holders)} holders</span>
        </p>
        <div className="post__actions">
          <Spark values={spark} up={pair.change24h >= 0} />
          <Link to={href}>{comments} comments</Link>
          <Link className="post__buy" to={`${href}#trade`}>Buy</Link>
        </div>
      </div>
    </article>
  )
}
