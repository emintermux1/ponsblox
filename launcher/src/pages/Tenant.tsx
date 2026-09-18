import { useCallback, useEffect, useState } from 'react'
import { formatEther, parseEther, type Address, type Hex } from 'viem'
import { CurveGraph } from '../components/CurveGraph.tsx'
import { PadChrome } from '../components/PadChrome.tsx'
import { PadForm } from '../components/PadForm.tsx'
import {
  GMGN_URL,
  PONS_TOKEN_URL,
  explorerAddress,
  explorerTx,
  factoryFor,
  isAddressSet,
  type SupportedChain,
} from '../lib/chain.ts'
import { userError } from '../lib/errors.ts'
import { pinMetadata } from '../lib/ipfs.ts'
import { customFromBrandURI, kitFromBrandURI, padNameOnPons } from '../lib/metadata.ts'
import type { CurveId } from '../lib/copy.ts'
import { launchOnPons, readCanLaunch } from '../lib/pons/launch.ts'
import { buyOnArc, launchOnArc, linkTokenTx, lookupPad, sellOnArc, type OnchainPad } from '../lib/registry.ts'
import { findRemembered } from '../lib/store.ts'
import { readArcBalance, readPadTokens, type PadToken } from '../lib/tokens.ts'
import { connectWallet, switchChain, walletClient } from '../lib/wallet.ts'
import { useWallet } from '../hooks/useWallet.ts'

type LiveLaunch = {
  token: Address
  hash: Hex
  linkHash?: Hex
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function Tenant({ slug }: { slug: string }) {
  const wallet = useWallet()
  const [chain, setChain] = useState<SupportedChain>('robinhood')
  const [pad, setPad] = useState<OnchainPad | null>(null)
  const [tokens, setTokens] = useState<PadToken[]>([])
  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [desc, setDesc] = useState('')
  const [logo, setLogo] = useState('')
  const [buyAmt, setBuyAmt] = useState('')
  const [tradeToken, setTradeToken] = useState('')
  const [tradeAmt, setTradeAmt] = useState('1')
  const [sellAmt, setSellAmt] = useState('')
  const [balance, setBalance] = useState<bigint | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [live, setLive] = useState<LiveLaunch | null>(null)
  const [lookup, setLookup] = useState<'loading' | 'ready' | 'error'>('loading')
  const local = findRemembered(slug)

  const loadPad = useCallback(async (prefer?: SupportedChain) => {
    let found = await lookupPad(slug, prefer)
    if (found.error && !found.pad) {
      await new Promise((r) => setTimeout(r, 900))
      found = await lookupPad(slug, prefer)
    }
    const { pad: hit, error } = found
    if (error && !hit) {
      setLookup('error')
      throw new Error(error)
    }
    const remembered = findRemembered(slug)
    const nextChain: SupportedChain = hit
      ? (hit.chainId === 5042002 ? 'arc' : 'robinhood')
      : (remembered?.chain ?? 'robinhood')
    setPad(hit)
    setChain(nextChain)
    setLookup('ready')
    if (hit?.tokens.length) {
      const rows = await readPadTokens(nextChain, hit.tokens)
      setTokens(rows)
      setTradeToken((cur) => cur || rows[0]?.address || '')
    } else {
      setTokens([])
    }
    return hit
  }, [slug])

  useEffect(() => {
    let alive = true
    setLookup('loading')
    loadPad().catch((e) => {
      if (!alive) return
      setErr(userError(e))
      setLookup((s) => (s === 'loading' ? 'error' : s))
    })
    return () => { alive = false }
  }, [loadPad])

  useEffect(() => {
    if (chain !== 'arc' || !tradeToken || !wallet.account) {
      setBalance(null)
      return
    }
    let alive = true
    readArcBalance(tradeToken as Address, wallet.account)
      .then((n) => { if (alive) setBalance(n) })
      .catch(() => { if (alive) setBalance(null) })
    return () => { alive = false }
  }, [chain, tradeToken, wallet.account])

  const displayName = pad?.name || local?.name || slug
  const kit = pad
    ? kitFromBrandURI(pad.brandURI)
    : (local?.kit ?? 'pons')
  const custom = pad
    ? customFromBrandURI(pad.brandURI)
    : (local?.custom ?? null)
  const curveId = ((pad?.curveId ?? 1) % 3) as CurveId
  const factoryReady = isAddressSet(factoryFor(chain))
  const creatorFee = pad?.creatorFeeBps ?? local?.creatorFeeBps ?? 50

  const launch = async () => {
    setErr(null)
    setBusy(true)
    try {
      if (!name.trim() || !ticker.trim()) throw new Error('Add a name and ticker to launch.')
      if (!wallet.account) await connectWallet()
      await switchChain(chain)
      const w = walletClient()
      const account = w.account
      if (!account) throw new Error('Connect a wallet first.')
      const addr = typeof account === 'string' ? account : account.address
      const symbol = ticker.trim().toUpperCase()
      const description = desc.trim() || `Launched on ${displayName}`
      let image = logo.trim()
      try {
        const pin = await pinMetadata({
          name: name.trim(),
          symbol,
          description,
          image,
        })
        if (!image) image = pin.gateway
      } catch {
        /* Pinata down: launch still writes name/ticker on-chain. */
      }
      const quoteWei = buyAmt.trim() ? parseEther(buyAmt.trim()) : 0n
      let token = '' as Address
      let hash = '' as Hex
      if (chain === 'robinhood') {
        const ok = await readCanLaunch(addr)
        if (!ok) throw new Error('This wallet cannot launch on Pons yet.')
        const receipt = await launchOnPons(w, addr, {
          name: padNameOnPons(name.trim(), displayName),
          symbol,
          logo: image,
          description,
          website: location.href,
          twitter: '',
          creatorFeeRecipient: pad?.owner || addr,
          creatorTaxBps: creatorFee,
          quoteWei,
        })
        token = receipt.token
        hash = receipt.hash
      } else {
        const receipt = await launchOnArc(w, addr, name.trim(), symbol, pad?.curveId ?? 1)
        token = receipt.token
        hash = receipt.hash
        if (quoteWei > 0n) {
          await buyOnArc(w, addr, token, quoteWei)
        }
      }
      let linkHash: Hex | undefined
      if (factoryReady) {
        try {
          linkHash = await linkTokenTx(w, addr, chain, slug, token)
        } catch (linkErr) {
          setErr(`Token live. Link failed: ${userError(linkErr)}`)
        }
      }
      setLive({ token, hash, linkHash })
      setTradeToken(token)
      setTokens((rows) => {
        if (rows.some((r) => r.address.toLowerCase() === token.toLowerCase())) return rows
        return [{ address: token, name: name.trim(), symbol }, ...rows]
      })
      await loadPad(chain)
    } catch (e) {
      setErr(userError(e))
    } finally {
      setBusy(false)
    }
  }

  const trade = async (side: 'buy' | 'sell') => {
    setErr(null)
    setBusy(true)
    try {
      if (chain !== 'arc') throw new Error('Buy and sell on this pad are Arc only. Robinhood trades on Pons.')
      if (!tradeToken) throw new Error('Pick a token first.')
      if (!wallet.account) await connectWallet()
      await switchChain('arc')
      const w = walletClient()
      const account = w.account
      if (!account) throw new Error('Connect a wallet first.')
      const addr = typeof account === 'string' ? account : account.address
      const token = tradeToken as Address
      switch (side) {
        case 'buy':
          await buyOnArc(w, addr, token, parseEther(tradeAmt || '0'))
          break
        case 'sell':
          await sellOnArc(w, addr, token, parseEther(sellAmt || '0'))
          break
        default: {
          const _n: never = side
          return _n
        }
      }
      const next = await readArcBalance(token, addr)
      setBalance(next)
    } catch (e) {
      setErr(userError(e))
    } finally {
      setBusy(false)
    }
  }

  const listed = tokens.filter((t) => t.address.toLowerCase() !== live?.token.toLowerCase())
  const hasTokens = Boolean(live || tokens.length)

  if (lookup === 'loading') {
    return (
      <div className="pad pad-wait" data-kit={kit}>
        <p className="pad-note">Looking up this pad…</p>
      </div>
    )
  }

  return (
    <PadChrome
      kit={kit}
      custom={custom ?? undefined}
      title={displayName}
      slug={slug}
      account={wallet.account}
      chainHint={chain}
      onConnect={() => connectWallet().catch((e) => setErr(userError(e)))}
    >
      {chain === 'arc' && <CurveGraph active={curveId} />}
      {lookup === 'ready' && !pad && (
        <p className="pad-note">
          {local ? 'Saved in this browser. Waiting for the chain to confirm this pad.' : 'Pad not on-chain yet.'}
        </p>
      )}
      <PadForm
        kit={kit}
        name={name}
        ticker={ticker}
        desc={desc}
        logo={logo}
        buyAmt={buyAmt}
        onName={setName}
        onTicker={setTicker}
        onDesc={setDesc}
        onLogo={setLogo}
        onBuyAmt={setBuyAmt}
        onError={setErr}
        chain={chain}
        busy={busy}
        onLaunch={() => void launch()}
        live={live ? (
          <div className="pad-ok">
            <p>{ticker.toUpperCase() || tokens.find((t) => t.address === live.token)?.symbol} is live.</p>
            <code>{live.token}</code>
            {chain === 'robinhood' && <a href={PONS_TOKEN_URL(live.token)} target="_blank" rel="noreferrer">Pons</a>}
            {chain === 'robinhood' && <a href={GMGN_URL(live.token)} target="_blank" rel="noreferrer">GMGN</a>}
            <a href={explorerAddress(chain, live.token)} target="_blank" rel="noreferrer">Token</a>
            <a href={explorerTx(chain, live.hash)} target="_blank" rel="noreferrer">Launch tx</a>
            {live.linkHash && (
              <a href={explorerTx(chain, live.linkHash)} target="_blank" rel="noreferrer">Linked</a>
            )}
          </div>
        ) : null}
      />
      {chain === 'arc' && (
        <section id="trade" className="pad-panel">
          <h2>Trade</h2>
          <p className="pad-note">Buy and sell with native USDC on Arc testnet.</p>
          <label>
            Token
            <input
              value={tradeToken}
              onChange={(e) => setTradeToken(e.target.value)}
              placeholder="Token address"
            />
          </label>
          <label>
            Buy amount (USDC)
            <input value={tradeAmt} onChange={(e) => setTradeAmt(e.target.value)} />
          </label>
          <label>
            Sell amount (tokens)
            <input value={sellAmt} onChange={(e) => setSellAmt(e.target.value)} />
          </label>
          {balance != null && (
            <p className="pad-note">Your balance: {formatEther(balance)}</p>
          )}
          <div className="pf-actions">
            <button type="button" className="pad-btn solid" disabled={busy || !tradeToken} onClick={() => void trade('buy')}>
              Buy
            </button>
            <button type="button" className="pad-btn" disabled={busy || !tradeToken} onClick={() => void trade('sell')}>
              Sell
            </button>
          </div>
        </section>
      )}
      <section id="tokens">
        <h2>On this pad</h2>
        {!hasTokens && (
          <p className="pad-note">No tokens launched on this pad yet.</p>
        )}
        <ul className="pad-table">
          {live && (
            <li>
              <div>
                <strong>{ticker.toUpperCase() || shortAddr(live.token)}</strong>
                <span>{live.token}</span>
              </div>
              <div className="pad-links">
                {chain === 'robinhood' && <a href={PONS_TOKEN_URL(live.token)} target="_blank" rel="noreferrer">Pons</a>}
                {chain === 'robinhood' && <a href={GMGN_URL(live.token)} target="_blank" rel="noreferrer">GMGN</a>}
                <a href={explorerAddress(chain, live.token)} target="_blank" rel="noreferrer">Explorer</a>
              </div>
            </li>
          )}
          {listed.map((t) => (
            <li key={t.address}>
              <div>
                <strong>{t.name}</strong>
                <span>${t.symbol} · {t.address}</span>
              </div>
              <div className="pad-links">
                {chain === 'robinhood' && <a href={PONS_TOKEN_URL(t.address)} target="_blank" rel="noreferrer">Pons</a>}
                {chain === 'robinhood' && <a href={GMGN_URL(t.address)} target="_blank" rel="noreferrer">GMGN</a>}
                <a href={explorerAddress(chain, t.address)} target="_blank" rel="noreferrer">Explorer</a>
                {chain === 'arc' && (
                  <a href="#trade" onClick={() => setTradeToken(t.address)}>Trade</a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
      {err && <p className="pad-err" role="alert">{err}</p>}
    </PadChrome>
  )
}
