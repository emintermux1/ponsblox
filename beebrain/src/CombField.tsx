import { useEffect, useRef } from 'react'
import { canvasDpr, loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

export function CombField({ runtime }: { runtime: SimRuntime }) {
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

      const size = 15
      const dx = size * 1.75
      const dy = size * 1.52
      const cols = Math.max(6, Math.floor((w - 36) / dx))
      const rows = Math.max(5, Math.floor((h - 40) / dy))
      let n = 0
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const v = rt.comb[n % rt.comb.length] ?? 0
          const x = 22 + col * dx + (row % 2) * dx * 0.5
          const y = 32 + row * dy
          ctx.strokeStyle = `rgba(240,180,74,${(0.12 + v * 0.72).toFixed(3)})`
          ctx.lineWidth = 1
          ctx.beginPath()
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 - Math.PI / 6
            const px = x + Math.cos(a) * size
            const py = y + Math.sin(a) * size
            if (k === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.stroke()
          n += 1
        }
      }

      const cx = w * 0.5
      const cy = h * 0.58
      const run = Math.min(w, h) * 0.22
      const bx = cx + Math.sin(rt.angle) * run
      const by = cy - Math.cos(rt.angle) * run
      ctx.strokeStyle = 'rgba(244,240,232,0.35)'
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(bx, by)
      ctx.stroke()
      ctx.fillStyle = '#f0b44a'
      ctx.beginPath()
      ctx.arc(bx, by, 3 + rt.waggle * 2.4, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(240,180,74,0.7)'
      ctx.font = '11px "IBM Plex Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('SUN', cx, 18)
    }

    const stop = loopWhileVisible(canvas, draw, 40)
    return stop
  }, [])

  return <canvas ref={ref} className="lab-canvas" />
}
