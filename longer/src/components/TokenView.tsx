'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { isAddress } from 'viem'
import { useAccount, useWalletClient } from 'wagmi'
import { pairTicker, tokenPairLabel } from '@/lib/assets'
import { addressUrl, short } from '@/lib/chain'
import { compact, timeAgoMs, usd } from '@/lib/format'
import { byLongerName } from '@/lib/naming'
import { buyToken, getTokenMarket, sellToken, type TokenMarket } from '@/lib/pons'
import { isOfficialToken, SITE_URL, X_HANDLE, X_URL, shareIntentUrl } from '@/lib/official'
import { previewMarket } from '@/lib/preview'
import { AssetMark } from './AssetMark'
import { Badge } from './Badge'
import { CopyAddr } from './CopyAddr'
import { PageEnter } from './PageEnter'
import { PairStack } from './PairStack'
import { Tape } from './Tape'

export function TokenView({ id }: { id: string }) {
  const [market, setMarket] = useState<TokenMarket | null>(() => previewMarket(id))
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const { address, isConnected } = useAccount()
  const { data: wallet } = useWalletClient()

  useEffect(() => {
    void getTokenMarket(id).then(setMarket)
    if (!isAddress(id)) return
    const tick = window.setInterval(() => {
      void getTokenMarket(id).then(setMarket)
    }, 15000)
    return () => window.clearInterval(tick)
  }, [id])

  if (!market) {
    return <div className="mx-auto max-w-[1200px] px-4 py-16 text-sm text-muted">Loading market…</div>
  }

  const preview = market.source === 'preview'
  const canTrade = !preview && Boolean(market.curve && market.pair.address && isConnected && wallet && address)

  async function trade() {
    const live = market
    setErr(null)
    setNote(null)
    if (!canTrade || !wallet || !address || !live || !live.curve || !live.pair.address || !live.token) return
    setBusy(true)
    try {
      if (side === 'buy') {
        await buyToken({ wallet, account: address, curve: live.curve, pair: live.pair.address, amount })
      } else {
        await sellToken({ wallet, account: address, token: live.token, curve: live.curve, amount })
      }
      setNote('Transaction submitted.')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageEnter>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div className="flex min-w-0 items-start gap-3">
            <PairStack symbol={market.symbol} logo={market.logo} asset={market.pair} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-medium text-paper">{byLongerName(market.name)}</h1>
                <span className="font-mono text-sm text-muted">{market.symbol}</span>
                {preview && <Badge tone="muted">Preview</Badge>}
                {market.token && isOfficialToken(market.token) && <Badge tone="accent">Official</Badge>}
              </div>
              <Link href={`/?pair=${market.pair.id}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-accent transition-colors hover:text-paper">
                <AssetMark asset={market.pair} size="xs" />
                {tokenPairLabel(market.symbol, market.pair)}
              </Link>
              {market.token ? (
                <p className="mt-2">
                  <CopyAddr address={market.token} />
                </p>
              ) : null}
              <p className="mt-1 text-[12px] text-muted">
                Launched via LONGER · Pons
                {' · '}
                <a
                  href={shareIntentUrl(`${market.symbol} on LONGER · ${SITE_URL}/token/${id} ${X_HANDLE}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-muted transition-colors hover:text-paper"
                >
                  Share {X_HANDLE}
                </a>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px] sm:grid-cols-4">
            <Stat k="Price" v={usd(market.price)} />
            <Stat k="MC" v={usd(market.marketCap)} />
            <Stat k="24h vol" v={usd(market.volume24h)} />
            <Stat k="Holders" v={compact(market.holders)} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="border border-line">
            <Tape
              values={market.series}
              live={preview}
              label={preview ? 'Preview tape' : 'Mark'}
            />
          </div>
          <aside className="border border-line bg-panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <AssetMark asset={market.pair} size="sm" />
              <p className="text-[13px] text-paper">{pairTicker(market.pair)}</p>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-1">
              <button type="button" className={`${side === 'buy' ? 'chip chip-on' : 'chip'} inline-flex min-h-11 w-full items-center justify-center`} onClick={() => setSide('buy')}>
                Buy
              </button>
              <button type="button" className={`${side === 'sell' ? 'chip chip-on' : 'chip'} inline-flex min-h-11 w-full items-center justify-center`} onClick={() => setSide('sell')}>
                Sell
              </button>
            </div>
            <label className="field">
              <span>{side === 'buy' ? `Pay with ${market.pair.leveragedSymbol}` : `Sell ${market.symbol}`}</span>
              <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" />
            </label>
            <button
              type="button"
              className="btn btn-accent btn-lg mt-4 w-full"
              disabled={!canTrade || busy || !amount.trim()}
              onClick={() => void trade()}
            >
              {preview
                ? 'Preview market — trading unavailable'
                : !isConnected
                  ? 'Connect wallet to trade'
                  : busy
                    ? 'Waiting for wallet…'
                    : `${side === 'buy' ? 'Buy' : 'Sell'} ${market.symbol}`}
            </button>
            {err && <p className="mt-3 text-[12px] text-danger">{err}</p>}
            {note && <p className="mt-3 text-[12px] text-ok">{note}</p>}
          </aside>
        </div>

        <dl className="mt-4 grid gap-2 border border-line bg-panel p-4 text-[13px] sm:grid-cols-3">
          <Meta k="Pair" v={
            <Link href={`/?pair=${market.pair.id}`} className="inline-flex items-center gap-1.5 text-accent hover:text-paper">
              <AssetMark asset={market.pair} size="xs" />
              {pairTicker(market.pair)}
            </Link>
          } />
          <Meta
            k="Contract"
            v={market.token ? <CopyAddr address={market.token} /> : '—'}
          />
          <Meta
            k="Creator"
            v={market.creator ? <a href={addressUrl(market.creator)} target="_blank" rel="noreferrer" className="text-paper hover:text-accent">{short(market.creator)}</a> : '—'}
          />
        </dl>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="border border-line">
            <h2 className="border-b border-line px-3 py-2 text-[13px] tracking-[0.14em] text-muted">RECENT TRADES</h2>
            {market.trades.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted">No trades yet.</p>
            ) : (
              market.trades.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-3 py-2 text-[13px] last:border-b-0">
                  <span className={t.side === 'buy' ? 'text-ok' : 'text-danger'}>{t.side}</span>
                  <span className="font-mono tabular-nums text-paper">{compact(t.amount)}</span>
                  <span className="min-w-0 truncate text-muted">{t.quote.toFixed(2)} {market.pair.leveragedSymbol}</span>
                  <span className="font-mono text-muted">{timeAgoMs(t.at)}</span>
                </div>
              ))
            )}
          </section>
          <section className="border border-line">
            <h2 className="border-b border-line px-3 py-2 text-[13px] tracking-[0.14em] text-muted">HOLDERS</h2>
            {market.holderRows.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted">No holder tape yet.</p>
            ) : (
              market.holderRows.map((h) => (
                <div key={h.account} className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 text-[13px] last:border-b-0">
                  <span className="min-w-0 truncate font-mono text-paper">{h.account}</span>
                  <span className="shrink-0 text-muted">{h.pct.toFixed(1)}%</span>
                  <span className="shrink-0 font-mono text-muted">{compact(h.amount)}</span>
                </div>
              ))
            )}
          </section>
        </div>

        <section className="mt-4 border border-line p-4">
          <h2 className="text-[13px] tracking-[0.14em] text-muted">ABOUT</h2>
          <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-paper">
            {market.description || 'No description.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-[13px]">
            {market.website && <a className="text-accent hover:text-paper" href={market.website} target="_blank" rel="noreferrer">Website</a>}
            <a className="text-muted hover:text-paper" href={market.twitter || X_URL} target="_blank" rel="noreferrer">
              {market.twitter && market.twitter !== X_URL ? 'X' : X_HANDLE}
            </a>
            {market.telegram && <a className="text-accent hover:text-paper" href={market.telegram} target="_blank" rel="noreferrer">Telegram</a>}
          </div>
        </section>
      </main>
    </PageEnter>
  )
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{k}</p>
      <p className="tabular-nums text-paper">{v}</p>
    </div>
  )
}

function Meta({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{k}</dt>
      <dd className="mt-0.5">{v}</dd>
    </div>
  )
}
