import { useEffect, useState } from 'react'
import { LiveBrain } from './LiveBrain.tsx'
import { LiveFeed } from './LiveFeed.tsx'
import {
  BUY,
  CA,
  CHAIN,
  CLAIM,
  CLAIM_HEAD,
  DEMO_MONTH,
  dexHref,
  explorerHref,
  lookStops,
  NEURALINK_UPDATE,
  PONS_LAUNCHPAD,
  shortCa,
  SUBJECT,
  TICKER,
  TOKEN_IMAGE,
  TOKEN_NAME,
  YT_WATCH,
  type LookPlace,
  type LookStop,
} from './lore.ts'
import { MindCourt } from './MindCourt.tsx'
import { MoonStrip } from './MoonStrip.tsx'
import { usePagerSim } from './sim.ts'

const LOOK_MS = 11_000

function lookHeadline(place: LookPlace) {
  switch (place) {
    case 'launchpad':
      return 'Looking at the pad.'
    case 'token':
      return CA
    case 'dex':
      return TICKER
    case 'explorer':
      return CA ? shortCa(CA) : 'Watching the chain'
    default: {
      const _never: never = place
      return _never
    }
  }
}

function lookAction(place: LookPlace) {
  switch (place) {
    case 'launchpad':
      return 'Open launchpad'
    case 'token':
      return 'Open on Pons'
    case 'dex':
      return 'Trade on GMGN'
    case 'explorer':
      return 'View contract'
    default: {
      const _never: never = place
      return _never
    }
  }
}

function LookCard() {
  const stops = lookStops()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (stops.length < 2) return
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % stops.length)
    }, LOOK_MS)
    return () => window.clearInterval(id)
  }, [stops.length])

  const stop: LookStop = stops[index] ?? stops[0]

  return (
    <article className="look">
      <p className="eyebrow">Looking</p>
      <p className="look-brand">{stop.brand}</p>
      <h3>{lookHeadline(stop.id)}</h3>
      {CA && stop.id === 'dex' ? <p className="look-ca">{shortCa(CA)}</p> : null}
      <a href={stop.href} target="_blank" rel="noreferrer">
        {lookAction(stop.id)} ↗
      </a>
    </article>
  )
}

export default function App() {
  const sim = usePagerSim()
  const { runtime, live } = sim
  const [copied, setCopied] = useState(false)

  async function copyCa() {
    if (!CA || !navigator.clipboard) return
    await navigator.clipboard.writeText(CA)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="page" id="top">
      <header className="nav">
        <a className="wordmark" href="#top">
          Pager
        </a>
        <nav>
          <a href="#brain">Brain</a>
          <a href="#mindpong">MindPong</a>
          <a href="#live">Tape</a>
          <a href="#moon">Moon</a>
          <a href="#token">{TICKER}</a>
          {CA ? (
            <a href={BUY} target="_blank" rel="noreferrer">
              Buy
            </a>
          ) : null}
        </nav>
      </header>

      <section className="deck">
        <div className="deck-claim">
          <p className="film-live">
            <span className="live-dot" aria-hidden />
            Live brain data · {SUBJECT}
          </p>
          <h1>{CLAIM_HEAD}</h1>
          <p className="claim">{CLAIM}</p>
        </div>
        <figure className="deck-brain" id="brain">
          <figcaption>
            Live brain data · motor cortex · {SUBJECT}
            <span>
              lock {Math.round(runtime.confidence * 100)} · rally {runtime.rallies}
              {runtime.hitSide ? ` · ${runtime.hitSide}` : ''}
            </span>
          </figcaption>
          <LiveBrain live={live} />
          <ol className="brain-bins" aria-hidden>
            {runtime.bins.map((bin, i) => (
              <li key={i} style={{ transform: `scaleY(${0.18 + bin * 0.82})` }} />
            ))}
          </ol>
        </figure>
        <LiveFeed panel />
        <div className="deck-court" id="mindpong">
          <div className="demo-score">
            <span>You {runtime.youScore}</span>
            <span>
              {SUBJECT} {runtime.pagerScore}
            </span>
          </div>
          <div className="demo-court">
            <MindCourt live={live} aim={sim.aim} setAspect={sim.setAspect} />
          </div>
          <div className="demo-bar">
            <button type="button" onClick={sim.toggle}>
              {runtime.playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" onClick={sim.reset}>
              Reset
            </button>
            <span>W/S · arrows · drag</span>
          </div>
        </div>
      </section>

      <MoonStrip />

      <section className="block quiet" id="token">
        <LookCard />
        <div className="coin">
          <img className="coin-art" src={TOKEN_IMAGE} alt={TOKEN_NAME} width={176} height={176} />
          <div className="coin-body">
            <p className="eyebrow">{TICKER}</p>
            <h2>{TOKEN_NAME}</h2>
            <p>
              Named for {SUBJECT} on {CHAIN}. {DEMO_MONTH}.{' '}
              {CA ? 'Read the contract yourself.' : 'CA next.'}
            </p>
            <dl className="coin-facts">
              <div>
                <dt>CA</dt>
                <dd>
                  {CA ? (
                    <button type="button" onClick={() => void copyCa()}>
                      {copied ? 'Copied' : CA}
                    </button>
                  ) : (
                    'pending'
                  )}
                </dd>
              </div>
              <div>
                <dt>Ticker</dt>
                <dd>{TICKER}</dd>
              </div>
              <div>
                <dt>Chain</dt>
                <dd>{CHAIN}</dd>
              </div>
            </dl>
            <p className="story-links">
              <a href={BUY} target="_blank" rel="noreferrer">
                {CA ? `Buy ${TICKER}` : 'Pons launchpad'}
              </a>
              {CA ? (
                <a href={dexHref()} target="_blank" rel="noreferrer">
                  GMGN
                </a>
              ) : null}
              <a href={explorerHref()} target="_blank" rel="noreferrer">
                Explorer
              </a>
            </p>
          </div>
        </div>
      </section>

      <footer className="foot">
        <a href="#top">Pager</a>
        <div>
          <a href="https://humanatlas.io/3d-reference-library" target="_blank" rel="noreferrer">
            HRA brain · CC BY 4.0
          </a>
          <a href="https://science.nasa.gov/resource/earths-moon-3d-model/" target="_blank" rel="noreferrer">
            NASA moon
          </a>
          <a href={NEURALINK_UPDATE} target="_blank" rel="noreferrer">
            Neuralink
          </a>
          <a href={YT_WATCH} target="_blank" rel="noreferrer">
            Film
          </a>
          <a href={PONS_LAUNCHPAD} target="_blank" rel="noreferrer">
            Pons
          </a>
        </div>
      </footer>
    </div>
  )
}
