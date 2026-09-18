import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChainAlert } from '../components/ChainAlert.tsx'
import { Connect } from '../components/Connect.tsx'
import { PairBadge } from '../components/PairBadge.tsx'
import { PairCard } from '../components/PairCard.tsx'
import { Rail } from '../components/Rail.tsx'
import { ShareX } from '../components/ShareX.tsx'
import { TokenChart } from '../components/TokenChart.tsx'
import { Vote } from '../components/Vote.tsx'
import { txUrl, WRONG_CHAIN_MSG } from '../lib/chain.ts'
import { addComment, loadComments, voteComment, type Comment, type Vote as Dir } from '../lib/comments.ts'
import { ageLabel, compact, pct, usd } from '../lib/format.ts'
import { filterPairs, pairById, relatedPairs, sameSubreddit } from '../lib/markets.ts'
import { pairVote, setPairVote, shownScore } from '../lib/pairVotes.ts'
import { buyOnCurve, sellOnCurve } from '../lib/pons/index.ts'
import { usePageTitle } from '../lib/title.ts'
import { useWallet } from '../lib/wallet.tsx'
import { NotFound } from './NotFound.tsx'

type Side = 'buy' | 'sell'

export function TokenPage() {
  const { ticker, id } = useParams()
  const key = ticker || id || ''
  const pair = pairById(key)
  const w = useWallet()
  const [side, setSide] = useState<Side>('buy')
  const [amount, setAmount] = useState('0.05')
  const [status, setStatus] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [hash, setHash] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [vote, setVote] = useState<Dir>(0)

  usePageTitle(pair ? `${pair.name} $${pair.ticker} / $RDDT — redditpad` : 'Pair not found — redditpad')

  useEffect(() => {
    if (!pair) return
    setComments(loadComments(pair.id))
    setVote(pairVote(pair.id))
  }, [pair])

  const quote = useMemo(() => {
    if (!pair) return null
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return null
    if (side === 'buy') return { tokens: n / Math.max(pair.price, 0.000001), cost: n }
    return { tokens: n, cost: n * pair.price }
  }, [amount, pair, side])

  if (!pair) return <NotFound />

  const related = relatedPairs(pair)
  const more = sameSubreddit(pair)
  const trending = filterPairs({ tab: 'hot' }).filter((p) => p.id !== pair.id).slice(0, 3)
  const score = shownScore(pair.id, pair.holders, pair.volume)

  async function trade() {
    setErr(null)
    setHash(null)
    const live = pair
    if (!live) return
    if (!w.address || !w.walletClient) {
      setErr('Connect a wallet first.')
      return
    }
    if (!w.onRightChain) {
      setErr(WRONG_CHAIN_MSG)
      return
    }
    if (!live.onchain) {
      setStatus('This catalog pair is a preview market. It is not a live Pons token. Launch it to create the curve.')
      return
    }
    setBusy(true)
    try {
      const h = side === 'buy'
        ? await buyOnCurve(w.walletClient, w.address, live.onchain.curve, amount)
        : await sellOnCurve(w.walletClient, w.address, live.onchain.token, live.onchain.curve, amount)
      setHash(h)
      setStatus('Transaction submitted. Waiting is on your wallet / explorer — we will not invent a confirmation.')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function onSide(next: Side) {
    setSide(next)
  }

  return (
    <main>
      <div className="shell">
        <div className="shell__main">
          <article className="thread">
            <Vote
              score={score}
              vote={vote}
              onVote={(d) => setVote(setPairVote(pair.id, d))}
            />
            <div className="thread__main">
              <p className="post__meta">
                Posted in <a href={pair.sourceUrl} target="_blank" rel="noreferrer">{pair.subreddit}</a>
                {' · '}
                {ageLabel(pair.createdAt)}
              </p>
              <h1>{pair.name}</h1>
              <div className="thread__row">
                <img
                  src={pair.image}
                  alt=""
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/brand/reddit-icon.png' }}
                />
                <div>
                  <PairBadge ticker={pair.ticker} />
                  <p className="post__blurb">{pair.blurb}</p>
                  <ShareX name={pair.name} ticker={pair.ticker} />
                </div>
              </div>
            </div>
          </article>

          <div className="token__grid">
            <TokenChart id={pair.id} />
            <aside className="desk" id="trade">
              <nav className="sort sort--local">
                <button type="button" className={side === 'buy' ? 'on' : ''} onClick={() => onSide('buy')}>Buy</button>
                <button type="button" className={side === 'sell' ? 'on' : ''} onClick={() => onSide('sell')}>Sell</button>
              </nav>
              <label>
                {side === 'buy' ? 'ETH in' : 'Tokens in'}
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
              </label>
              {quote && (
                <p className="note">
                  {side === 'buy'
                    ? `Preview fill ≈ ${compact(quote.tokens)} $${pair.ticker}`
                    : `Preview fill ≈ ${usd(quote.cost)} ETH`}
                  . Catalog math only unless this pair has a live curve.
                </p>
              )}
              <Connect />
              <button type="button" className="btn btn--accent" disabled={busy} onClick={() => void trade()}>
                {busy ? 'Working…' : side === 'buy' ? `Buy $${pair.ticker}` : `Sell $${pair.ticker}`}
              </button>
              {status && <p className="note">{status}</p>}
              {err && (err === WRONG_CHAIN_MSG || err.includes('Robinhood Chain')
                ? <ChainAlert message={err} />
                : <p className="err" role="alert">{err}</p>)}
              {hash && <p><a href={txUrl(hash)} target="_blank" rel="noreferrer">Open transaction</a></p>}
              {pair.onchain && (
                <p className="note">Live token {pair.onchain.token}</p>
              )}
            </aside>
          </div>

          <dl className="stats">
            <div><dt>Market Cap</dt><dd className="mono">{usd(pair.mcap)}</dd></div>
            <div><dt>Liquidity</dt><dd className="mono">{usd(pair.mcap * 0.18)}</dd></div>
            <div><dt>24H Volume</dt><dd className="mono">{usd(pair.volume)}</dd></div>
            <div><dt>Holders</dt><dd className="mono">{compact(pair.holders)}</dd></div>
            <div><dt>Reddit source</dt><dd>{pair.subreddit}</dd></div>
            <div><dt>Bonding</dt><dd className="mono">{pair.status === 'graduated' ? 'Graduated' : `${pair.bonding}%`}</dd></div>
            <div><dt>Age</dt><dd className="mono">{ageLabel(pair.createdAt)}</dd></div>
            <div><dt>24h</dt><dd className={`mono ${pair.change24h >= 0 ? 'chg--up' : 'chg--dn'}`}>{pct(pair.change24h)}</dd></div>
          </dl>

          <section className="comments">
            <h2>{comments.length} comments</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!body.trim()) return
                const author = w.address ? `${w.address.slice(0, 6)}` : 'anon'
                setComments(addComment(pair.id, author, body))
                setBody('')
              }}
            >
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Add a comment" />
              <button type="submit" className="btn btn--sm">save</button>
            </form>
            {comments.length === 0 ? (
              <p className="muted">No comments yet.</p>
            ) : (
              <ul>
                {comments.map((c) => (
                  <li key={c.id}>
                    <Vote
                      score={c.score}
                      vote={c.vote}
                      onVote={(d: Dir) => setComments(voteComment(pair.id, c.id, d))}
                    />
                    <div>
                      <p className="post__meta"><b>{c.author}</b> · {ageLabel(c.createdAt)}</p>
                      <p>{c.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="tiny muted">Comments live in this browser (localStorage). They are not onchain.</p>
          </section>

          <section className="more">
            <h2>Related communities</h2>
            {related.length === 0 ? (
              <p className="muted">No related pair in the catalog yet.</p>
            ) : (
              <div className="feed">
                {related.map((p) => <PairCard key={p.id} pair={p} />)}
              </div>
            )}
          </section>
          <section className="more">
            <h2>More from {pair.subreddit}</h2>
            {more.length === 0 ? (
              <p className="muted">This is the only pair from {pair.subreddit} so far.</p>
            ) : (
              <div className="feed">
                {more.map((p) => <PairCard key={p.id} pair={p} />)}
              </div>
            )}
          </section>
          <section className="more">
            <h2>Trending Reddit pairs</h2>
            <Link to="/trending">see all</Link>
            {trending.length === 0 ? (
              <p className="muted">No other trending pairs.</p>
            ) : (
              <div className="feed">
                {trending.map((p) => <PairCard key={p.id} pair={p} />)}
              </div>
            )}
          </section>
        </div>
        <Rail />
      </div>
    </main>
  )
}
