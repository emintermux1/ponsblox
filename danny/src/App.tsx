import { useState, type ReactNode } from 'react'
import {
  BEATS, CA as LORE_CA, CHECKS, SOURCES, TAGLINE, TICKER, TOKEN_NAME, TRAIL, X_HANDLE, X_URL,
} from './lore.ts'
import { useInView } from './useInView.ts'

const CA = (import.meta.env.VITE_DANNY_CA as string | undefined)?.trim() || LORE_CA

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

  async function copyCa() {
    if (!CA || !navigator.clipboard) return
    await navigator.clipboard.writeText(CA)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="page">
      <nav className="nav">
        <a className="brand" href="#top">{TOKEN_NAME}</a>
        <div className="nav-right">
          <a href={X_URL} target="_blank" rel="noreferrer">{X_HANDLE}</a>
          <button type="button" className="nav-ticker nav-ca" onClick={() => void copyCa()}>
            {copied ? 'Copied' : `CA ${shorten(CA)}`}
          </button>
          <a className="nav-ticker" href="#danny">{TICKER}</a>
        </div>
      </nav>

      <header className="board" id="top">
        <img className="board-bg" src="/danny-court.jpg" alt="" />
        <div className="board-dim" />

        <p className="scribble scribble-tl">how we found him</p>

        <article className="pin pin-milan">
          <img src="/eth-milan.png" alt="ETH Milan 2024 panel" />
          <p className="quote">“My name is Ozzy, I’m the founder at Roots.”</p>
          <span>ETH Milan 2024</span>
        </article>

        <article className="pin pin-git">
          <p className="pin-kicker">public handle</p>
          <h3>meetg0d</h3>
          <p>Ships as Ozzy. Next stamp on the trail.</p>
          <a href="https://github.com/meetg0d" target="_blank" rel="noreferrer">GitHub</a>
        </article>

        <div className="danny-hero">
          <img src="/danny-court.jpg" alt="Danny, the Pons family dog" />
          <p className="crown" aria-hidden="true">♛</p>
        </div>

        <p className="marker-name">Danny</p>
        <p className="marker-sub">the pons family dog</p>

        <article className="pin pin-roots">
          <p className="pin-kicker">roots</p>
          <h3>@rootsfi</h3>
          <p>The stage name sticks. Ozzy. Roots. Same pin.</p>
          <a href="https://x.com/rootsfi" target="_blank" rel="noreferrer">Open</a>
        </article>

        <article className="pin pin-pons">
          <p className="pin-kicker">pons</p>
          <h3>@ponsdotfamily</h3>
          <p>Same founder the trenches already called Ozzy.</p>
          <a href="https://x.com/ponsdotfamily" target="_blank" rel="noreferrer">Open</a>
        </article>

        <button type="button" className="pin pin-ca" onClick={() => void copyCa()}>
          <p className="pin-kicker">contract</p>
          <h3>{copied ? 'Copied' : 'CA'}</h3>
          <p>{shorten(CA)}</p>
        </button>

        <article className="pin pin-post">
          <img src="/danny-post.jpg" alt="The old public post of Danny" />
          <p className="scribble found">found him ♡</p>
        </article>

        <ul className="checklist">
          {CHECKS.map((item) => (
            <li key={item}>
              <span aria-hidden="true">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <figure className="polaroid tiny">
          <img src="/danny-banner.jpg" alt="Danny collage" />
          <figcaption>family first ♡</figcaption>
        </figure>
      </header>

      <section className="intro">
        <p className="eyebrow">{TICKER} · {TOKEN_NAME}</p>
        <h1>How We Found the Pons Family Dog</h1>
        <p className="lead">
          ETH Milan → Ozzy / Roots → Pons → an old post → Danny.
          A public trail. A white frenchie with a crown over his head.
        </p>
        <p className="tag">{TAGLINE}</p>
        <a className="btn" href="#danny">Meet Danny</a>
      </section>

      <ol className="trail">
        {TRAIL.map((step, i) => (
          <li key={step}>
            <a href={i === TRAIL.length - 1 ? '#danny' : `#beat-${BEATS[i]?.n}`}>{step}</a>
            {i < TRAIL.length - 1 ? <span aria-hidden="true">→</span> : null}
          </li>
        ))}
      </ol>

      <section className="lore" id="file">
        <Rise>
          <p className="eyebrow">The board</p>
          <h2>Every pin leads to the dog.</h2>
        </Rise>

        <div className="beats">
          {BEATS.map((beat, i) => (
            <Rise key={beat.n} delay={i * 40}>
              <article className="beat" id={`beat-${beat.n}`}>
                <p className="card-n">{beat.n}</p>
                <div>
                  <p className="note">{beat.note}</p>
                  <h3>{beat.title}</h3>
                  <p>{beat.body}</p>
                  <a href={beat.source.href} target="_blank" rel="noreferrer">{beat.source.label}</a>
                </div>
                {beat.image ? <img src={beat.image} alt={beat.alt || beat.title} /> : null}
              </article>
            </Rise>
          ))}
        </div>
      </section>

      <section className="reveal" id="danny">
        <img className="reveal-photo" src="/danny-court.jpg" alt="Danny standing on the court" />
        <Rise className="reveal-copy">
          <p className="eyebrow">Case closed</p>
          <h2>Meet Danny, the Pons Family Dog</h2>
          <p>
            White frenchie. Black patch over the right eye. Brown collar.
            Ozzy’s dog. The Pons family dog. His name is Danny.
          </p>
          <p className="tag">{TAGLINE}</p>
          <ul className="facts">
            <li>Token · {TOKEN_NAME}</li>
            <li>Ticker · {TICKER}</li>
            <li>House · Pons family</li>
            <li>X · {X_HANDLE}</li>
            <li>CA · {shorten(CA)}</li>
          </ul>
          <button type="button" className="btn btn-ca" onClick={() => void copyCa()}>
            {copied ? 'Copied' : CA}
          </button>
        </Rise>
      </section>

      <footer className="foot">
        <ul className="sources">
          {SOURCES.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noreferrer">{s.label}</a>
            </li>
          ))}
        </ul>
        <p>{TOKEN_NAME} · {TICKER} · {X_HANDLE}</p>
        <p className="foot-ca">{CA}</p>
      </footer>
    </div>
  )
}
