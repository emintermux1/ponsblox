import { useEffect, useState } from 'react'
import { isAddress, type Address } from 'viem'
import { CopyButton } from '../components/CopyButton.tsx'
import { ErrorState } from '../components/ErrorState.tsx'
import { InspectPane } from '../components/InspectModal.tsx'
import { PlayerSpark } from '../components/Spark.tsx'
import { fetchGame, fetchLaunch } from '../lib/api.ts'
import { addressUrl, gmgnUrl, short, tokenUrl } from '../lib/chain.ts'
import { fmtRblx, fmtUsd, tokenUsdFromEth } from '../lib/format.ts'
import { formatPlayers, type GameListing } from '../lib/games.ts'
import { feesPath, gamePath, onNavClick } from '../lib/router.ts'
import { readToken, type TokenRecord } from '../lib/pons.ts'

export function TokenPage({ address }: { address: string }) {
  const [token, setToken] = useState<TokenRecord | null>(null)
  const [game, setGame] = useState<GameListing | null>(null)
  const [ethUsd, setEthUsd] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [launchPlaying, setLaunchPlaying] = useState<number | null>(null)

  useEffect(() => {
    if (!isAddress(address)) { setErr('Not an address'); return }
    let live = true
    void (async () => {
      const rec = await readToken(address as Address)
      if (!live) return
      if (!rec) { setErr('Not a Pons V2 launch.'); return }
      setToken(rec)
      const indexed = await fetchLaunch(address).catch(() => null)
      const hash = rec.skinHash || indexed?.universeId || indexed?.gameId
      if (indexed?.playing != null) setLaunchPlaying(indexed.playing)
      if (hash) {
        const listing = await fetchGame(indexed?.gameId || hash).catch(() => null)
        if (live) setGame(listing)
      }
      const pulse = await fetch('/api/markets').then((r) => r.json()).catch(() => null) as { ethUsd?: number } | null
      if (live) setEthUsd(pulse?.ethUsd ?? null)
    })().catch((e: Error) => { if (live) setErr(e.message) })
    return () => { live = false }
  }, [address])

  const tokenUsd = tokenUsdFromEth(token?.priceRblx, ethUsd)
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
              <p className="kicker">Playing now</p>
              <strong>{game ? formatPlayers(game.playing) : '—'}</strong>
              <p className="muted">{game?.name || 'Roblox CCU'}</p>
            </div>
            <div className="peg-card">
              <p className="kicker">At launch</p>
              <strong>{launchPlaying != null ? formatPlayers(launchPlaying) : '—'}</strong>
              <p className="muted">Players when it launched</p>
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
                <dt>Paired universe</dt>
                <dd><a href={gamePath(game?.id || token.skinHash)} onClick={onNavClick(gamePath(game?.id || token.skinHash))}>{token.skinHash}</a></dd>
              </div>
            )}
            {game && (
              <div>
                <dt>Roblox</dt>
                <dd><a href={game.url} target="_blank" rel="noreferrer">Open game ↗</a></dd>
              </div>
            )}
          </dl>
          {game && <PlayerSpark gameId={game.id} playing={game.playing} likeRatio={game.likeRatio} />}
          {game && <InspectPane game={game} />}
          {!game && token.skinHash && <p className="muted">Paired to universe {token.skinHash}.</p>}
          {!game && !token.skinHash && <p className="muted">No ROBLOXPAD pair line on this token. It may not have been launched here.</p>}
        </>
      )}
    </main>
  )
}
