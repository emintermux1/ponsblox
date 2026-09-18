import { useEffect, useState } from 'react'
import { formatUnits, type Address, type Hash } from 'viem'
import { Connect } from '../components/Connect.tsx'
import { ErrorState } from '../components/ErrorState.tsx'
import { InspectPane } from '../components/InspectModal.tsx'
import { fetchFactory, fetchGame, rememberLaunch } from '../lib/api.ts'
import { short, txUrl } from '../lib/chain.ts'
import { classifyLaunchFail } from '../lib/errors.ts'
import { clampCreatorTaxBps, failMessage } from '../lib/format.ts'
import { finalTokenName, suggestName, suggestTicker, type GameListing } from '../lib/games.ts'
import { encodePegDescription } from '../lib/metadata.ts'
import { fetchIpfsStatus, pinGameArt, type IpfsPin } from '../lib/ipfs.ts'
import { clearPendingLaunch, readPendingLaunch, writePendingLaunch } from '../lib/pending.ts'
import {
  buildLaunchCall,
  checkLogo,
  LOGO_MAX_BYTES,
  readCanLaunch,
  sendLaunch,
  type FactoryStatus,
} from '../lib/pons.ts'
import { navigate, onNavClick, tokenPath } from '../lib/router.ts'
import { useWallet } from '../lib/wallet.tsx'

type Step = 'game' | 'token' | 'review' | 'deploy'

function nextStep(step: Step): Step {
  switch (step) {
    case 'game': return 'token'
    case 'token': return 'review'
    case 'review': return 'deploy'
    case 'deploy': return 'deploy'
    default: {
      const _e: never = step
      return _e
    }
  }
}

function prevStep(step: Step): Step {
  switch (step) {
    case 'game': return 'game'
    case 'token': return 'game'
    case 'review': return 'token'
    case 'deploy': return 'review'
    default: {
      const _e: never = step
      return _e
    }
  }
}

function artLogo(game: GameListing, pin: IpfsPin | null): string {
  const fits = (s: string) => new TextEncoder().encode(s).length <= LOGO_MAX_BYTES
  if (pin?.uri && fits(pin.uri)) return pin.uri
  const shortArt = `${location.origin}/api/art?id=${encodeURIComponent(game.id)}`
  if (/^https:\/\//i.test(shortArt) && fits(shortArt)) return shortArt
  if (game.image && /^https:\/\//i.test(game.image) && fits(game.image)) return game.image
  return shortArt
}

export function Launch({ gameId }: { gameId: string }) {
  const w = useWallet()
  const [step, setStep] = useState<Step>(gameId ? 'token' : 'game')
  const [picked, setPicked] = useState<GameListing | null>(null)
  const [lookup, setLookup] = useState(gameId)
  const [err, setErr] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [taxPct, setTaxPct] = useState(2)
  const [quoteIn, setQuoteIn] = useState('')
  const [factory, setFactory] = useState<FactoryStatus | null>(null)
  const [can, setCan] = useState<boolean | null>(null)
  const [lines, setLines] = useState<string[]>([])
  const [live, setLive] = useState<{ token: Address; hash: Hash } | null>(null)
  const [busy, setBusy] = useState(false)
  const [logoPin, setLogoPin] = useState<IpfsPin | null>(null)

  useEffect(() => {
    void fetchFactory().then((f) => setFactory({
      approved: true,
      phantomQuote: '0',
      graduationThreshold: '0',
      graduationRblx: f.graduationRblx,
      decimals: 18,
      launchFee: '0',
      launchFeeEth: f.launchFeeEth,
      launchEnabled: f.launchEnabled,
      maxCreatorTaxBps: f.maxCreatorTaxBps,
      launchConfigEnabled: true,
    })).catch((e: Error) => setErr(e.message))
  }, [])

  useEffect(() => {
    if (!gameId) return
    void fetchGame(gameId).then((g) => {
      setPicked(g)
      setName((cur) => cur || suggestName(g.name))
      setSymbol((cur) => cur || suggestTicker(g.name))
      setStep('token')
    }).catch((e: Error) => setErr(e.message))
  }, [gameId])

  useEffect(() => {
    if (!w.address) { setCan(null); return }
    void readCanLaunch(w.address).then(setCan).catch(() => setCan(null))
  }, [w.address])

  useEffect(() => {
    setLogoPin(null)
    const id = picked?.id
    if (!id) return
    let alive = true
    void fetchIpfsStatus()
      .then((s) => (s.configured ? pinGameArt(id) : null))
      .then((pin) => { if (alive && pin) setLogoPin(pin) })
      .catch(() => {})
    return () => { alive = false }
  }, [picked?.id])

  const logo = picked ? artLogo(picked, logoPin) : ''
  const website = picked?.url || ''
  const logoErr = logo ? checkLogo(logo) : null

  async function resolveGame() {
    setErr(null)
    try {
      const g = await fetchGame(lookup.trim())
      setPicked(g)
      setName(suggestName(g.name))
      setSymbol(suggestTicker(g.name))
      navigate(`/launch?game=${encodeURIComponent(g.id)}`)
      setStep('token')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function deploy() {
    if (!picked || !w.walletClient || !w.address) {
      setErr('Connect a wallet on Robinhood Chain first.')
      return
    }
    if (!w.onRightChain) {
      setErr('Wallet is not on Robinhood Chain (4663).')
      return
    }
    setBusy(true)
    setErr(null)
    setLines([])
    const log = (s: string) => setLines((cur) => [...cur, s])
    try {
      log('reading Roblox CCU')
      const fresh = await fetchGame(picked.id)
      setPicked(fresh)
      const desc = encodePegDescription({
        name: fresh.name,
        universeId: fresh.id,
        playing: fresh.playing,
      })
      const draft = {
        name: finalTokenName(name),
        symbol: symbol.trim().toUpperCase(),
        logo,
        description: desc,
        website,
        twitter: '',
        telegram: '',
        creatorTaxBps: clampCreatorTaxBps(Math.round(taxPct * 100), factory?.maxCreatorTaxBps),
        buybackEnabled: false,
        quoteIn: quoteIn.trim(),
        recipient: w.address,
      }
      log('building launch call')
      const call = await buildLaunchCall(draft)
      log(`launch fee ${formatUnits(call.launchFee, 18)} ETH`)
      const receipt = await sendLaunch(w.walletClient, w.address, call, log, (hash) => {
        writePendingLaunch({
          hash,
          name: draft.name,
          symbol: draft.symbol,
          gameId: fresh.id,
          universeId: fresh.id,
          startedAt: Date.now(),
        })
      })
      log('✓ LIVE on Pons')
      await rememberLaunch({
        token: receipt.token,
        curve: receipt.curve,
        hash: receipt.hash,
        deployer: w.address,
        universeId: fresh.id,
        gameId: fresh.id,
        gameName: fresh.name,
        playing: fresh.playing,
        quotedAt: new Date().toISOString(),
      }).catch(() => {})
      clearPendingLaunch()
      setLive({ token: receipt.token, hash: receipt.hash })
    } catch (e) {
      const fail = classifyLaunchFail((e as Error).message)
      setErr(fail.title)
      log(failMessage((e as Error).message))
    } finally {
      setBusy(false)
    }
  }

  const pending = readPendingLaunch()

  return (
    <main className="studio">
      <header className="studio__bar">
        <a href="/" onClick={onNavClick('/')}>RobloxPad</a>
        <ol className="progress">
          {(['game', 'token', 'review', 'deploy'] as const).map((id) => (
            <li key={id} className={step === id ? 'on' : ''}>{id}</li>
          ))}
        </ol>
        <div className="row" style={{ margin: 0 }}>
          <Connect />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/games')}>Exit</button>
        </div>
      </header>

      <div className="studio__grid">
        <section className="studio__main">
          <ErrorState error={err} />
          <div key={step} className="step-enter">
          {step === 'game' && (
            <>
              <p className="kicker">01 Game</p>
              <h1>Pick the game they play.</h1>
              <p className="muted">Title, universe id, or a roblox.com/games URL.</p>
              <input className="field" value={lookup} placeholder="Adopt Me or https://www.roblox.com/games/…" onChange={(e) => setLookup(e.target.value)} />
              <div className="row">
                <button type="button" className="btn btn--fire" onClick={() => void resolveGame()}>Use this game</button>
                <a className="btn btn--ghost" href="/games" onClick={onNavClick('/games')}>Open games</a>
              </div>
            </>
          )}

          {step === 'token' && picked && (
            <>
              <p className="kicker">02 Token</p>
              <h1>Name it.</h1>
              <label className="label">Name
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              {name.trim() && (
                <p className="muted tiny">Deploys on-chain as: <strong>{finalTokenName(name)}</strong></p>
              )}
              <label className="label">Ticker
                <input className="field" value={symbol} maxLength={11} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
              </label>
              <label className="label">Creator tax %
                <input className="field" type="number" min={0} max={10} step={0.1} value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))} />
              </label>
              <label className="label">First buy (ETH, optional)
                <input className="field" value={quoteIn} placeholder="0.05" onChange={(e) => setQuoteIn(e.target.value)} />
              </label>
              {logoErr && <p className="err">{logoErr}</p>}
            </>
          )}

          {step === 'review' && picked && (
            <>
              <p className="kicker">03 Review</p>
              <h1>One transaction on Pons.</h1>
              <dl className="kv">
                <div><dt>Game</dt><dd>{picked.name}</dd></div>
                <div><dt>Playing now</dt><dd>{picked.playing.toLocaleString('en-US')}</dd></div>
                <div><dt>Name (on-chain)</dt><dd>{finalTokenName(name)}</dd></div>
                <div><dt>Ticker</dt><dd>{symbol}</dd></div>
                <div>
                  <dt>Website (set automatically)</dt>
                  <dd><a href={website} target="_blank" rel="noreferrer">Roblox game ↗</a></dd>
                </div>
                <div><dt>Launch fee</dt><dd>{factory ? `${factory.launchFeeEth} ETH` : '…'}</dd></div>
                <div><dt>Wallet</dt><dd className="mono">{w.address ? short(w.address) : 'Not connected'}</dd></div>
              </dl>
            </>
          )}

          {step === 'deploy' && (
            <>
              <p className="kicker">04 Deploy</p>
              <h1>{live ? 'Live on Pons' : 'Sign in your wallet'}</h1>
              {live ? (
                <div className="success">
                  <p>Token {short(live.token)}</p>
                  <a className="btn btn--fire" href={tokenPath(live.token)} onClick={onNavClick(tokenPath(live.token))}>Open token</a>
                  <a className="btn btn--ghost" href={txUrl(live.hash)} target="_blank" rel="noreferrer">Explorer</a>
                </div>
              ) : (
                <>
                  {!w.address && <p className="muted">Connect MetaMask on Robinhood Chain (4663).</p>}
                  {w.address && !w.onRightChain && (
                    <button type="button" className="btn btn--ghost" onClick={() => void w.switchChain()}>Switch to Robinhood</button>
                  )}
                  {can === false && (
                    <p className="muted">This wallet cannot launch on Pons right now — launching is paused or restricted.</p>
                  )}
                  <button type="button" className="btn btn--fire" disabled={busy || !w.address || can === false} onClick={() => void deploy()}>
                    {busy ? 'Waiting on wallet…' : 'Launch'}
                  </button>
                  {pending && (
                    <p className="muted">Saved hash {short(pending.hash)} — do not send another launch until you check the explorer.</p>
                  )}
                </>
              )}
              <div className="term" aria-live="polite">
                {(lines.length ? lines : ['Ready.']).map((l, i) => (
                  <span key={`${i}-${l}`} className="term__line">{l}</span>
                ))}
              </div>
            </>
          )}
          </div>

          <div className="studio__dock">
            {step !== 'game' && !live && (
              <button type="button" className="btn btn--ghost" onClick={() => setStep(prevStep(step))}>Back</button>
            )}
            {step !== 'deploy' && picked && (
              <button type="button" className="btn btn--fire" onClick={() => setStep(nextStep(step))}>Continue</button>
            )}
          </div>
        </section>
        <aside className="studio__side">
          {picked ? <InspectPane game={picked} /> : <p className="muted">Pick a game. Launch on it.</p>}
        </aside>
      </div>
    </main>
  )
}
