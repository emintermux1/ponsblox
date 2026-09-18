import { useEffect, useRef } from 'react'
import { LOBES, PATHWAYS } from './connectome.ts'
import { canvasDpr, loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

type Fiber = { xs: number[]; ys: number[]; from: string; to: string; hue: number }
type Soma = { x: number; y: number; lobe: string }

const BY_ID = new Map(LOBES.map((row) => [row.id, row]))

function nrand(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function lobeOf(id: string) {
  const row = BY_ID.get(id)
  if (!row) throw new Error(`missing lobe ${id}`)
  return row
}

function curve(x0: number, y0: number, x1: number, y1: number, bulge: number, steps: number, seed: number) {
  const nx = -(y1 - y0)
  const ny = x1 - x0
  const len = Math.hypot(nx, ny) || 1
  const mx = (x0 + x1) / 2 + (nx / len) * bulge + (nrand(seed) - 0.5) * 0.018
  const my = (y0 + y1) / 2 + (ny / len) * bulge + (nrand(seed + 3) - 0.5) * 0.018
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    xs.push(u * u * x0 + 2 * u * t * mx + t * t * x1)
    ys.push(u * u * y0 + 2 * u * t * my + t * t * y1)
  }
  return { xs, ys }
}

function hueFor(from: string, to: string) {
  const a = lobeOf(from)
  const b = lobeOf(to)
  const dx = Math.abs(b.x - a.x)
  const dy = Math.abs(b.y - a.y)
  if (dx > dy * 1.2) return 0
  if (dy > dx * 1.2) return 120
  return 210
}

function buildFibers(): Fiber[] {
  const out: Fiber[] = []
  PATHWAYS.forEach((edge, i) => {
    if (i % 4 !== 0) return
    const a = lobeOf(edge.from)
    const b = lobeOf(edge.to)
    const copies = 1
    for (let k = 0; k < copies; k++) {
      const jx = (nrand(i * 13 + k) - 0.5) * 0.02
      const jy = (nrand(i * 17 + k) - 0.5) * 0.02
      const bulge = (nrand(i + k + 4) - 0.5) * 0.08
      const { xs, ys } = curve(a.x + jx, a.y + jy, b.x - jx, b.y - jy, bulge, 12, i * 9 + k)
      out.push({ xs, ys, from: edge.from, to: edge.to, hue: hueFor(edge.from, edge.to) })
    }
  })
  return out
}

function buildSomas(): Soma[] {
  const out: Soma[] = []
  for (const lobe of LOBES) {
    const n = lobe.system === 'optic' ? 220 : 28
    const spread = lobe.system === 'optic' ? 0.145 : 0.032
    for (let i = 0; i < n; i++) {
      const ang = nrand(i + lobe.x * 80 + lobe.y * 40) * Math.PI * 2
      const rad = Math.sqrt(nrand(i + 11 + lobe.r)) * spread
      out.push({
        x: lobe.x + Math.cos(ang) * rad * 1.15,
        y: lobe.y + Math.sin(ang) * rad,
        lobe: lobe.id,
      })
    }
  }
  return out
}

const FIBERS = buildFibers()
const SOMAS = buildSomas()

function addOptic(ctx: CanvasRenderingContext2D, sx: (n: number) => number, sy: (n: number) => number, side: 'L' | 'R') {
  const f = side === 'L' ? -1 : 1
  ctx.ellipse(sx(0.5 + f * 0.24), sy(0.48), sx(0.175) - sx(0), sy(0.22) - sy(0), f * 0.24, 0, Math.PI * 2)
}

function addCentral(ctx: CanvasRenderingContext2D, sx: (n: number) => number, sy: (n: number) => number) {
  ctx.ellipse(sx(0.5), sy(0.5), sx(0.12) - sx(0), sy(0.34) - sy(0), 0, 0, Math.PI * 2)
}

export function BrainMap({ runtime }: { runtime: SimRuntime }) {
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
      const h = parent?.clientHeight ?? 440
      const dpr = canvasDpr(w)
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#050403'
      ctx.fillRect(0, 0, w, h)

      const aspect = 1.42
      let bw = w * 0.9
      let bh = bw / aspect
      if (bh > h * 0.9) {
        bh = h * 0.9
        bw = bh * aspect
      }
      const ox = (w - bw) / 2
      const oy = (h - bh) / 2
      const sx = (x: number) => ox + x * bw
      const sy = (y: number) => oy + y * bh

      ctx.save()
      ctx.beginPath()
      addOptic(ctx, sx, sy, 'L')
      addOptic(ctx, sx, sy, 'R')
      addCentral(ctx, sx, sy)
      ctx.fillStyle = '#1a1210'
      ctx.fill()
      ctx.restore()

      ctx.save()
      ctx.beginPath()
      addOptic(ctx, sx, sy, 'L')
      addOptic(ctx, sx, sy, 'R')
      addCentral(ctx, sx, sy)
      ctx.clip()

      for (const soma of SOMAS) {
        const act = rt.lobes[soma.lobe] ?? 0
        const a = 0.22 + act * 0.7
        ctx.fillStyle = `rgba(184, 255, 106, ${a})`
        const s = act > 0.3 ? 1.8 : 1.15
        ctx.fillRect(sx(soma.x), sy(soma.y), s, s)
      }

      ctx.lineCap = 'round'
      for (const fiber of FIBERS) {
        const hot = Math.max(rt.lobes[fiber.from] ?? 0, rt.lobes[fiber.to] ?? 0)
        const alpha = 0.025 + hot * 0.18
        ctx.strokeStyle = `hsla(${fiber.hue}, 55%, 58%, ${alpha})`
        ctx.lineWidth = 0.4 + hot * 0.6
        ctx.beginPath()
        ctx.moveTo(sx(fiber.xs[0]), sy(fiber.ys[0]))
        for (let i = 1; i < fiber.xs.length; i++) ctx.lineTo(sx(fiber.xs[i]), sy(fiber.ys[i]))
        ctx.stroke()
      }
      ctx.restore()

      ctx.strokeStyle = 'rgba(210,170,140,0.22)'
      ctx.lineWidth = 1
      ctx.beginPath()
      addOptic(ctx, sx, sy, 'L')
      ctx.stroke()
      ctx.beginPath()
      addOptic(ctx, sx, sy, 'R')
      ctx.stroke()
      ctx.beginPath()
      addCentral(ctx, sx, sy)
      ctx.stroke()

      ctx.fillStyle = 'rgba(236,228,214,0.7)'
      ctx.font = '11px "IBM Plex Mono", monospace'
      ctx.fillText('optic L', sx(0.12), sy(0.48))
      ctx.fillText('optic R', sx(0.78), sy(0.48))
      ctx.fillText('vertical', sx(0.455), sy(0.2))
      ctx.fillText('basal', sx(0.474), sy(0.4))
      ctx.fillText('pedal', sx(0.474), sy(0.62))
      ctx.fillText('palliovisceral', sx(0.438), sy(0.82))

      ctx.fillStyle = 'rgba(210,168,140,0.45)'
      ctx.font = '10px "IBM Plex Mono", monospace'
      ctx.fillText('A', sx(0.5) - 3, sy(0.06))
      ctx.fillText(`${SOMAS.length.toLocaleString()} units  ·  ${FIBERS.length.toLocaleString()} tracts`, sx(0.62), sy(0.96))
      ctx.fillText('horizontal  ·  anterior up', sx(0.08), sy(0.96))

    }

    return loopWhileVisible(canvas, draw, 40)
  }, [])

  return <canvas ref={ref} className="brain-canvas" />
}
