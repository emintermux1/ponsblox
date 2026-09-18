import { useEffect, useRef } from 'react'
import { canvasDpr, loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

type Pt = { x: number; y: number; z: number }
type Kind = 'bone' | 'band' | 'wing' | 'eye' | 'gold'
type Seg = [number, number, number, number, number, Kind]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function rotY(p: Pt, a: number): Pt {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c }
}

function rotZ(p: Pt, a: number): Pt {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z }
}

function rotX(p: Pt, a: number): Pt {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c }
}

function head(u: number, a: number): Pt {
  const th = u * Math.PI
  return {
    x: 0.13 * Math.sin(th) * Math.cos(a),
    y: 0.5 + 0.11 * Math.cos(th),
    z: 0.1 * Math.sin(th) * Math.sin(a) * 0.86,
  }
}

function thorax(u: number, a: number): Pt {
  const th = u * Math.PI
  return {
    x: 0.17 * Math.sin(th) * Math.cos(a),
    y: 0.22 + 0.15 * Math.cos(th),
    z: 0.145 * Math.sin(th) * Math.sin(a),
  }
}

function abdomen(u: number, a: number): Pt {
  const y = 0.02 - u * 0.58
  const n = 0.035 + Math.sin(u * Math.PI) * 0.145
  return {
    x: Math.cos(a) * n,
    y,
    z: Math.sin(a) * n * 0.76,
  }
}

function compoundEye(side: number, u: number, v: number): Pt {
  const th = 0.18 + u * 1.25
  const ph = (v - 0.5) * 1.85
  const r = 0.108
  return {
    x: side * (0.1 + r * Math.sin(th) * Math.cos(ph)),
    y: 0.5 + r * Math.cos(th) * 0.88,
    z: 0.07 + r * Math.sin(th) * Math.sin(ph) * 0.72,
  }
}

function wing(side: number, pair: number, u: number, v: number, flap: number): Pt {
  const fore = pair === 0
  const span = fore ? 0.7 : 0.46
  const chord = fore ? 0.26 : 0.18
  const root: Pt = { x: side * 0.09, y: 0.24 - pair * 0.05, z: 0.1 }
  const lift = Math.sin(flap) * (fore ? 0.48 : 0.36)
  const taper = Math.sin(u * Math.PI) * (1 - u * 0.22)
  return {
    x: root.x + side * u * span,
    y: root.y + (v - 0.38) * chord * taper + lift * u * 0.16,
    z: root.z + Math.sin(u * Math.PI) * 0.05 + lift * u * 0.3 + (v - 0.3) * 0.05,
  }
}

function antenna(side: number, t: number, reach: number): Pt {
  if (t < 0.32) {
    const k = t / 0.32
    return {
      x: side * (0.045 + k * 0.04),
      y: 0.58 + k * 0.1,
      z: 0.05 + k * 0.02,
    }
  }
  const k = (t - 0.32) / 0.68
  const club = t > 0.82 ? 1.12 : 1
  return {
    x: side * (0.085 + k * (0.2 + reach * 0.07)) * club,
    y: 0.68 - k * 0.04 + reach * 0.03,
    z: 0.07 + k * 0.12,
  }
}

function leg(side: number, slot: number, t: number, step: number): Pt {
  const root: Pt = { x: side * 0.1, y: 0.22 - slot * 0.035, z: 0.02 }
  const swing = Math.sin(step + slot * 2.05) * (0.045 + slot * 0.015)
  const reach = slot === 0 ? 0.1 : slot === 1 ? 0.14 : 0.18
  const back = slot === 0 ? 0.04 : slot === 1 ? -0.02 : -0.08
  if (t < 0.28) {
    const k = t / 0.28
    return { x: root.x + side * k * 0.04, y: root.y - k * 0.06, z: root.z + back * k }
  }
  if (t < 0.62) {
    const k = (t - 0.28) / 0.34
    return {
      x: root.x + side * (0.04 + k * (0.08 + reach * 0.15)),
      y: root.y - 0.06 - k * 0.16 + swing,
      z: root.z + back + k * 0.02,
    }
  }
  const k = (t - 0.62) / 0.38
  const basket = slot === 2 ? 0.02 : 0
  return {
    x: root.x + side * (0.12 + reach * 0.15 + k * 0.05 + basket),
    y: root.y - 0.22 - k * 0.12 + swing * 0.4,
    z: root.z + back + 0.02 + k * 0.03,
  }
}

function strokeOf(kind: Kind, depth: number, pulse: number) {
  const a = 0.16 + depth * 0.58 + pulse * 0.08
  switch (kind) {
    case 'bone':
      return `rgba(244,240,232,${a.toFixed(3)})`
    case 'band':
      return `rgba(240,180,74,${(a + 0.08).toFixed(3)})`
    case 'wing':
      return `rgba(244,240,232,${(0.1 + depth * 0.28).toFixed(3)})`
    case 'eye':
      return `rgba(232,210,170,${(a + 0.12).toFixed(3)})`
    case 'gold':
      return `rgba(240,195,106,${(a + 0.15).toFixed(3)})`
    default: {
      const _never: never = kind
      return _never
    }
  }
}

export function ParticleBee({ runtime }: { runtime: SimRuntime }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const live = useRef(runtime)
  live.current = runtime

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const view = canvas
    const ctx = view.getContext('2d', { alpha: false, desynchronized: true })
    if (!ctx) return

    const mouse = { x: 0, y: 0, tx: 0, ty: 0, pulse: 0 }
    let box = view.getBoundingClientRect()

    function onMove(ev: PointerEvent) {
      mouse.tx = ((ev.clientX - box.left) / box.width) * 2 - 1
      mouse.ty = ((ev.clientY - box.top) / box.height) * 2 - 1
    }
    function onLeave() {
      mouse.tx = 0
      mouse.ty = 0
    }
    function onDown() {
      mouse.pulse = 1
    }

    view.addEventListener('pointermove', onMove)
    view.addEventListener('pointerleave', onLeave)
    view.addEventListener('pointerdown', onDown)

    let resizeAt = -999
    const draw = (now: number) => {
      const rt = live.current
      mouse.x += (mouse.tx - mouse.x) * 0.07
      mouse.y += (mouse.ty - mouse.y) * 0.07
      mouse.pulse *= 0.92

      const parent = view.parentElement
      const w = Math.max(parent?.clientWidth || 0, view.clientWidth || 0, 360)
      const h = Math.max(parent?.clientHeight || 0, view.clientHeight || 0, Math.round(window.innerHeight * 0.92))
      const dpr = canvasDpr(w)
      if (now - resizeAt > 400) {
        resizeAt = now
        box = view.getBoundingClientRect()
        const bw = Math.floor(w * dpr)
        const bh = Math.floor(h * dpr)
        if (view.width !== bw || view.height !== bh) {
          view.width = bw
          view.height = bh
          view.style.width = `${w}px`
          view.style.height = `${h}px`
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#070604'
      ctx.fillRect(0, 0, w, h)

      const t = now * 0.001
      const flap = t * 26 + rt.waggle * 10
      const yaw = -0.58 + mouse.x * 0.48
      const roll = -0.16 + mouse.y * 0.26 + Math.sin(t * 1.35) * 0.035
      const pitch = 0.16 + mouse.pulse * 0.1
      const scale = Math.min(w, h) * 0.58

      function xf(p: Pt): [number, number, number] {
        let q = rotX(p, pitch)
        q = rotY(q, yaw)
        q = rotZ(q, roll)
        return [w * 0.5 + q.x * scale, h * 0.46 - q.y * scale, q.z]
      }

      const segs: Seg[] = []

      function link(a: Pt, b: Pt, kind: Kind) {
        const p = xf(a)
        const q = xf(b)
        segs.push([p[0], p[1], q[0], q[1], (p[2] + q[2]) * 0.5, kind])
      }

      function ring(pts: Pt[], kind: Kind) {
        for (let i = 0; i < pts.length; i++) link(pts[i], pts[(i + 1) % pts.length], kind)
      }

      function grid(fn: (u: number, v: number) => Pt, nu: number, nv: number, kind: Kind | ((u: number) => Kind)) {
        const mesh: Pt[][] = []
        for (let i = 0; i <= nu; i++) {
          const row: Pt[] = []
          for (let j = 0; j <= nv; j++) row.push(fn(i / nu, (j / nv) * Math.PI * 2))
          mesh.push(row)
        }
        for (let i = 0; i < nu; i++) {
          const tone = typeof kind === 'function' ? kind(i / nu) : kind
          for (let j = 0; j < nv; j++) {
            link(mesh[i][j], mesh[i + 1][j], tone)
            link(mesh[i][j], mesh[i][j + 1], tone)
          }
        }
      }

      grid(head, 8, 12, 'bone')
      grid(thorax, 8, 12, 'bone')
      grid(abdomen, 14, 10, (u) => (Math.floor(u * 6) % 2 === 0 ? 'band' : 'bone'))

      for (const side of [-1, 1] as const) {
        grid((u, a) => compoundEye(side, u, a / (Math.PI * 2)), 6, 8, 'eye')

        for (const pair of [0, 1] as const) {
          const wu = 7
          const wv = 4
          for (let i = 0; i < wu; i++) {
            for (let j = 0; j < wv; j++) {
              link(
                wing(side, pair, i / wu, j / wv, flap + pair * 0.4),
                wing(side, pair, (i + 1) / wu, j / wv, flap + pair * 0.4),
                'wing',
              )
              if (j < wv - 1) {
                link(
                  wing(side, pair, i / wu, j / wv, flap + pair * 0.4),
                  wing(side, pair, i / wu, (j + 1) / wv, flap + pair * 0.4),
                  'wing',
                )
              }
            }
          }
          for (const vein of [0.18, 0.45, 0.72]) {
            link(wing(side, pair, 0.05, vein, flap + pair * 0.4), wing(side, pair, 0.92, vein, flap + pair * 0.4), 'wing')
          }
        }

        const ant: Pt[] = []
        for (let i = 0; i <= 11; i++) ant.push(antenna(side, i / 11, mouse.x * side))
        for (let i = 0; i < ant.length - 1; i++) link(ant[i], ant[i + 1], i > 8 ? 'gold' : 'bone')

        for (let slot = 0; slot < 3; slot++) {
          const path: Pt[] = []
          for (let i = 0; i <= 9; i++) path.push(leg(side, slot, i / 9, t * 5.4))
          for (let i = 0; i < path.length - 1; i++) link(path[i], path[i + 1], 'bone')
        }

        const jaw: Pt[] = []
        for (let i = 0; i < 7; i++) {
          const a = (i / 6) * Math.PI - Math.PI * 0.5
          jaw.push({
            x: side * (0.03 + Math.cos(a) * 0.028),
            y: 0.4 + Math.sin(a) * 0.022,
            z: 0.08,
          })
        }
        for (let i = 0; i < jaw.length - 1; i++) link(jaw[i], jaw[i + 1], 'gold')
      }

      const ocelli: Pt[] = [
        { x: 0, y: 0.6, z: 0.08 },
        { x: -0.03, y: 0.58, z: 0.075 },
        { x: 0.03, y: 0.58, z: 0.075 },
      ]
      for (const o of ocelli) {
        const ringPts: Pt[] = []
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          ringPts.push({ x: o.x + Math.cos(a) * 0.012, y: o.y + Math.sin(a) * 0.01, z: o.z })
        }
        ring(ringPts, 'gold')
      }

      segs.sort((a, b) => a[4] - b[4])
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const [x1, y1, x2, y2, z, kind] of segs) {
        const depth = lerp(0.2, 1, (z + 0.42) / 0.82)
        ctx.strokeStyle = strokeOf(kind, depth, mouse.pulse)
        ctx.lineWidth = kind === 'wing' ? 0.55 : 0.75 + depth * 0.55
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }

    const paint = (now: number) => {
      try {
        draw(now)
      } catch (err) {
        console.error(err)
      }
    }
    paint(performance.now())
    const stop = loopWhileVisible(view, paint, 22)
    return () => {
      stop()
      view.removeEventListener('pointermove', onMove)
      view.removeEventListener('pointerleave', onLeave)
      view.removeEventListener('pointerdown', onDown)
    }
  }, [])

  return <canvas ref={ref} className="hero-canvas" />
}
