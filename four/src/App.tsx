import { useState, type ReactNode } from 'react'
import { Embers } from './Embers.tsx'
import { FourHand, Wordmark } from './Logo.tsx'
import {
  BUY_URL as LORE_BUY,
  CA as LORE_CA,
  CHAIN,
  CHECKS,
  FACTS,
  LAUNCH,
  LORE,
  MASCOT,
  PAIR,
  PAIR_LINE,
  PLATFORM,
  STEPS,
  TAGLINE,
  TOKEN_NAME,
  X_HANDLE,
  X_URL,
} from './lore.ts'
import { useInView } from './useInView.ts'

const CA = (import.meta.env.VITE_FOUR_CA as string | undefined)?.trim() || LORE_CA
const BUY = (import.meta.env.VITE_FOUR_BUY as string | undefined)?.trim() || LORE_BUY

function shorten(value: string) {
  if (value.length < 16) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function Rise({
  children,
  className,
  delay,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const { ref, visible } = useInView<HTMLDivElement>()
  const cls = [className, 'rise', visible ? 'is-on' : ''].filter(Boolean).join(' ')
  return (
    <div ref={ref} className={cls} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  )
}

export default function App() {
  const [copied, setCopied] = useState(false)
  const hasCa = Boolean(CA)

  async function copyCa() {
    if (!hasCa || !navigator.clipboard) return
    await navigator.clipboard.writeText(CA)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const caLabel = hasCa ? (copied ? 'Copied' : `CA ${shorten(CA)}`) : 'CA dropping'

  return (
    <div className="page">
      <nav className="nav">
        <a className="brand" href="#top">
          <FourHand className="brand-hand" />
          {TOKEN_NAME}
        </a>
        <div className="nav-right">
          <a href="#lore">Lore</a>
          <a href="#buy">Buy</a>
          <a href={X_URL} target="_blank" rel="noreferrer">
            {X_HANDLE}
          </a>
          <button type="button" className="ghost" onClick={() => void copyCa()} disabled={!hasCa}>
            {caLabel}
          </button>
          <a className="btn btn-nav" href={BUY} target="_blank" rel="noreferrer">
            <span className="btn-full">Buy on {PLATFORM}</span>
            <span className="btn-short">Buy</span>
          </a>
        </div>
      </nav>

      <header className="hero" id="top">
        <img className="hero-img" src="/hamster-strike.png" alt="Four Hamster, OpenFour’s mascot on BSC" />
        <div className="hero-shade" />
        <Embers />
        <div className="hero-copy">
          <p className="kicker">
            {LAUNCH} · {CHAIN}
          </p>
          <Wordmark className="wordmark" />
          <h1>{TAGLINE}</h1>
          <p className="lead">{PAIR_LINE}</p>
          <div className="cta">
            <a className="btn btn-lime" href={BUY} target="_blank" rel="noreferrer">
              Ape on OpenFour
            </a>
            <button type="button" className="btn" onClick={() => void copyCa()} disabled={!hasCa}>
              {hasCa ? (copied ? 'Copied' : 'Copy CA') : 'CA soon'}
            </button>
          </div>
          <ul className="pills">
            {CHECKS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </header>

      <section className="story" id="lore">
        <Rise className="story-shot">
          <img src="/hamster-fine.png" alt="Four Hamster sitting through the trenches while everything burns" />
          <p className="stamp">this is fine</p>
        </Rise>
        <Rise className="story-copy" delay={80}>
          <p className="kicker">Lore</p>
          <h2>Meet {MASCOT}.</h2>
          {LORE.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <dl className="meta">
            <div>
              <dt>Mascot</dt>
              <dd>{MASCOT}</dd>
            </div>
            <div>
              <dt>Pair</dt>
              <dd>{PAIR}</dd>
            </div>
            <div>
              <dt>Chain</dt>
              <dd>{CHAIN}</dd>
            </div>
            <div>
              <dt>Launch</dt>
              <dd>
                {LAUNCH} · {PLATFORM}
              </dd>
            </div>
          </dl>
        </Rise>
      </section>

      <section className="facts" id="facts">
        <Rise>
          <p className="kicker">Four things</p>
          <h2>Every ecosystem needs a mascot.</h2>
        </Rise>
        <div className="fact-grid">
          {FACTS.map((fact, i) => (
            <Rise key={fact.n} delay={i * 60}>
              <article className="fact">
                <p className="fact-n">{fact.n}</p>
                <h3>{fact.title}</h3>
                <p>{fact.body}</p>
              </article>
            </Rise>
          ))}
        </div>
      </section>

      <section className="buy" id="buy">
        <div className="buy-panel">
          <Rise>
            <p className="kicker">How to ape</p>
            <h2>Paired with {PAIR}.</h2>
            <p className="lead">
              {MASCOT} on {LAUNCH}. Buy on {PLATFORM} when the listing is live.
            </p>
          </Rise>
          <ol className="steps">
            {STEPS.map((step, i) => (
              <Rise key={step.n} delay={i * 50}>
                <li>
                  <span>{step.n}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </li>
              </Rise>
            ))}
          </ol>
          <div className="cta">
            <a className="btn btn-lime" href={BUY} target="_blank" rel="noreferrer">
              Open {PLATFORM}
            </a>
            <a className="btn" href={X_URL} target="_blank" rel="noreferrer">
              Follow the drop
            </a>
          </div>
          <button type="button" className="ca-row" onClick={() => void copyCa()} disabled={!hasCa}>
            <span>Contract</span>
            <strong>{hasCa ? (copied ? 'Copied' : CA) : `Drops with the ${PAIR} pair`}</strong>
          </button>
        </div>
      </section>

      <footer className="foot">
        <Wordmark className="wordmark wordmark-sm" />
        <p>
          {MASCOT} · {CHAIN} · {PAIR}
        </p>
        <p className="fine">
          Meme coin. Not financial advice. Four Hamster sits. Everything else burns.
        </p>
      </footer>
    </div>
  )
}
