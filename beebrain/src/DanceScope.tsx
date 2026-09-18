import { useEffect, useRef } from 'react'
import { canvasDpr, loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

export function DanceScope({ runtime }: { runtime: SimRuntime }) {
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
      ctx.fillStyle = '#080705'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(240,180,74,0.08)'
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.moveTo(0, h * 0.5)
      ctx.lineTo(w, h * 0.5)
      ctx.stroke()

      const wag = rt.traces[rt.scout - 1] ?? []
      if (wag.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = '#f0b44a'
        ctx.lineWidth = 1.5
        for (let i = 0; i < wag.length; i++) {
          const x = (i / (wag.length - 1)) * w
          const y = h * (0.82 - wag[i] * 0.5)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      const ang = rt.angleTrace
      if (ang.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(244,240,232,0.55)'
        ctx.lineWidth = 1
        for (let i = 0; i < ang.length; i++) {
          const x = (i / (ang.length - 1)) * w
          const y = h * 0.28 - Math.sin(ang[i]) * h * 0.14
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      ctx.font = '11px "IBM Plex Mono", monospace'
      ctx.fillStyle = '#f0b44a'
      ctx.fillText('CH1  waggle', 10, 22)
      ctx.fillStyle = '#9a9388'
      ctx.fillText('CH2  bearing', 10, 38)
    }

    const stop = loopWhileVisible(canvas, draw, 33)
    return stop
  }, [])

  return <canvas ref={ref} className="lab-canvas" />
}
