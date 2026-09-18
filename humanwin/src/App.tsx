import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { loadBank } from './bank.ts'
import { Fight, type Pad } from './game.ts'
import { BUY, CA, TICKER, TOKEN_NAME, X_HANDLE, X_URL, shortCa } from './lore.ts'

function padBind(fight: { current: Fight | null }, kind: Pad, click = false) {
  return {
    onPointerDown: (ev: PointerEvent<HTMLButtonElement>) => {
      ev.preventDefault()
      fight.current?.press(kind, true)
    },
    onPointerUp: () => fight.current?.press(kind, false),
    onPointerCancel: () => fight.current?.press(kind, false),
    onPointerLeave: () => fight.current?.press(kind, false),
    onClick: click ? () => fight.current?.press(kind, true) : undefined,
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fightRef = useRef<Fight | null>(null)
  const [bank, setBank] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setBank(loadBank())
    const canvas = canvasRef.current
    if (!canvas) return
    const fight = new Fight(canvas, { onBank: setBank })
    fightRef.current = fight
    canvas.focus()
    return () => {
      fight.destroy()
      fightRef.current = null
    }
  }, [])

  async function copyCa() {
    if (!CA || !navigator.clipboard) return
    await navigator.clipboard.writeText(CA)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="app">
      <header className="bar">
        <a className="brand" href="#top">
          {TOKEN_NAME}
        </a>
        <div className="meta">
          <div className="coin">
            <span>{TICKER}</span>
            <strong>{bank.toLocaleString()}</strong>
          </div>
          <button type="button" onClick={() => void copyCa()} disabled={!CA}>
            {CA ? (copied ? 'Copied' : `CA ${shortCa(CA)}`) : 'CA soon'}
          </button>
          <a className="buy" href={BUY} target="_blank" rel="noreferrer">
            Buy {TICKER}
          </a>
          <a href={X_URL} target="_blank" rel="noreferrer">
            {X_HANDLE}
          </a>
        </div>
      </header>
      <main className="stage">
        <canvas ref={canvasRef} tabIndex={0} aria-label="Humans vs AI war to save the world" />
      </main>
      <div className="pads">
        <div className="row move">
          <button type="button" {...padBind(fightRef, 'left')}>
            ◀
          </button>
          <button type="button" {...padBind(fightRef, 'right')}>
            ▶
          </button>
        </div>
        <div className="row acts">
          <button type="button" className="cover" {...padBind(fightRef, 'cover')}>
            COVER
          </button>
          <button type="button" className="pistol" {...padBind(fightRef, 'pistol', true)}>
            PISTOL
          </button>
          <button type="button" className="rifle" {...padBind(fightRef, 'rifle', true)}>
            RIFLE
          </button>
          <button type="button" className="rocket" {...padBind(fightRef, 'rocket', true)}>
            ROCKET
          </button>
        </div>
      </div>
      <p className="help">
        Humans vs AI. Save the world. Win the war. The coin is yours. {TICKER}.
      </p>
    </div>
  )
}
