import { useEffect, useState } from 'react'
import { Briefing } from './Briefing.tsx'
import { LiveBrain } from './LiveBrain.tsx'
import {
  CLAIM,
  CLAIM_HEAD,
  INTRO,
  MODEL,
  PARTNER,
  PORTRAIT,
  PORTRAIT_FALLBACK,
  PRODUCT,
  SUBJECT,
  SYSTEMS,
  VENUE,
  lobeLabel,
  phaseLabel,
} from './lore.ts'
import { parseSitePath, pathHref, type SitePath } from './route.ts'
import { useTrumpSim } from './sim.ts'

function meterPct(n: number) {
  return `${Math.round(n * 100)}`
}

function go(path: SitePath) {
  const href = pathHref(path)
  window.history.pushState({ path }, '', href)
}

export default function App() {
  const sim = useTrumpSim()
  const { runtime, live } = sim
  const [sitePath, setSitePath] = useState<SitePath>(() =>
    parseSitePath(window.location.pathname),
  )
  const meters = [
    { lobe: 'speech' as const, value: runtime.speech },
    { lobe: 'decision' as const, value: runtime.decision },
    { lobe: 'attention' as const, value: runtime.attention },
    { lobe: 'memory' as const, value: runtime.memory },
    { lobe: 'briefing' as const, value: runtime.briefing },
  ]

  useEffect(() => {
    function onPop() {
      setSitePath(parseSitePath(window.location.pathname))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function openPath(path: SitePath) {
    go(path)
    setSitePath(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="page" id="top" data-path={sitePath}>
      <header className="nav">
        <a
          className="wordmark"
          href={pathHref('t1')}
          onClick={(ev) => {
            ev.preventDefault()
            openPath('t1')
          }}
        >
          {PRODUCT}
        </a>
        <nav>
          <a
            href={pathHref('t1')}
            onClick={(ev) => {
              ev.preventDefault()
              openPath('t1')
            }}
          >
            {INTRO}
          </a>
          <a
            href={pathHref('t1')}
            onClick={(ev) => {
              ev.preventDefault()
              openPath('t1')
            }}
          >
            {MODEL}
          </a>
          <a href="#brain">Brain</a>
          <a href="#brief">Brief</a>
        </nav>
      </header>

      <section className="deck">
        <div className="deck-claim">
          <p className="film-live">
            <span className="live-dot" aria-hidden />
            {INTRO} · {PRODUCT} · with {PARTNER}
          </p>
          <h1>{CLAIM_HEAD}</h1>
          <p className="claim">{CLAIM}</p>
        </div>
        <figure className="deck-brain" id="brain">
          <figcaption>
            {MODEL} · modeled brain
            <span>
              {phaseLabel(runtime.phase)} · lock {meterPct(runtime.lock)}
            </span>
          </figcaption>
          <LiveBrain live={live} />
          <ol className="brain-bins" aria-hidden>
            {runtime.bins.map((bin, i) => (
              <li key={i} style={{ transform: `scaleY(${0.18 + bin * 0.82})` }} />
            ))}
          </ol>
        </figure>
        <aside className="deck-still">
          <img
            src={PORTRAIT}
            alt={`${SUBJECT}, official portrait, public domain`}
            width={800}
            height={1000}
            onError={(ev) => {
              ev.currentTarget.src = PORTRAIT_FALLBACK
            }}
          />
          <div className="still-veil" aria-hidden />
          <div className="still-copy">
            <p className="film-live">
              <span className="live-dot" aria-hidden />
              {INTRO}
            </p>
            <h2>{MODEL}</h2>
            <p>
              {PRODUCT}
              <em> · {VENUE}</em>
            </p>
          </div>
          <ul className="meters">
            {meters.map((row) => (
              <li key={row.lobe}>
                <span>{lobeLabel(row.lobe)}</span>
                <i style={{ transform: `scaleX(${0.08 + row.value * 0.92})` }} />
                <b>{meterPct(row.value)}</b>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="launch" id="model">
        <p className="eyebrow">{PRODUCT} × {PARTNER}</p>
        <h2>The next model. The cheapest model.</h2>
        <p>
          T-1 is the flagship of Trump AI — a cognitive model of Donald J. Trump, newly developed in
          DJT and brought into the world with OpenAI. Decision, rhetoric, memory, briefing. One
          stack. One brain.
        </p>
      </section>

      <Briefing onBrief={sim.openBrief} speaking={runtime.phase === 'speak'} />

      <section className="systems">
        <div className="systems-head">
          <p className="eyebrow">{MODEL}</p>
          <h2>Four systems. One brain.</h2>
          <p>
            T-1 is not a costume on a chatbot. It is a structured cognitive stack — how he frames a
            choice, how he speaks it, what he already holds, and how a brief becomes a line.
          </p>
        </div>
        <ol>
          {SYSTEMS.map((sys) => (
            <li key={sys.lobe}>
              <p className="eyebrow">{lobeLabel(sys.lobe)}</p>
              <h3>{sys.title}</h3>
              <p>{sys.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="plaza" id="plaza">
        <p className="eyebrow">{VENUE}</p>
        <h2>The venue for Trump’s brain.</h2>
        <p>
          DJT is the house. T-1 is what sits on the desk. The model was newly developed here,
          with OpenAI — and this is where it runs.
        </p>
        <dl>
          <div>
            <dt>Product</dt>
            <dd>{PRODUCT}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{MODEL}</dd>
          </div>
          <div>
            <dt>With</dt>
            <dd>{PARTNER}</dd>
          </div>
        </dl>
      </section>

      <footer className="foot">
        <a href={pathHref('t1')} onClick={(ev) => { ev.preventDefault(); openPath('t1') }}>
          {PRODUCT}
        </a>
        <div>
          <a href="https://humanatlas.io/3d-reference-library" target="_blank" rel="noreferrer">
            HRA brain · CC BY 4.0
          </a>
          <span>Official portrait · public domain</span>
          <a href={pathHref('t1')} onClick={(ev) => { ev.preventDefault(); openPath('t1') }}>
            {MODEL}
          </a>
        </div>
      </footer>
    </div>
  )
}
