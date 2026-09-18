import { useEffect, useRef } from 'react'
import { GLOMERULI } from './lore.ts'
import { canvasDpr, loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

export function Glomeruli({ runtime }: { runtime: SimRuntime }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const live = useRef(runtime)
  live.current = runtime

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const raw = canvas.getContext('2d', { alpha: false, desynchronized: true })
    if (!raw) return
    const ctx = raw

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

      const leftN = Math.floor(GLOMERULI / 2)
      const rightN = GLOMERULI - leftN
      const r = Math.min(w * 0.2, h * 0.34)

      function cup(cx: number, cy: number, n: number, offset: number) {
        for (let i = 0; i < n; i++) {
          const ring = Math.floor(Math.sqrt(i))
          const around = i - ring * ring
          const slots = Math.max(1, ring * 2)
          const a = (around / slots) * Math.PI * 2 + ring * 0.35
          const rad = (ring / Math.sqrt(n)) * r
          const x = cx + Math.cos(a) * rad * 0.92
          const y = cy + Math.sin(a) * rad * 1.05
          const v = rt.glomeruli[offset + i] ?? 0
          ctx.fillStyle = `rgba(240,180,74,${(0.1 + v * 0.82).toFixed(3)})`
          ctx.beginPath()
          ctx.arc(x, y, 2.1 + v * 1.3, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      cup(w * 0.3, h * 0.56, leftN, 0)
      cup(w * 0.7, h * 0.56, rightN, leftN)

      ctx.fillStyle = '#8a8176'
      ctx.font = '11px "IBM Plex Mono", monospace'
      ctx.fillText('AL L', w * 0.3 - 14, 28)
      ctx.fillText('AL R', w * 0.7 - 14, 28)
    }

    const stop = loopWhileVisible(canvas, draw, 40)
    return stop
  }, [])

  return <canvas ref={ref} className="lab-canvas" />
}
