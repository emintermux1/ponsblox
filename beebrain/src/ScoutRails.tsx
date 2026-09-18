import { useEffect, useRef } from 'react'
import { danceLabel, SCOUTS } from './dances.ts'
import { canvasDpr, loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

export function ScoutRails({
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

    function pick(ev: PointerEvent) {
      const box = canvas!.getBoundingClientRect()
      const y = ev.clientY - box.top
      const row = Math.floor((y / box.height) * 8)
      if (row >= 0 && row < 8) onPick(row + 1)
    }
    canvas.addEventListener('pointerdown', pick)

    const draw = () => {
      const rt = live.current
      const parent = canvas.parentElement
      const w = parent?.clientWidth ?? 900
      const h = parent?.clientHeight ?? 300
      const dpr = canvasDpr(w)
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#080705'
      ctx.fillRect(0, 0, w, h)
      const rowH = h / 8
      ctx.font = '11px "IBM Plex Mono", monospace'
      for (let i = 0; i < 8; i++) {
        const y = i * rowH
        const on = rt.scout === i + 1
        ctx.fillStyle = on ? 'rgba(240,180,74,0.08)' : 'transparent'
        ctx.fillRect(0, y, w, rowH)
        ctx.fillStyle = on ? '#f0b44a' : '#8a8176'
        ctx.fillText(`scout ${i + 1}  ${danceLabel(SCOUTS[i])}`, 12, y + rowH * 0.42)
        ctx.fillText(`${rt.runs[i]} runs`, w - 92, y + rowH * 0.42)
        const trace = rt.traces[i]
        ctx.beginPath()
        ctx.strokeStyle = on ? '#f4f0e8' : 'rgba(244,240,232,0.28)'
        for (let k = 0; k < trace.length; k++) {
          const x = 180 + (k / Math.max(1, trace.length - 1)) * (w - 290)
          const py = y + rowH * (0.78 - trace[k] * 0.55)
          if (k === 0) ctx.moveTo(x, py)
          else ctx.lineTo(x, py)
        }
        ctx.stroke()
      }
    }

    const stop = loopWhileVisible(canvas, draw, 40)
    return () => {
      stop()
      canvas.removeEventListener('pointerdown', pick)
    }
  }, [onPick])

  return <canvas ref={ref} className="lab-canvas rails-canvas" />
}
