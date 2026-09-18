import { useEffect, useRef, useState } from 'react'
import {
  BUY,
  CA,
  TICKER,
  lookStops,
  shortCa,
  type LookPlace,
  type LookStop,
} from './lore.ts'
import { loopWhileVisible } from './raf.ts'
import { runRate, waggleHz, type SimRuntime } from './sim.ts'

const NARROW = '(max-width: 900px)'
const PLACE_MS = 11_000

function FaceCopy({ place, href }: { place: LookPlace; href: string }) {
  switch (place) {
    case 'launchpad':
      return (
        <>
          <p className="pons-tick">hive · pons</p>
          <h3>Looking at the pad</h3>
          <a className="pons-back" href={href} target="_blank" rel="noreferrer">
            Open launchpad
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
      if (!CA) {
        return (
          <>
            <p className="pons-tick">dex · gmgn</p>
            <h3>Watching the tape</h3>
            <a className="pons-back" href={href} target="_blank" rel="noreferrer">
              Open GMGN
            </a>
          </>
        )
      }
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
      if (!CA) {
        return (
          <>
            <p className="pons-tick">robinhood chain</p>
            <h3>Watching the chain</h3>
            <a className="pons-back" href={href} target="_blank" rel="noreferrer">
              Open explorer
            </a>
          </>
        )
      }
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
    <svg viewBox="0 0 48 52" fill="none">
      <ellipse cx="16" cy="22" rx="11" ry="5" stroke="currentColor" strokeWidth="1.1" opacity="0.7" />
      <ellipse cx="32" cy="22" rx="11" ry="5" stroke="currentColor" strokeWidth="1.1" opacity="0.7" />
      <ellipse cx="16" cy="26" rx="8" ry="3.6" stroke="currentColor" strokeWidth="0.9" opacity="0.5" />
      <ellipse cx="32" cy="26" rx="8" ry="3.6" stroke="currentColor" strokeWidth="0.9" opacity="0.5" />
      <ellipse cx="24" cy="16" rx="7" ry="6" fill="currentColor" />
      <ellipse cx="24" cy="27" rx="6.2" ry="7" fill="currentColor" />
      <path d="M20 32.5h8M19 35.2h10M20 37.8h8" stroke="#070604" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M19 11c-3-5-6-7-8-6M29 11c3-5 6-7 8-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M17 20c-6-1-9 2-10 6M31 20c6-1 9 2 10 6M15 24c-7 4-8 7-6 9M33 24c7 4 8 7 6 9"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <circle className="pons-eye" cx="21.4" cy="15.2" r="1.7" />
      <circle className="pons-pupil" cx="21.6" cy="15.2" r="0.7" />
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
      const kick = rt.waggle + rt.score * 0.35
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
        const maxX = Math.max(0.04, (box.width - paneBox.width - 24) / box.width)
        const maxY = Math.max(0.06, (box.height - paneBox.height - 16) / box.height)
        if (!drag.on) {
          drag.hold *= 0.985
          if (drag.hold < 0.08) {
            drag.x = 0.02 + maxX * (0.5 + 0.5 * Math.sin(t * 0.55 + kick))
            drag.y = 0.04 + maxY * 0.62 * (0.5 + 0.5 * Math.sin(t * 0.28 + 1.1))
          }
        }
        drag.x = Math.min(maxX, Math.max(0.02, drag.x))
        drag.y = Math.min(maxY, Math.max(0.02, drag.y))
        glass.style.left = `${drag.x * 100}%`
        glass.style.top = `${drag.y * 100}%`
      }
      const gx = 18 + 64 * (0.5 + 0.5 * Math.sin(t * 0.9 + rt.angle))
      const gy = 22 + 52 * (0.5 + 0.5 * Math.cos(t * 0.7 + kick))
      pupil.style.left = `${gx}%`
      pupil.style.top = `${gy}%`
      pupil.style.transform = `rotate(${-4 + Math.sin(t * 1.05 + kick) * 7}deg)`
    }
    const stopLoop = loopWhileVisible(stage, tick, 33)

    return () => {
      stopLoop()
      glass.removeEventListener('pointerdown', onDown)
      glass.removeEventListener('pointermove', onMove)
      glass.removeEventListener('pointerup', onUp)
      glass.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const theme = glassTheme(stop.id)

  return (
    <div className="look" ref={dock}>
      <div className="look-rail">
        <p className="kicker">LOOKING</p>
        <dl>
          <div>
            <dt>bearing</dt>
            <dd>{runtime.site.bearingDeg}°</dd>
          </div>
          <div>
            <dt>runs</dt>
            <dd>{runRate(runtime).toFixed(2)} / s</dd>
          </div>
          <div>
            <dt>cycle</dt>
            <dd>{waggleHz(runtime).toFixed(2)} Hz</dd>
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
