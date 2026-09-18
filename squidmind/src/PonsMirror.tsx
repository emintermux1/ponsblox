import { useEffect, useRef, useState } from 'react'
import { loopWhileVisible } from './raf.ts'
import {
  BUY,
  CA,
  TICKER,
  lookStops,
  shortCa,
  type LookPlace,
  type LookStop,
} from './lore.ts'
import { chromaHz, firing, type SimRuntime } from './sim.ts'

const NARROW = '(max-width: 900px)'
const PLACE_MS = 11_000

function FaceCopy({ place, href }: { place: LookPlace; href: string }) {
  switch (place) {
    case 'launchpad':
      return (
        <>
          <span className="pons-miss" aria-hidden />
          <h3>Token unavailable</h3>
          <a className="pons-back" href={href} target="_blank" rel="noreferrer">
            Back to explore
          </a>
        </>
      )
    case 'token':
      return (
        <>
          <p className="pons-tick">{TICKER}</p>
          <h3>{CA}</h3>
          <a className="pons-back" href={BUY} target="_blank" rel="noreferrer">
            Open on Pons
          </a>
        </>
      )
    case 'dex':
      return (
        <>
          <p className="pons-tick">dex · gmgn</p>
          <h3>{TICKER}</h3>
          <p className="pons-ca">{shortCa(CA)}</p>
          <a className="pons-back" href={href} target="_blank" rel="noreferrer">
            Trade on GMGN
          </a>
        </>
      )
    case 'explorer':
      return (
        <>
          <p className="pons-tick">robinhood chain</p>
          <h3>{shortCa(CA)}</h3>
          <a className="pons-back" href={href} target="_blank" rel="noreferrer">
            View contract
          </a>
        </>
      )
    default: {
      const _never: never = place
      return _never
    }
  }
}

function glassTheme(place: LookPlace) {
  switch (place) {
    case 'launchpad':
    case 'token':
      return ''
    case 'dex':
      return 'is-dex'
    case 'explorer':
      return 'is-explorer'
    default: {
      const _never: never = place
      return _never
    }
  }
}

function GazeMark() {
  return (
    <svg viewBox="-2 0 46 58" fill="none">
      <g transform="rotate(-36 20 22)">
        <path fill="currentColor" d="M12 16 6 13l7 8M28 16l6-3-7 8" />
        <path
          fill="currentColor"
          d="M20 2c-7 5-10 14-8 23 1 5 4 7 8 8 4-1 7-3 8-8 2-9-1-18-8-23Z"
        />
        <ellipse cx="20" cy="35.2" rx="5.1" ry="4.6" fill="currentColor" />
        <circle className="pons-eye" cx="23.1" cy="34.6" r="1.7" />
        <circle className="pons-pupil" cx="23.5" cy="34.6" r="0.75" />
        <path
          d="M16.2 38.4c-4 3-8 4-11 2.4M17 39c-3.2 6-5.4 11-6.2 14M18.6 39.4c-1.6 7-2.4 12-2.6 15M20.2 39.6c.6 7 1.6 12 2.8 15M21.8 39.2c3.4 6 6.8 10 9.4 12M23.4 38.4c5 3 9 3.4 12 1.6"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
        />
        <path
          d="M16 38.6c-7 6-12 9-15.4 8.2M23.6 38.6c3.2 8 2.2 14 .2 17.6"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
        />
        <ellipse fill="currentColor" cx="0.4" cy="46.6" rx="1.55" ry="0.95" transform="rotate(-24 0.4 46.6)" />
        <ellipse fill="currentColor" cx="23.6" cy="56.4" rx="1.7" ry="1" transform="rotate(-18 23.6 56.4)" />
      </g>
    </svg>
  )
}

export function PonsMirror({ runtime }: { runtime: SimRuntime }) {
  const dock = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const gaze = useRef<HTMLDivElement>(null)
  const live = useRef(runtime)
  live.current = runtime

  const stops = lookStops()
  const [index, setIndex] = useState(0)
  const stop: LookStop = stops[index] ?? stops[0]

  useEffect(() => {
    if (stops.length < 2) return
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % stops.length)
    }, PLACE_MS)
    return () => window.clearInterval(id)
  }, [stops.length])

  useEffect(() => {
    const host = dock.current
    const pane = card.current
    const dot = gaze.current
    if (!host || !pane || !dot) return
    const stage = host
    const glass = pane
    const pupil = dot
    const mq = window.matchMedia(NARROW)

    const drag = { on: false, x: 0.12, y: 0.1, hold: 0 }

    function onDown(ev: PointerEvent) {
      if (mq.matches) return
      if ((ev.target as HTMLElement).closest('a, button')) return
      drag.on = true
      drag.hold = 1
      glass.setPointerCapture(ev.pointerId)
    }
    function onMove(ev: PointerEvent) {
      if (!drag.on) return
      const box = stage.getBoundingClientRect()
      drag.x = Math.min(0.58, Math.max(0.02, drag.x + ev.movementX / box.width))
      drag.y = Math.min(0.42, Math.max(0.02, drag.y + ev.movementY / box.height))
    }
    function onUp() {
      drag.on = false
    }

    glass.addEventListener('pointerdown', onDown)
    glass.addEventListener('pointermove', onMove)
    glass.addEventListener('pointerup', onUp)
    glass.addEventListener('pointercancel', onUp)

    let layoutAt = 0
    let box = stage.getBoundingClientRect()
    let paneBox = glass.getBoundingClientRect()
    const tick = (now: number) => {
      const rt = live.current
      const t = now * 0.001
      const v = rt.axons[rt.axon - 1]?.v ?? -65
      const kick = Math.max(0, (v + 20) / 80) + rt.score * 0.35
      const docked = mq.matches
      stage.classList.toggle('look--docked', docked)
      if (docked) {
        glass.style.left = ''
        glass.style.top = ''
      } else {
        if (now - layoutAt > 80) {
          layoutAt = now
          box = stage.getBoundingClientRect()
          paneBox = glass.getBoundingClientRect()
        }
        const maxX = Math.max(0.02, (box.width - paneBox.width - 200) / box.width)
        const maxY = Math.max(0.02, (box.height - paneBox.height - 16) / box.height)
        if (!drag.on) {
          drag.hold *= 0.985
          if (drag.hold < 0.08) {
            drag.x = 0.03 + maxX * (0.5 + 0.5 * Math.sin(t * 0.42 + kick))
            drag.y = 0.06 + maxY * 0.28 * (0.5 + 0.5 * Math.sin(t * 0.18 + 1.1))
          }
        }
        drag.x = Math.min(maxX, Math.max(0.02, drag.x))
        drag.y = Math.min(maxY, Math.max(0.02, drag.y))
        glass.style.left = `${drag.x * 100}%`
        glass.style.top = `${drag.y * 100}%`
      }
      const gx = 18 + 64 * (0.5 + 0.5 * Math.sin(t * 0.9 + v * 0.03))
      const gy = 22 + 52 * (0.5 + 0.5 * Math.cos(t * 0.7 + kick))
      pupil.style.left = `${gx}%`
      pupil.style.top = `${gy}%`
      pupil.style.transform = `rotate(${-4 + Math.sin(t * 1.05 + kick) * 7}deg)`
    }
    const stop = loopWhileVisible(stage, tick, 33)

    return () => {
      stop()
      glass.removeEventListener('pointerdown', onDown)
      glass.removeEventListener('pointermove', onMove)
      glass.removeEventListener('pointerup', onUp)
      glass.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const selected = runtime.axons[runtime.axon - 1]
  const theme = glassTheme(stop.id)

  return (
    <div className="look" ref={dock}>
      <div className="look-rail">
        <p className="kicker">LOOKING</p>
        <dl>
          <div>
            <dt>membrane</dt>
            <dd>{selected.v.toFixed(1)} mV</dd>
          </div>
          <div>
            <dt>spikes</dt>
            <dd>{firing(runtime).toFixed(1)} / s</dd>
          </div>
          <div>
            <dt>motor</dt>
            <dd>{chromaHz(runtime).toFixed(2)} Hz</dd>
          </div>
          <div>
            <dt>score</dt>
            <dd>{runtime.score.toFixed(3)}</dd>
          </div>
        </dl>
        <a className="look-note" href={stop.href} target="_blank" rel="noreferrer">
          open {stop.brand} ↗
        </a>
      </div>

      <article className={['pons-glass', theme].filter(Boolean).join(' ')} ref={card}>
        <header className="pons-bar">
          <a href={stop.href} target="_blank" rel="noreferrer">
            {stop.brand}
          </a>
          <nav>
            <a href={stop.href} target="_blank" rel="noreferrer">
              {stop.nav}
            </a>
          </nav>
          <a className="pons-connect" href={stop.href} target="_blank" rel="noreferrer">
            Connect
          </a>
        </header>
        <div className="pons-body">
          <FaceCopy place={stop.id} href={stop.href} />
        </div>
        <div className="pons-gaze" ref={gaze} aria-hidden>
          <GazeMark />
        </div>
      </article>
    </div>
  )
}
