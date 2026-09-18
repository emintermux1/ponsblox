import { useState, type ReactNode } from 'react'
import { NEUROPILS, TRACTS } from './brain.ts'
import { CombField } from './CombField.tsx'
import { DanceFloor } from './DanceFloor.tsx'
import { DanceScope } from './DanceScope.tsx'
import { danceLabel, SCOUTS } from './dances.ts'
import { Glomeruli } from './Glomeruli.tsx'
import { KenyonMeters } from './KenyonMeters.tsx'
import {
  BUY,
  CA,
  CHAIN,
  dexHref,
  explorerHref,
  GLOMERULI,
  HSB_BRAINS,
  HSB_NEUROPILS,
  KENYON_TYPE_I,
  launchTxHref,
  NOBEL_YEAR,
  RULE_DIGEST,
  RULE_SEALED,
  RULE_TEXT,
  SCOUT_COUNT,
  SOURCES,
  SPECIES,
  SPECIES_RACE,
  STEPS,
  shortCa,
  TICKER,
  TOKEN_IMAGE,
  TOKEN_NAME,
  TX,
  X_HANDLE,
  X_URL,
} from './lore.ts'
import { MushroomBody } from './MushroomBody.tsx'
import { ParticleBee } from './ParticleBee.tsx'
import { PonsMirror } from './PonsMirror.tsx'
import { ScoutRails } from './ScoutRails.tsx'
import {
  alRead,
  collarRead,
  exportAudit,
  lipRead,
  mbRead,
  quorumWindows,
  runRate,
  useBeeSim,
  waggleHz,
  type LaunchPhase,
} from './sim.ts'
import { useInView } from './useInView.ts'

function Rise({ children, className }: { children: ReactNode; className?: string }) {
  const { ref, visible } = useInView<HTMLDivElement>()
  return (
    <div ref={ref} className={[className, 'rise', visible ? 'is-on' : ''].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

function phaseLabel(phase: LaunchPhase) {
  switch (phase) {
    case 'running':
      return 'THE HIVE IS BETWEEN RUNS — dance floor live'
    case 'armed':
      return 'RULE ARMED — three windows above 0.82'
    case 'signing':
      return 'THE HIVE IS SIGNING'
    case 'launched':
      return 'SIGNED — $BEEBRAIN is on the wire'
    default: {
      const _never: never = phase
      return _never
    }
  }
}

export default function App() {
  const sim = useBeeSim()
  const { runtime } = sim
  const lit = NEUROPILS.filter((row) => (runtime.lobes[row.id] ?? 0) > 0.28).length
  const [copied, setCopied] = useState(false)
  const txHref = launchTxHref()

  async function copyCa() {
    if (!CA || !navigator.clipboard) return
    await navigator.clipboard.writeText(CA)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  function downloadAudit() {
    const blob = new Blob([JSON.stringify(exportAudit(runtime), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `beebrain-${runtime.site.name.replace(' ', '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page" id="top">
      <header className="top">
        <div className="top-meta">
          <span>SPECIMEN</span>
          <span>
            {SPECIES} · {SPECIES_RACE}
          </span>
          <span>
            {SCOUT_COUNT} SCOUTS · {GLOMERULI} GLOMERULI · {KENYON_TYPE_I.toLocaleString()} KENYON I
          </span>
        </div>
        <nav>
          <a href="#lab">Laboratory</a>
          <a href="#model">Model</a>
          <a href="#token">{TICKER}</a>
          <a href={X_URL} target="_blank" rel="noreferrer">
            {X_HANDLE}
          </a>
          <a href={SOURCES[0].href} target="_blank" rel="noreferrer">
            Nobel ↗
          </a>
        </nav>
      </header>

      <section className="hero">
        <ParticleBee runtime={runtime} />
        <div className="hero-copy">
          <h1>{TOKEN_NAME}</h1>
          <p className="species">
            {SPECIES}
            <em> · {SPECIES_RACE}</em>
          </p>
        </div>
        <div className="hero-readout">
          <span>{SCOUT_COUNT} scouts</span>
          <span>{GLOMERULI} glomeruli</span>
          <span>
            {HSB_NEUROPILS} neuropils · {HSB_BRAINS} brains
          </span>
        </div>
      </section>

      <section className="lab" id="lab">
        <header className="sec">
          <p className="kicker">LIVE / HONEYBEE BRAIN</p>
          <h2>Where the hive is right now</h2>
          <p className="lede">
            A scout returns. She dances on the vertical comb: angle is the sun, duration is
            distance. {GLOMERULI} glomeruli take the odor. Kenyon cells keep the site. Every number
            here is read out of that encoding.
          </p>
        </header>

        <div className="status">
          <i className={runtime.playing ? 'on' : ''} />
          {phaseLabel(runtime.phase)}
        </div>

        <div className="controls">
          <button type="button" onClick={sim.toggle}>
            {runtime.playing ? 'Stop watching' : 'Watch the hive'}
          </button>
          <button type="button" onClick={sim.reset}>
            Reset
          </button>
          <button type="button" onClick={downloadAudit}>
            Export live audit
          </button>
          <label>
            SCOUT
            <select value={runtime.scout} onChange={(e) => sim.setScout(Number(e.target.value))}>
              {SCOUTS.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {danceLabel(row)}
                </option>
              ))}
            </select>
          </label>
          <label>
            PLAYBACK
            <select value={runtime.speed} onChange={(e) => sim.setSpeed(Number(e.target.value) as 1 | 2 | 4)}>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </select>
          </label>
        </div>

        <PonsMirror runtime={runtime} />

        <div className="metrics">
          <Metric k="BEARING" v={`${runtime.site.bearingDeg}°`} d="waggle vs vertical" />
          <Metric k="DISTANCE" v={`${runtime.site.meters} m`} d={runtime.site.kind} />
          <Metric k="WAGGLE" v={`${runtime.site.waggleS.toFixed(2)} s`} d="von Frisch curve" />
          <Metric k="RUNS / SEC" v={runRate(runtime).toFixed(2)} d={runtime.site.name} />
          <Metric k="CYCLE" v={`${waggleHz(runtime).toFixed(2)} Hz`} d="figure-eight" />
          <Metric k="QUORUM" v={runtime.score.toFixed(3)} d="line 0.82" />
          <Metric k="WINDOWS" v={`${quorumWindows(runtime)} / 3`} d="above 0.82" />
          <Metric k="MUSHROOM BODY" v={mbRead(runtime).toFixed(3)} d="Kenyon readout" />
          <Metric k="ANTENNAL LOBE" v={alRead(runtime).toFixed(3)} d={`${GLOMERULI} glomeruli`} />
          <Metric k="LIP" v={lipRead(runtime).toFixed(3)} d="odor → Kenyon" />
          <Metric k="COLLAR" v={collarRead(runtime).toFixed(3)} d="vision → Kenyon" />
          <Metric k="NEUROPILS LIT" v={`${lit} / ${NEUROPILS.length}`} d={`${TRACTS.length} tracts`} />
        </div>

        <div className="stage">
          <figure className="panel panel-rails">
            <figcaption>8 scouts · von Frisch encoding · click a row</figcaption>
            <ScoutRails runtime={runtime} onPick={sim.setScout} />
          </figure>
          <figure className="panel panel-scope">
            <figcaption>dance floor · up is the sun</figcaption>
            <DanceFloor runtime={runtime} />
          </figure>
          <figure className="panel panel-scope">
            <figcaption>CH1 waggle amplitude · CH2 bearing</figcaption>
            <DanceScope runtime={runtime} />
          </figure>
          <figure className="panel panel-skin">
            <figcaption>antennal lobe · {GLOMERULI} glomeruli</figcaption>
            <Glomeruli runtime={runtime} />
          </figure>
          <figure className="panel panel-brain">
            <figcaption>
              Honeybee Standard Brain · {NEUROPILS.length} named · paper {HSB_NEUROPILS} ·{' '}
              {KENYON_TYPE_I.toLocaleString()} Kenyon I
            </figcaption>
            <MushroomBody runtime={runtime} />
          </figure>
          <figure className="panel panel-skin">
            <figcaption>comb · vertical dance floor</figcaption>
            <CombField runtime={runtime} />
          </figure>
          <figure className="panel panel-meters">
            <figcaption>HSB neuropils · live weight</figcaption>
            <KenyonMeters runtime={runtime} />
          </figure>
        </div>

        <div className="split">
          <div className="stream">
            <p className="kicker">EVENT STREAM</p>
            <ul>
              {runtime.events.map((ev, i) => (
                <li key={`${ev.t}-${i}`} data-kind={ev.kind}>
                  <span>{(ev.t / 1000).toFixed(2)}s</span>
                  <em>{ev.kind}</em>
                  {ev.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="rule">
            <p className="kicker">SEALED RULE</p>
            <pre>{RULE_TEXT}</pre>
            <dl>
              <div>
                <dt>sealed</dt>
                <dd>{RULE_SEALED}</dd>
              </div>
              <div>
                <dt>digest</dt>
                <dd>{RULE_DIGEST}</dd>
              </div>
              <div>
                <dt>hash</dt>
                <dd>{runtime.hash || '—'}</dd>
              </div>
              <div>
                <dt>mushroom body</dt>
                <dd>{mbRead(runtime).toFixed(3)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="essay" id="model">
        <Rise>
          <p className="kicker">WHAT IT IS</p>
          <h2>Waggle, glomeruli, Kenyon cups</h2>
          <p>
            {SPECIES} tells the hive where the food is. von Frisch timed it. The {NOBEL_YEAR} Nobel
            is the receipt. On a dark vertical comb, up is the sun. The length of the waggle run is
            how far.
          </p>
          <p>
            Carniolan bees keep the round dance below about 50 m, then switch. The lecture gives the
            curve: half a second at 200 m, about four seconds at 4500 m. The eight scouts sit on
            that curve.
          </p>
          <p>
            The brain is the Honeybee Standard Brain: {HSB_BRAINS} whole-mounts, {HSB_NEUROPILS}{' '}
            neuropils, one average shape. Odor hits {GLOMERULI} glomeruli, then projection neurons,
            then the mushroom-body lip. Vision takes the collar. Kenyon cells hold the site.
          </p>
          <p>
            When dance and Kenyon readout clear the sealed line, the hive signs. {TICKER} is that
            click. The papers are linked below.
          </p>
        </Rise>
      </section>

      <section className="sources-grid">
        {SOURCES.map((src) => (
          <Rise key={src.n}>
            <article>
              <span>{src.n}</span>
              <p className="kicker">{src.kicker}</p>
              <h3>{src.title}</h3>
              <p>{src.body}</p>
              <a href={src.href} target="_blank" rel="noreferrer">
                {src.label} ↗
              </a>
            </article>
          </Rise>
        ))}
      </section>

      <section className="how">
        <p className="kicker">HOW IT GOT HERE</p>
        <ol>
          {STEPS.map((step) => (
            <li key={step.n}>
              <b>{step.n}</b>
              <div>
                <h3>{step.title}</h3>
                <small>{step.note}</small>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="token" id="token">
        <Rise>
          <div className="coin">
            <img className="coin-art" src={TOKEN_IMAGE} alt={TOKEN_NAME} width={176} height={176} />
            <div className="coin-body">
              <p className="kicker">{TICKER}</p>
              <h2>{TOKEN_NAME}</h2>
              <p className="lede">
                Launched by the hive on {CHAIN}. {CA ? 'Read the contract yourself.' : 'CA next.'}
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
                {TX && txHref ? (
                  <div>
                    <dt>Launch</dt>
                    <dd>
                      <a href={txHref} target="_blank" rel="noreferrer">
                        {shortCa(TX)}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="token-cta">
                <a className="btn" href={BUY} target="_blank" rel="noreferrer">
                  {CA ? `Buy ${TICKER}` : 'Open launchpad'}
                </a>
                {CA ? (
                  <a href={dexHref()} target="_blank" rel="noreferrer">
                    GMGN
                  </a>
                ) : null}
                <a href={explorerHref()} target="_blank" rel="noreferrer">
                  Explorer
                </a>
                <a href={X_URL} target="_blank" rel="noreferrer">
                  {X_HANDLE}
                </a>
              </div>
            </div>
          </div>
        </Rise>
      </section>

      <footer>
        <p>
          Waggle encoding: Karl von Frisch, Nobel Lecture 1973, “Decoding the Language of the Bee.”
          Nobel Prize in Physiology or Medicine {NOBEL_YEAR}, shared with Lorenz and Tinbergen.
          Honeybee Standard Brain: Brandt, Rohlfing, Rybak, Menzel 2005, J Comp Neurol. Digital
          atlas: Rybak et al. 2010, Front Syst Neurosci. Olfactory counts: Paoli & Galizia 2021,
          Cell Tissue Res — ~{GLOMERULI} glomeruli, ~{KENYON_TYPE_I.toLocaleString()} type-I Kenyon
          cells. Launch protocol: Pons v2 on Robinhood Chain. Not affiliated with the Nobel
          Foundation or Freie Universität Berlin.
        </p>
      </footer>
    </div>
  )
}

function Metric({ k, v, d }: { k: string; v: string; d: string }) {
  return (
    <div className="metric">
      <span>{k}</span>
      <strong>{v}</strong>
      <em>{d}</em>
    </div>
  )
}
