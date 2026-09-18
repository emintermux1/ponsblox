import { useState, type ReactNode } from 'react'
import { ABOUT, BUY_URL as LORE_BUY, CA as LORE_CA, DESK, FEE_BODY, FEE_HEAD, LINE, PAIR, RILIE_ETH, TAPE, TICKER, TOKEN_NAME, X_HANDLE, X_URL } from './lore.ts'

const CA = (import.meta.env.VITE_GMEGIRL_CA as string | undefined)?.trim() || LORE_CA
const BUY = (import.meta.env.VITE_GMEGIRL_BUY as string | undefined)?.trim() || LORE_BUY
const RILIE = (import.meta.env.VITE_RILIE_ETH as string | undefined)?.trim() || RILIE_ETH

function shorten(value: string) {
  if (value.length < 16) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function Buy({ children, className }: { children: ReactNode; className?: string }) {
  if (BUY) {
    return (
      <a className={className} href={BUY} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  }
  return (
    <a className={className} href="#buy">
      {children}
    </a>
  )
}

export default function App() {
  const [copied, setCopied] = useState<'ca' | 'rilie' | null>(null)
  const hasCa = Boolean(CA)

  async function copy(kind: 'ca' | 'rilie', value: string) {
    if (!value || !navigator.clipboard) return
    await navigator.clipboard.writeText(value)
    setCopied(kind)
    window.setTimeout(() => setCopied(null), 1600)
  }

  return (
    <div className="page">
      <nav className="nav">
        <a className="brand" href="#top">
          <span>GAME</span>
          <span className="stop">STOP</span>
          <span> GIRL</span>
        </a>
        <div className="nav-right">
          <a href="#wall">Memes</a>
          <a href="#fees">The DM</a>
          <a href={X_URL} target="_blank" rel="noreferrer">
            {X_HANDLE}
          </a>
          {hasCa ? (
            <button type="button" className="ghost" onClick={() => void copy('ca', CA)}>
              {copied === 'ca' ? 'Copied' : `CA ${shorten(CA)}`}
            </button>
          ) : null}
          <Buy className="btn btn-nav">BUY {TICKER}</Buy>
        </div>
      </nav>

      <header className="hero" id="top">
        <img className="hero-banner" src="/gme-girl.png" alt="GME Girl" />
        <div className="hero-bar">
          <div>
            <p className="kicker">
              {TICKER} · {PAIR} · {DESK}
            </p>
            <p className="line">{LINE}</p>
          </div>
          <p className="pairs">
            <b>{TICKER}</b>
            <b>{PAIR}</b>
          </p>
          <div className="hero-cta">
            <Buy className="btn">BUY {TICKER}</Buy>
            <a className="ghost" href={X_URL} target="_blank" rel="noreferrer">
              {X_HANDLE}
            </a>
            <a className="ghost" href="#fees">
              See the DM
            </a>
          </div>
        </div>
      </header>

      <div className="tape" aria-hidden="true">
        <div className="tape-track">
          {[0, 1].map((loop) => (
            <p key={loop}>
              {TAPE.map((item, i) => (
                <span key={`${loop}-${i}`}>{item}</span>
              ))}
            </p>
          ))}
        </div>
      </div>

      <section className="wall" id="wall" aria-label="Memes">
        <figure>
          <img src="/meme-upgrade.jpg" alt="Upgrade to GameStop Girl" />
          <figcaption>Best Buy → GameStop. Perfect.</figcaption>
        </figure>
        <figure>
          <img src="/meme-sure.jpg" alt="Are you sure? Yes." />
          <figcaption>Are you sure? Yes.</figcaption>
        </figure>
      </section>

      <section className="fees" id="fees">
        <div className="fees-copy">
          <p className="kicker">The DM · @riliehuntley</p>
          <h2>{FEE_HEAD}</h2>
          <p>{FEE_BODY}</p>
          <button type="button" className="addr" onClick={() => void copy('rilie', RILIE)}>
            {copied === 'rilie' ? 'Copied' : RILIE}
          </button>
        </div>
        <figure className="dm">
          <img src="/instagram-dm.jpg" alt="Instagram DM with Rilie Huntley" />
        </figure>
      </section>

      <section className="about" id="buy">
        {ABOUT.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <div className="about-row">
          <Buy className="btn">BUY {TICKER}</Buy>
          <a className="ghost" href={X_URL} target="_blank" rel="noreferrer">
            {X_HANDLE}
          </a>
          {hasCa ? (
            <button type="button" className="ghost" onClick={() => void copy('ca', CA)}>
              {copied === 'ca' ? 'Copied' : CA}
            </button>
          ) : (
            <button type="button" className="ghost" onClick={() => void copy('rilie', RILIE)}>
              {copied === 'rilie' ? 'Copied' : 'Copy Rilie ETH'}
            </button>
          )}
        </div>
      </section>

      <footer className="foot">
        <p>
          {TOKEN_NAME} · {TICKER} · {PAIR} ·{' '}
          <a href={X_URL} target="_blank" rel="noreferrer">
            {X_HANDLE}
          </a>
        </p>
        <button type="button" className="foot-addr" onClick={() => void copy('ca', CA)}>
          CA {shorten(CA)}
        </button>
      </footer>
    </div>
  )
}
