import { useEffect, useRef } from 'react'
import { LOBES, PATHWAYS } from './connectome.ts'
import { canvasDpr, loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

const ORDER = [...LOBES].sort((a, b) => a.system.localeCompare(b.system) || a.id.localeCompare(b.id))

const EDGE = new Map<string, 'known' | 'novel'>()
for (const row of PATHWAYS) {
  EDGE.set(`${row.from}>${row.to}`, row.kind)
}

export function Matrix({ runtime }: { runtime: SimRuntime }) {
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
      const w = parent?.clientWidth ?? 420
      const h = parent?.clientHeight ?? 340
      const dpr = canvasDpr(w)
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#070605'
      ctx.fillRect(0, 0, w, h)

      const padL = 36
      const padT = 28
      const n = ORDER.length
      const size = Math.min((w - padL - 10) / n, (h - padT - 10) / n)
      const x0 = padL
      const y0 = padT

      ctx.font = '8px "IBM Plex Mono", monospace'
      ctx.fillStyle = 'rgba(210,168,140,0.45)'
      for (let i = 0; i < n; i++) {
        if (i % 4 !== 0) continue
        ctx.fillText(ORDER[i].abbr, x0 + i * size, 16)
        ctx.fillText(ORDER[i].abbr, 4, y0 + i * size + 8)
      }

      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const from = ORDER[c].id
          const to = ORDER[r].id
          const kind = EDGE.get(`${from}>${to}`)
          const hot = ((rt.lobes[from] ?? 0) + (rt.lobes[to] ?? 0)) / 2
          if (!kind && hot < 0.12) {
            ctx.fillStyle = 'rgba(255,255,255,0.015)'
          } else if (kind === 'novel') {
            ctx.fillStyle = `rgba(255, 90, 48, ${0.18 + hot * 0.7})`
          } else if (kind === 'known') {
            ctx.fillStyle = `rgba(184, 255, 106, ${0.16 + hot * 0.7})`
          } else {
            ctx.fillStyle = `rgba(240, 195, 106, ${hot * 0.45})`
          }
          ctx.fillRect(x0 + c * size, y0 + r * size, size - 0.4, size - 0.4)
        }
      }

    }

    return loopWhileVisible(canvas, draw, 50)
  }, [])

  return <canvas ref={ref} className="matrix-canvas" />
}
