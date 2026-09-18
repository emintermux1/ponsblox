import { useState, type ReactNode } from 'react'
import { AxonRails } from './AxonRails.tsx'
import { BrainMap } from './BrainMap.tsx'
import { ChromatophoreSkin } from './ChromatophoreSkin.tsx'
import { LOBES, PATHWAYS } from './connectome.ts'
import {
  AXON_COUNT,
  BUY,
  CA,
  CHAIN,
  dexHref,
  explorerHref,
  launchTxHref,
  KNOWN_PATHWAYS,
  NOBEL_YEAR,
  NOVEL_PATHWAYS,
  RULE_DIGEST,
  RULE_SEALED,
  RULE_TEXT,
  SAMPLE_HZ,
  SOURCES,
  SPECIES_AXON,
  SPECIES_BRAIN,
  STEPS,
  shortCa,
  TICKER,
  TOKEN_IMAGE,
  TOKEN_NAME,
  TX,
  TOTAL_PATHWAYS,
  TRIAL_COUNT,
  X_HANDLE,
  X_URL,
} from './lore.ts'
import { LobeMeters } from './LobeMeters.tsx'
import { Matrix } from './Matrix.tsx'
import { Oscilloscope } from './Oscilloscope.tsx'
import { ParticleSquid } from './ParticleSquid.tsx'
import { PonsMirror } from './PonsMirror.tsx'
import { chromaHz, exportAudit, firing, useSquidSim, type LaunchPhase } from './sim.ts'
import { trialsFor } from './trials.ts'
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
      return 'THE SQUID IS BETWEEN RUNS — membrane live'
    case 'armed':
      return 'RULE ARMED — three windows above 0.82'
    case 'signing':
      return 'THE SQUID IS SIGNING'
    case 'launched':
      return 'SIGNED — $SQUIDMIND is on the wire'
    default: {
      const _never: never = phase
      return _never
    }
  }
}

export default function App() {
  const sim = useSquidSim()
  const { runtime } = sim
  const selected = runtime.axons[runtime.axon - 1]
  const motor = CHROMA_IDS_AVG(runtime)
  const lit = LOBES.filter((row) => (runtime.lobes[row.id] ?? 0) > 0.28).length
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
    a.download = `squidmind-${runtime.trial.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page" id="top">
      <header className="top">
        <div className="top-meta">
          <span>SPECIMEN</span>
          <span>{SPECIES_AXON} · GIANT AXON</span>
          <span>
            {AXON_COUNT} AXONS · {TRIAL_COUNT} TRIALS · {SAMPLE_HZ.toLocaleString()} Hz
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
        <ParticleSquid runtime={runtime} />
        <div className="hero-copy">
          <h1>{TOKEN_NAME}</h1>
          <p className="species">
            {SPECIES_AXON}
            <em> · {SPECIES_BRAIN}</em>
          </p>
        </div>
        <div className="hero-readout">
          <span>{AXON_COUNT} axons</span>
          <span>{TRIAL_COUNT} trials</span>
          <span>
            {KNOWN_PATHWAYS} + {NOVEL_PATHWAYS} pathways
          </span>
        </div>
      </section>

      <section className="lab" id="lab">
        <header className="sec">
          <p className="kicker">LIVE / GIANT AXON</p>
          <h2>Where the squid is right now</h2>
          <p className="lede">
            A current goes in through eight giant axons. Hodgkin–Huxley integrates. {TOTAL_PATHWAYS} pathways
            light. Chromatophores open. Every number on this panel is read out of the running membrane.
          </p>
        </header>

        <div className="status">
          <i className={runtime.playing ? 'on' : ''} />
          {phaseLabel(runtime.phase)}
        </div>

        <div className="controls">
          <button type="button" onClick={sim.toggle}>
            {runtime.playing ? 'Stop watching' : 'Watch the squid'}
          </button>
          <button type="button" onClick={sim.reset}>
            Reset
          </button>
          <button type="button" onClick={downloadAudit}>
            Export live audit
          </button>
          <label>
            AXON
            <select value={runtime.axon} onChange={(e) => sim.setAxon(Number(e.target.value))}>
              {Array.from({ length: 8 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  axon {i + 1} · {trialsFor(i + 1).length} trials
                </option>
              ))}
            </select>
          </label>
          <label>
            TRIAL
            <select value={runtime.trial.id} onChange={(e) => sim.setTrial(e.target.value)}>
              {trialsFor(runtime.axon).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.id} · {row.stimulus}
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
          <Metric k="MEMBRANE" v={`${selected.v.toFixed(1)} mV`} d="Hodgkin–Huxley V" />
          <Metric k="GATES" v={`m ${selected.m.toFixed(2)}  h ${selected.h.toFixed(2)}  n ${selected.n.toFixed(2)}`} d="Na / K" />
          <Metric k="SPIKES / SEC" v={firing(runtime).toFixed(1)} d={`${runtime.trial.id}`} />
          <Metric k="CHROMATOPHORE" v={`${chromaHz(runtime).toFixed(2)} Hz`} d="motor flicker" />
          <Metric k="MOTOR SCORE" v={runtime.score.toFixed(3)} d="line 0.82" />
          <Metric k="LOBES LIT" v={`${lit} / ${LOBES.length}`} d={`${PATHWAYS.length} edges`} />
        </div>

        <div className="stage">
          <figure className="panel panel-rails">
            <figcaption>8-channel giant axon · click a row</figcaption>
            <AxonRails runtime={runtime} onPick={sim.setAxon} />
          </figure>
          <figure className="panel panel-scope">
            <figcaption>clamp · CH1 membrane · CH2 stimulus</figcaption>
            <Oscilloscope runtime={runtime} />
          </figure>
          <figure className="panel panel-skin">
            <figcaption>chromatophore motor · radial muscles</figcaption>
            <ChromatophoreSkin runtime={runtime} />
          </figure>
          <figure className="panel panel-brain">
            <figcaption>
              {SPECIES_BRAIN} · units + tracts · {KNOWN_PATHWAYS} known · {NOVEL_PATHWAYS} new
            </figcaption>
            <BrainMap runtime={runtime} />
          </figure>
          <figure className="panel panel-matrix">
            <figcaption>lobe × lobe · Chung 2020 matrix</figcaption>
            <Matrix runtime={runtime} />
          </figure>
          <figure className="panel panel-meters">
            <figcaption>named lobes · live weight</figcaption>
            <LobeMeters runtime={runtime} />
          </figure>
        </div>

        <div className="split">
          <div className="stream">
            <p className="kicker">EVENT STREAM</p>
            <ul>
              {runtime.events.map((ev, i) => (
                <li key={`${ev.t}-${i}`}>
                  <span>{(ev.t / 1000).toFixed(2)}s</span>
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
                <dt>chromatophore motor</dt>
                <dd>{motor.toFixed(3)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="essay" id="model">
        <Rise>
          <p className="kicker">WHAT IT IS</p>
          <h2>A real membrane, a real map, a real skin</h2>
          <p>
            The giant axon of {SPECIES_AXON} is how the action potential was written down. Hodgkin and Huxley
            measured it; the {NOBEL_YEAR} Nobel is the receipt. The live trace is that membrane: sodium gates,
            potassium gates, leak, current in, voltage out.
          </p>
          <p>
            The eight fibres and {TRIAL_COUNT} trials are the PhysioNet SGAMP archive — the same records used to
            study noisy pacemaker switching. Pick an axon. Pick a trial. Pulse or PSC. The stimulus class is the
            class in the database.
          </p>
          <p>
            The brain is the first MRI mesoscale connectome of a squid: {KNOWN_PATHWAYS} known tracts recovered
            from Young, {NOVEL_PATHWAYS} new pathways, most of them visual–motor, ending on the chromatophore
            lobes. When the axon spikes, those roads light.
          </p>
          <p>
            The colour is command. Chromatophores are pigment cells pulled by radial muscles, driven by motor
            neurons. Feature patches flicker faster than background. The field above is that motor score, painted.
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
                Launched by the squid on {CHAIN}. {CA ? 'Read the contract yourself.' : 'CA next.'}
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
          Giant axon electrophysiology: Paydarfar, Forger, Clay · PhysioNet SGAMP. Membrane: Hodgkin & Huxley
          1952 · Nobel Prize in Physiology or Medicine {NOBEL_YEAR}. Connectome: Chung, Kurniawan, Marshall 2020,
          iScience. Chromatophores: Suzuki et al. 2011, PLoS One. Launch protocol: Pons v2 on Robinhood Chain.
          Not affiliated with the Nobel Foundation, PhysioNet, or the University of Queensland.
        </p>
      </footer>
    </div>
  )
}

function CHROMA_IDS_AVG(runtime: ReturnType<typeof useSquidSim>['runtime']) {
  const ids = ['adC_L', 'adC_R', 'avC_L', 'avC_R', 'pC_L', 'pC_R']
  return ids.reduce((sum, id) => sum + (runtime.lobes[id] ?? 0), 0) / ids.length
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
