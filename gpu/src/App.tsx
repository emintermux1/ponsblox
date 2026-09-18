import { useState, type ReactNode } from 'react'
import { Fan, Wordmark } from './Mark.tsx'
import {
  BUY_URL as LORE_BUY,
  CA as LORE_CA,
  CHAIN,
  DESK,
  ERA,
  FACTS,
  FULL_NAME,
  LINE_AI,
  LINE_US,
  MEET,
  OTC_HANDLE,
  PAIR,
  PAIR_LINE,
  PROCESSOR,
  SPECS,
  STEPS,
  TAGLINE,
  TICKER,
  TOKEN_NAME,
  X_HANDLE,
  X_URL,
} from './lore.ts'
import { useInView } from './useInView.ts'

const CA = (import.meta.env.VITE_GPU_CA as string | undefined)?.trim() || LORE_CA
const BUY = (import.meta.env.VITE_GPU_BUY as string | undefined)?.trim() || LORE_BUY

function shorten(value: string) {
  if (value.length < 16) return value
  return `${value.slice(0, 4)}…${value.slice(-4)}`
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

  const caLabel = hasCa ? (copied ? 'Copied' : `CA ${shorten(CA)}`) : 'CA pending'

  return (
    <div className="page">
      <nav className="nav">
        <a className="brand" href="#top">
          <Fan className="brand-fan" />
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
            <span className="btn-full">Buy on {DESK}</span>
            <span className="btn-short">Buy</span>
          </a>
        </div>
      </nav>

      <header className="hero" id="top">
        <img className="hero-img" src="/gpu-table.jpg" alt="All-in on the felt with a hand of GPUs" />
        <div className="hero-shade" />
        <div className="grain" aria-hidden="true" />
        <div className="hero-copy">
          <p className="kicker">
            {CHAIN} · {PAIR} pair · {X_HANDLE}
          </p>
          <Wordmark className="wordmark" />
          <h1>
            {LINE_AI}
            <br />
            {LINE_US}
          </h1>
          <p className="lead">{MEET}</p>
          <p className="lead dim">{PROCESSOR}</p>
          <div className="cta">
            <a className="btn btn-lime" href={BUY} target="_blank" rel="noreferrer">
              Open {DESK}
            </a>
            <button type="button" className="btn" onClick={() => void copyCa()} disabled={!hasCa}>
              {hasCa ? (copied ? 'Copied' : 'Copy CA') : 'CA soon'}
            </button>
          </div>
        </div>
      </header>

      <ul className="specbar">
        {SPECS.map((row) => (
          <li key={row.k}>
            <span>{row.k}</span>
            <strong>{row.v}</strong>
          </li>
        ))}
      </ul>

      <section className="story" id="lore">
        <Rise className="story-shot">
          <img src="/gpu-desk.jpg" alt="Zero sleep at the battlestation" />
        </Rise>
        <Rise className="story-copy" delay={80}>
          <p className="kicker">Lore</p>
          <h2>{MEET}</h2>
          <p>{LINE_AI}</p>
          <p>{LINE_US}</p>
          <p>{PROCESSOR}</p>
          <p>{PAIR_LINE}</p>
          <dl className="meta">
            <div>
              <dt>Token</dt>
              <dd>
                {TICKER} · {FULL_NAME}
              </dd>
            </div>
            <div>
              <dt>Pair</dt>
              <dd>
                {PAIR} via {OTC_HANDLE}
              </dd>
            </div>
            <div>
              <dt>Chain</dt>
              <dd>{CHAIN}</dd>
            </div>
            <div>
              <dt>Desk</dt>
              <dd>{DESK}</dd>
            </div>
          </dl>
        </Rise>
      </section>

      <section className="floor">
        <img src="/gpu-bench.jpg" alt="The chip on the workbench" />
        <Rise className="floor-copy">
          <p className="kicker">Spec</p>
          <h2>
            {TAGLINE}
            <br />
            {ERA}
          </h2>
        </Rise>
      </section>

      <section className="facts">
        <div className="fact-grid">
          {FACTS.map((fact, i) => (
            <Rise key={fact.n} delay={i * 50}>
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
            <p className="kicker">How to plug in</p>
            <h2>{PAIR_LINE}</h2>
          </Rise>
          <ol className="steps">
            {STEPS.map((step, i) => (
              <Rise key={step.n} delay={i * 40}>
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
              Open {DESK}
            </a>
            <a className="btn" href={X_URL} target="_blank" rel="noreferrer">
              {X_HANDLE}
            </a>
          </div>
          <button type="button" className="ca-row" onClick={() => void copyCa()} disabled={!hasCa}>
            <span>Contract</span>
            <strong>{hasCa ? (copied ? 'Copied' : CA) : `Drops with the ${PAIR} pair on ${DESK}`}</strong>
          </button>
        </div>
      </section>

      <footer className="foot">
        <Wordmark className="wordmark wordmark-sm" />
        <p>
          {TICKER} · {CHAIN} · {PAIR}
        </p>
        <p className="fine">
          Meme coin. Not financial advice. Max performance. Minimum intelligence.
        </p>
      </footer>
    </div>
  )
}
