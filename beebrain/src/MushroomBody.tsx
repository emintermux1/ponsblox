import { useEffect, useRef } from 'react'
import { NEUROPILS, TRACTS, neuropil, systemTone } from './brain.ts'
import { canvasDpr, loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

export function MushroomBody({ runtime }: { runtime: SimRuntime }) {
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
      const w = parent?.clientWidth ?? 900
      const h = parent?.clientHeight ?? 440
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

      ctx.lineWidth = 1
      for (const edge of TRACTS) {
        const a = neuropil(edge.from)
        const b = neuropil(edge.to)
        const lit = ((rt.lobes[a.id] ?? 0) + (rt.lobes[b.id] ?? 0)) * 0.5
        ctx.strokeStyle = `${systemTone(edge.system)}${(0.08 + lit * 0.5).toFixed(3)})`
        ctx.beginPath()
        ctx.moveTo(a.x * w, a.y * h)
        ctx.lineTo(b.x * w, b.y * h)
        ctx.stroke()
      }

      ctx.font = '10px "IBM Plex Mono", monospace'
      ctx.textAlign = 'center'
      for (const row of NEUROPILS) {
        const v = rt.lobes[row.id] ?? 0
        const x = row.x * w
        const y = row.y * h
        ctx.fillStyle = `${systemTone(row.system)}${(0.16 + v * 0.72).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(x, y, row.r * (0.72 + v * 0.42), 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = v > 0.35 ? '#070604' : '#9a9388'
        ctx.fillText(row.abbr, x, y + 3)
      }

      const cups = (rt.lobes.MB_ca_L + rt.lobes.MB_ca_R) * 0.35
      ctx.fillStyle = `rgba(227,106,44,${(0.08 + cups * 0.4).toFixed(3)})`
      for (let i = 0; i < 180; i++) {
        const side = i % 2 === 0 ? -1 : 1
        const x = w * (0.5 + side * (0.08 + ((i * 17) % 100) / 900))
        const y = h * (0.12 + ((i * 13) % 70) / 280)
        ctx.fillRect(x, y, 1.2, 1.2)
      }
    }

    const stop = loopWhileVisible(canvas, draw, 40)
    return stop
  }, [])

  return <canvas ref={ref} className="lab-canvas" />
}
