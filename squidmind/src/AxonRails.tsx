import { useEffect, useRef, type MouseEvent } from 'react'
import { canvasDpr, loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

export function AxonRails({
  runtime,
  onPick,
}: {
  runtime: SimRuntime
  onPick: (n: number) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const live = useRef(runtime)
  live.current = runtime

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
    if (!ctx) return

    const draw = () => {
      const rt = live.current
      const parent = canvas.parentElement
      const w = parent?.clientWidth ?? 960
      const h = parent?.clientHeight ?? 300
      const dpr = canvasDpr(w)
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#050605'
      ctx.fillRect(0, 0, w, h)

      const rowH = h / 8
      ctx.font = '10px "IBM Plex Mono", monospace'
      for (let a = 0; a < 8; a++) {
        const y0 = a * rowH
        const selected = a === rt.axon - 1
        if (selected) {
          ctx.fillStyle = 'rgba(184,255,106,0.06)'
          ctx.fillRect(0, y0, w, rowH)
        }
        ctx.strokeStyle = 'rgba(184,255,106,0.06)'
        ctx.beginPath()
        ctx.moveTo(0, y0 + rowH)
        ctx.lineTo(w, y0 + rowH)
        ctx.stroke()

        ctx.fillStyle = selected ? '#b8ff6a' : 'rgba(210,168,140,0.55)'
        ctx.fillText(`A${a + 1}`, 10, y0 + 14)
        ctx.fillStyle = 'rgba(210,168,140,0.4)'
        ctx.fillText(`${rt.spikes[a]} spk`, 10, y0 + 26)
        const v = rt.axons[a]?.v ?? 0
        ctx.fillText(`${v.toFixed(0)} mV`, w - 58, y0 + 14)

        const trace = rt.traces[a] ?? []
        ctx.beginPath()
        ctx.strokeStyle = selected ? '#b8ff6a' : 'rgba(184,255,106,0.38)'
        ctx.lineWidth = selected ? 1.4 : 1
        for (let i = 0; i < trace.length; i++) {
          const x = 64 + (i / Math.max(1, trace.length - 1)) * (w - 130)
          const y = y0 + rowH * (1 - (trace[i] + 90) / 160)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

    }

    return loopWhileVisible(canvas, draw, 33)
  }, [])

  function click(ev: MouseEvent<HTMLCanvasElement>) {
    const box = ev.currentTarget.getBoundingClientRect()
    const n = Math.min(8, Math.max(1, Math.floor(((ev.clientY - box.top) / box.height) * 8) + 1))
    onPick(n)
  }

  return <canvas ref={ref} className="rails-canvas" onClick={click} />
}
