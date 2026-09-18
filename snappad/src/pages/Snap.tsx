import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChainAlert } from '../components/ChainAlert.tsx'
import { Connect } from '../components/Connect.tsx'
import { SnapStage } from '../components/SnapStage.tsx'
import { SourceCard } from '../components/SourceCard.tsx'
import { txUrl, WRONG_CHAIN_MSG } from '../lib/chain.ts'
import { snapClock } from '../lib/countdown.ts'
import { ageLabel, compact, usd } from '../lib/format.ts'
import { pairById } from '../lib/markets.ts'
import { buyOnCurve, sellOnCurve } from '../lib/pons/index.ts'
import { usePageTitle } from '../lib/title.ts'
import { markViewed } from '../lib/viewed.ts'
import { useWallet } from '../lib/wallet.tsx'
import { NotFound } from './NotFound.tsx'

type Side = 'buy' | 'sell'

export function SnapPage() {
  const { ticker } = useParams()
  const pair = pairById(ticker || '')
  const w = useWallet()
  const [side, setSide] = useState<Side>('buy')
  const [amount, setAmount] = useState('0.05')
  const [status, setStatus] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [hash, setHash] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  usePageTitle(pair ? `${pair.name} $${pair.ticker} — SnapPad` : 'Snap not found — SnapPad')

  useEffect(() => {
    if (pair) markViewed(pair.id)
  }, [pair])

  const quote = useMemo(() => {
    if (!pair) return null
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return null
    if (side === 'buy') return { tokens: n / Math.max(pair.price, 0.000001), cost: n }
    return { tokens: n, cost: n * pair.price }
  }, [amount, pair, side])

  if (!pair) return <NotFound />

  const gone = snapClock(pair.createdAt).expired
  const launched = Boolean(pair.onchain)

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
      setStatus('Catalog preview. Launch this Snap to create the Pons curve.')
      return
    }
    setBusy(true)
    try {
      const h = side === 'buy'
        ? await buyOnCurve(w.walletClient, w.address, live.onchain.curve, amount)
        : await sellOnCurve(w.walletClient, w.address, live.onchain.token, live.onchain.curve, amount)
      setHash(h)
      setStatus('Submitted. Watch the explorer — we will not invent a confirmation.')
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
    <main className="viewer">
      <SnapStage pair={pair} gone={gone} />
      <aside className="viewer__desk">
        <SourceCard
          image={pair.image}
          account={pair.account}
          ticker={pair.ticker}
          name={pair.name}
          caption={pair.caption}
          timestamp={ageLabel(pair.createdAt)}
          kind={pair.kind}
          sourceUrl={pair.snapUrl || pair.sourceUrl}
        />
        <div className="desk">
          <nav className="sides">
            <button type="button" className={side === 'buy' ? 'on' : ''} onClick={() => onSide('buy')}>Buy</button>
            <button type="button" className={side === 'sell' ? 'on' : ''} onClick={() => onSide('sell')}>Sell</button>
          </nav>
          <label>
            {side === 'buy' ? 'ETH in' : 'Tokens in'}
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </label>
          {quote && launched && (
            <p className="note">
              {side === 'buy'
                ? `Preview ≈ ${compact(quote.tokens)} $${pair.ticker}`
                : `Preview ≈ ${usd(quote.cost)} ETH`}
            </p>
          )}
          {!launched && (
            <p className="note">Catalog preview. No curve yet — Launch this Snap to coin it.</p>
          )}
          <Connect />
          {!launched && (
            <Link className="btn btn--yellow btn--wide btn--press" to={`/launch?from=${encodeURIComponent(pair.id)}`}>
              Launch this Snap
            </Link>
          )}
          <button
            type="button"
            className={`btn btn--wide ${launched ? 'btn--yellow btn--press' : 'btn--ink'}`}
            disabled={busy}
            onClick={() => void trade()}
          >
            {busy ? 'Working…' : side === 'buy' ? `Buy $${pair.ticker}` : `Sell $${pair.ticker}`}
          </button>
          {status && <p className="note">{status}</p>}
          {hash && <p className="note"><a href={txUrl(hash)} target="_blank" rel="noreferrer">Open tx</a></p>}
          {err && (err === WRONG_CHAIN_MSG || err.includes('Robinhood Chain')
            ? <ChainAlert message={err} />
            : <p className="err" role="alert">{err}</p>)}
        </div>
        <Link className="viewer__back" to="/">Back to chat</Link>
      </aside>
    </main>
  )
}
