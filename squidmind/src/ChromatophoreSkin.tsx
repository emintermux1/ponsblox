import { useEffect, useRef } from 'react'
import { canvasDpr, loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

type Cell = { x: number; y: number; r: number; hue: number; rot: number }

function pack(n: number): Cell[] {
  const cells: Cell[] = []
  const cols = 22
  const rows = Math.ceil(n / cols)
  for (let i = 0; i < n; i++) {
    const c = i % cols
    const r = Math.floor(i / cols)
    const jitterX = ((i * 17) % 9) * 0.012
    const jitterY = ((i * 11) % 7) * 0.014
    cells.push({
      x: (c + (r % 2) * 0.46 + 0.28 + jitterX) / (cols + 0.6),
      y: (r + 0.45 + jitterY) / (rows + 0.7),
      r: 0.009 + ((i * 13) % 11) * 0.0018,
      hue: i % 5 === 0 ? 42 : i % 3 === 0 ? 8 : 18,
      rot: ((i * 23) % 360) * (Math.PI / 180),
    })
  }
  return cells
}

export function ChromatophoreSkin({ runtime }: { runtime: SimRuntime }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const live = useRef(runtime)
  live.current = runtime

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
    if (!ctx) return
    const cells = pack(live.current.chroma.length)

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
      ctx.fillStyle = '#2a2218'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(90,70,48,0.35)'
      for (let i = 0; i < 80; i++) {
        ctx.fillRect((i * 47) % w, (i * 31) % h, 2, 1)
      }

      const scale = Math.min(w, h)
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]
        const drive = rt.chroma[i] ?? 0
        const open = 0.22 + drive * 0.78
        const x = cell.x * w
        const y = cell.y * h
        const rr = cell.r * scale * (0.35 + open * 2.1)
        const lit = 18 + drive * 38
        ctx.fillStyle = `hsla(${cell.hue + drive * 10}, 78%, ${lit}%, ${0.28 + drive * 0.55})`
        ctx.beginPath()
        ctx.arc(x, y, rr, 0, Math.PI * 2)
        ctx.fill()
      }

    }

    return loopWhileVisible(canvas, draw, 40)
  }, [])

  return <canvas ref={ref} className="skin-canvas" />
}
