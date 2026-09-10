import { useEffect, useState } from 'react'
import { isAddress, type Address } from 'viem'
import { CopyButton } from '../components/CopyButton.tsx'
import { DriftBadge } from '../components/DriftBadge.tsx'
import { ErrorState } from '../components/ErrorState.tsx'
import { InspectPane } from '../components/InspectModal.tsx'
import { fetchLaunch, fetchSkin } from '../lib/api.ts'
import { computeDrift, tokenUsdFromEth } from '../lib/drift.ts'
import { addressUrl, gmgnUrl, short, tokenUrl } from '../lib/chain.ts'
import { fmtRblx, fmtUsd } from '../lib/format.ts'
import { feesPath, onNavClick, skinPath } from '../lib/router.ts'
import { readToken, type TokenRecord } from '../lib/pons.ts'
import { PriceSpark } from '../components/Spark.tsx'
import { quoteSourceLabel, steamListingUrl, type SkinListing } from '../lib/skins.ts'

export function TokenPage({ address }: { address: string }) {
  const [token, setToken] = useState<TokenRecord | null>(null)
  const [skin, setSkin] = useState<SkinListing | null>(null)
  const [ethUsd, setEthUsd] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [launchQuote, setLaunchQuote] = useState<number | null>(null)

  useEffect(() => {
    if (!isAddress(address)) { setErr('Not an address'); return }
    let live = true
    void (async () => {
      const rec = await readToken(address as Address)
      if (!live) return
      if (!rec) { setErr('Not a Pons V2 launch.'); return }
      setToken(rec)
      const indexed = await fetchLaunch(address).catch(() => null)
      const hash = rec.skinHash || indexed?.marketHashName
      if (indexed?.quoteUsd != null) setLaunchQuote(indexed.quoteUsd)
      if (hash) {
        const listing = await fetchSkin(indexed?.skinId || hash).catch(() => null)
        if (live) setSkin(listing)
      }
      const pulse = await fetch('/api/markets').then((r) => r.json()).catch(() => null) as { ethUsd?: number } | null
      if (live) setEthUsd(pulse?.ethUsd ?? null)
    })().catch((e: Error) => { if (live) setErr(e.message) })
    return () => { live = false }
  }, [address])

  const tokenUsd = tokenUsdFromEth(token?.priceRblx, ethUsd)
  const skinUsd = skin?.quoteUsd ?? launchQuote
  const drift = computeDrift(tokenUsd, skinUsd ?? null)
  const sold = token && BigInt(token.totalSupply || '0') > 0n && BigInt(token.sellableTokens || '0') >= 0n
    ? Number(BigInt(token.totalSupply) - BigInt(token.tokenReserve || '0')) / Number(BigInt(token.totalSupply))
    : 0

  return (
    <main className="page token-page">
      <ErrorState error={err} />
      {token && (
        <>
          <p className="kicker">{token.graduated ? 'Graduated' : 'On the curve'} · {token.symbol}</p>
          <h1>{token.name}</h1>
          <div className="token-actions">
            <CopyButton value={token.token} label="Copy CA" />
            <a className="btn btn--ghost btn--sm" href={gmgnUrl(token.token)} target="_blank" rel="noreferrer">Trade on GMGN</a>
            <a className="btn btn--ghost btn--sm" href={tokenUrl(token.token)} target="_blank" rel="noreferrer">Explorer</a>
            <a className="btn btn--ghost btn--sm" href={feesPath(token.token)} onClick={onNavClick(feesPath(token.token))}>Fees</a>
          </div>
          <div className="peg-grid">
            <div className="peg-card">
              <p className="kicker">Token</p>
              <strong>{fmtUsd(tokenUsd)}</strong>
              <p className="muted">{fmtRblx(token.priceRblx)} ETH</p>
            </div>
            <div className="peg-card">
              <p className="kicker">Skin</p>
              <strong>{fmtUsd(skinUsd)}</strong>
              <p className="muted">{skin ? quoteSourceLabel(skin.quoteSource) : 'launch quote'}</p>
            </div>
            <div className="peg-card">
              <p className="kicker">Drift</p>
              <DriftBadge drift={drift} />
              <p className="muted">±5% counts as on peg. Nothing trades against it.</p>
            </div>
          </div>
          <div className="curve">
            <p>Curve progress {token.graduated ? '100%' : `${Math.max(0, Math.min(100, Math.round(sold * 100)))}%`}</p>
            <div className="bar"><i style={{ width: token.graduated ? '100%' : `${Math.max(0, Math.min(100, sold * 100))}%` }} /></div>
            <p className="muted">Graduation seeds a Uniswap v4 pool. Liquidity is locked permanently.</p>
          </div>
          <dl className="kv">
            <div><dt>Creator</dt><dd className="mono"><a href={addressUrl(token.deployer)} target="_blank" rel="noreferrer">{short(token.deployer, 6)}</a></dd></div>
            <div><dt>Fee recipient</dt><dd className="mono">{short(token.creatorFeeRecipient, 6)}</dd></div>
            <div><dt>Creator tax</dt><dd>{token.creatorTaxBps / 100}%</dd></div>
            {token.skinHash && (
              <div>
                <dt>Peg</dt>
                <dd><a href={skinPath(skin?.id || token.skinHash)} onClick={onNavClick(skinPath(skin?.id || token.skinHash))}>{token.skinHash}</a></dd>
              </div>
            )}
            {token.skinHash && (
              <div>
                <dt>Steam</dt>
                <dd><a href={steamListingUrl(skin?.marketHashName || token.skinHash)} target="_blank" rel="noreferrer">View listing ↗</a></dd>
              </div>
            )}
            {launchQuote != null && <div><dt>Median at launch</dt><dd>{fmtUsd(launchQuote)}</dd></div>}
          </dl>
          {skin && <PriceSpark skinId={skin.id} />}
          {skin && <InspectPane skin={skin} />}
          {!skin && token.skinHash && <p className="muted">Pegged to {token.skinHash}. Listing is outside the current top 300 — the peg still holds.</p>}
          {!skin && !token.skinHash && <p className="muted">No SKINPAD peg line on this token. It may not have been launched here.</p>}
        </>
      )}
    </main>
  )
}
