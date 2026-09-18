import { useEffect, useRef } from 'react'
import { canvasDpr, loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

export function Oscilloscope({ runtime }: { runtime: SimRuntime }) {
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
      const w = parent?.clientWidth ?? 640
      const h = parent?.clientHeight ?? 280
      const dpr = canvasDpr(w)
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#040806'
      ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = 'rgba(184,255,106,0.07)'
      ctx.lineWidth = 1
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      const mid = h * 0.58
      ctx.strokeStyle = 'rgba(184,255,106,0.2)'
      ctx.beginPath()
      ctx.moveTo(0, mid)
      ctx.lineTo(w, mid)
      ctx.stroke()

      const vTrace = rt.traces[rt.axon - 1] ?? []
      if (vTrace.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = '#b8ff6a'
        ctx.lineWidth = 1.5
        ctx.shadowColor = '#b8ff6a'
        ctx.shadowBlur = 6
        for (let i = 0; i < vTrace.length; i++) {
          const x = (i / (vTrace.length - 1)) * w
          const y = h * (1 - (vTrace[i] + 90) / 160)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      const iTrace = rt.stimTrace
      if (iTrace.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(240,195,106,0.85)'
        ctx.lineWidth = 1.1
        for (let i = 0; i < iTrace.length; i++) {
          const x = (i / (iTrace.length - 1)) * w
          const y = h * 0.86 - (iTrace[i] / 28) * h * 0.22
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      const v = rt.axons[rt.axon - 1]?.v ?? 0
      ctx.fillStyle = 'rgba(184,255,106,0.8)'
      ctx.font = '11px "IBM Plex Mono", monospace'
      ctx.fillText(`CH1  V  ${v.toFixed(1)} mV`, 10, 22)
      ctx.fillStyle = 'rgba(240,195,106,0.8)'
      ctx.fillText(`CH2  I  ${rt.iStim.toFixed(2)} nA`, 10, 38)
      ctx.fillStyle = 'rgba(210,168,140,0.55)'
      ctx.fillText(`${rt.trial.id}  ${rt.trial.stimulus}  5 ms/div`, w - 168, 22)

    }

    return loopWhileVisible(canvas, draw, 33)
  }, [])

  return <canvas ref={ref} className="scope-canvas" />
}
