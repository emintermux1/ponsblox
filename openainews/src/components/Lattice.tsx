import { useEffect, useRef } from 'react'
import { canvasDpr, loopWhileVisible } from '../raf.ts'

type Node = { x: number; y: number; z: number }
type Pulse = { a: number; b: number; t: number; speed: number }

function buildLattice(n: number): Node[] {
  const nodes: Node[] = []
  const span = n - 1
  for (let z = 0; z < n; z++) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        nodes.push({
          x: (x / span) * 2 - 1,
          y: (y / span) * 2 - 1,
          z: (z / span) * 2 - 1,
        })
      }
    }
  }
  return nodes
}

function neighborEdges(n: number): [number, number][] {
  const edges: [number, number][] = []
  const idx = (x: number, y: number, z: number) => x + y * n + z * n * n
  for (let z = 0; z < n; z++) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = idx(x, y, z)
        if (x + 1 < n) edges.push([i, idx(x + 1, y, z)])
        if (y + 1 < n) edges.push([i, idx(x, y + 1, z)])
        if (z + 1 < n) edges.push([i, idx(x, y, z + 1)])
      }
    }
  }
  return edges
}

export function Lattice({ caption }: { caption: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const surface = canvas
    const maybe = surface.getContext('2d', { alpha: true, desynchronized: true })
    if (!maybe) return
    const ctx = maybe

    const n = 5
    const nodes = buildLattice(n)
    const edges = neighborEdges(n)
    const pulses: Pulse[] = Array.from({ length: 10 }, (_, i) => ({
      a: (i * 17) % edges.length,
      b: 0,
      t: (i * 0.11) % 1,
      speed: 0.004 + (i % 5) * 0.0007,
    }))

    function project(node: Node, angle: number, w: number, h: number) {
      const cy = Math.cos(angle)
      const sy = Math.sin(angle)
      const rx = node.x * cy + node.z * sy
      const rz = -node.x * sy + node.z * cy
      const tilt = 0.42
      const ry = node.y * Math.cos(tilt) - rz * Math.sin(tilt)
      const depth = node.y * Math.sin(tilt) + rz * Math.cos(tilt)
      const persp = 2.15 / (2.55 + depth)
      return {
        x: w / 2 + rx * persp * w * 0.28,
        y: h / 2 + ry * persp * h * 0.42,
        d: depth,
        s: persp,
      }
    }

    function paint(now: number) {
      const w = surface.width
      const h = surface.height
      if (w < 2 || h < 2) return
      const angle = now * 0.00018
      ctx.fillStyle = '#f4f4f1'
      ctx.fillRect(0, 0, w, h)

      const pts = nodes.map((node) => project(node, angle, w, h))

      ctx.lineCap = 'round'
      for (const [a, b] of edges) {
        const pa = pts[a]
        const pb = pts[b]
        if (!pa || !pb) continue
        const depth = (pa.d + pb.d) * 0.5
        const alpha = 0.16 + Math.max(0, 0.28 - depth * 0.1)
        ctx.strokeStyle = `rgba(13,13,13,${alpha})`
        ctx.lineWidth = 1.2 * (pa.s + pb.s) * 0.5
        ctx.beginPath()
        ctx.moveTo(pa.x, pa.y)
        ctx.lineTo(pb.x, pb.y)
        ctx.stroke()
      }

      for (const node of pts) {
        const r = 1.6 + node.s * 2.3
        ctx.fillStyle = `rgba(13,13,13,${0.4 + node.s * 0.4})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      for (const pulse of pulses) {
        pulse.t += pulse.speed
        const pair = edges[pulse.a]
        if (!pair) continue
        const pa = pts[pair[0]]
        const pb = pts[pair[1]]
        if (!pa || !pb) continue
        const x = pa.x + (pb.x - pa.x) * pulse.t
        const y = pa.y + (pb.y - pa.y) * pulse.t
        const s = pa.s + (pb.s - pa.s) * pulse.t
        ctx.fillStyle = 'rgba(13,13,13,0.82)'
        ctx.beginPath()
        ctx.arc(x, y, 2.4 + s * 1.8, 0, Math.PI * 2)
        ctx.fill()
        if (pulse.t >= 1) {
          pulse.t = 0
          pulse.a = (pulse.a + 11) % edges.length
        }
      }
    }

    function resize() {
      const parent = surface.parentElement
      const cssW = parent && parent.clientWidth > 0 ? parent.clientWidth : 640
      const cssH = Math.max(240, Math.min(340, Math.round(cssW * 0.46)))
      const dpr = canvasDpr(cssW)
      const nextW = Math.floor(cssW * dpr)
      const nextH = Math.floor(cssH * dpr)
      if (surface.width !== nextW || surface.height !== nextH) {
        surface.width = nextW
        surface.height = nextH
        surface.style.width = `${cssW}px`
        surface.style.height = `${cssH}px`
      }
      paint(performance.now())
    }

    resize()
    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    const stop = loopWhileVisible(surface, paint, 33)

    return () => {
      stop()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <figure className="lattice">
      <canvas ref={ref} aria-hidden="true" />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}
