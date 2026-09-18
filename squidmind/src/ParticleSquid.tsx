import { useEffect, useRef } from 'react'
import { canvasDpr, loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

type Pt = { x: number; y: number; z: number }

type LimbKind = 'arm' | 'tentacle'

type Limb = {
  kind: LimbKind
  ox: number
  oz: number
  c1: Pt
  c2: Pt
  end: Pt
  phase: number
}

const MOUTH_Y = -0.208

const LIMBS: readonly Limb[] = [
  {
    kind: 'arm',
    ox: -0.03,
    oz: 0.02,
    c1: { x: -0.1, y: -0.4, z: 0.1 },
    c2: { x: -0.4, y: -0.52, z: 0.14 },
    end: { x: -0.46, y: -0.26, z: 0.08 },
    phase: 0.2,
  },
  {
    kind: 'arm',
    ox: -0.022,
    oz: -0.016,
    c1: { x: -0.08, y: -0.5, z: -0.08 },
    c2: { x: -0.3, y: -0.82, z: -0.05 },
    end: { x: -0.2, y: -1.08, z: 0.02 },
    phase: 1.0,
  },
  {
    kind: 'arm',
    ox: -0.012,
    oz: 0.024,
    c1: { x: -0.05, y: -0.42, z: 0.16 },
    c2: { x: -0.36, y: -0.68, z: 0.1 },
    end: { x: -0.22, y: -0.36, z: 0.12 },
    phase: 1.8,
  },
  {
    kind: 'arm',
    ox: -0.004,
    oz: -0.022,
    c1: { x: -0.03, y: -0.56, z: -0.12 },
    c2: { x: -0.16, y: -0.98, z: -0.07 },
    end: { x: -0.08, y: -1.26, z: -0.02 },
    phase: 2.6,
  },
  {
    kind: 'arm',
    ox: 0.006,
    oz: 0.018,
    c1: { x: 0.07, y: -0.5, z: 0.12 },
    c2: { x: -0.14, y: -0.86, z: 0.08 },
    end: { x: 0.1, y: -1.12, z: 0.04 },
    phase: 3.4,
  },
  {
    kind: 'arm',
    ox: 0.014,
    oz: -0.012,
    c1: { x: 0.05, y: -0.54, z: -0.1 },
    c2: { x: 0.2, y: -0.9, z: -0.05 },
    end: { x: 0.04, y: -1.2, z: 0.02 },
    phase: 4.1,
  },
  {
    kind: 'arm',
    ox: 0.024,
    oz: 0.02,
    c1: { x: 0.1, y: -0.44, z: 0.18 },
    c2: { x: 0.34, y: -0.72, z: 0.1 },
    end: { x: 0.42, y: -0.46, z: 0.05 },
    phase: 4.9,
  },
  {
    kind: 'arm',
    ox: 0.03,
    oz: -0.018,
    c1: { x: 0.12, y: -0.48, z: -0.14 },
    c2: { x: 0.24, y: -0.82, z: -0.08 },
    end: { x: 0.12, y: -1.04, z: -0.03 },
    phase: 5.6,
  },
  {
    kind: 'tentacle',
    ox: -0.018,
    oz: 0.008,
    c1: { x: -0.14, y: -0.62, z: 0.04 },
    c2: { x: -0.42, y: -1.12, z: 0.02 },
    end: { x: -0.58, y: -1.38, z: 0 },
    phase: 0.4,
  },
  {
    kind: 'tentacle',
    ox: 0.01,
    oz: -0.006,
    c1: { x: 0.02, y: -0.66, z: -0.04 },
    c2: { x: 0.1, y: -1.2, z: -0.02 },
    end: { x: 0.02, y: -1.52, z: 0 },
    phase: 1.5,
  },
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function bez3(a: number, b: number, c: number, d: number, t: number) {
  const u = 1 - t
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d
}

function add(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function mul(a: Pt, s: number): Pt {
  return { x: a.x * s, y: a.y * s, z: a.z * s }
}

function norm(p: Pt): Pt {
  const m = Math.hypot(p.x, p.y, p.z) || 1
  return { x: p.x / m, y: p.y / m, z: p.z / m }
}

function cross(a: Pt, b: Pt): Pt {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function hash(i: number, j: number) {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return n - Math.floor(n)
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

function mantleR(u: number) {
  const keys: ReadonlyArray<readonly [number, number]> = [
    [0, 0.01],
    [0.07, 0.05],
    [0.18, 0.13],
    [0.34, 0.198],
    [0.5, 0.188],
    [0.68, 0.148],
    [0.84, 0.092],
    [0.94, 0.064],
    [1, 0.052],
  ]
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) {
      const t = (u - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])
      return lerp(keys[i - 1][1], keys[i][1], t)
    }
  }
  return keys[keys.length - 1][1]
}

function mantlePoint(u: number, a: number, swim: number): Pt {
  const y = 0.03 + u * 0.9
  const n =
    1 +
    0.014 * Math.sin(a * 6 + u * 9) +
    0.01 * Math.sin(swim * 1.8 + u * 5 + a)
  let r = mantleR(u) * n
  const finU = u < 0.36 ? Math.sin((u / 0.36) * Math.PI) : 0
  r += finU * Math.pow(Math.abs(Math.cos(a)), 2.2) * 0.07
  return {
    x: Math.cos(a) * r,
    y,
    z: Math.sin(a) * r * 0.74,
  }
}

function headPoint(u: number, a: number): Pt {
  const th = u * Math.PI
  return {
    x: 0.112 * Math.sin(th) * Math.cos(a),
    y: -0.1 + 0.1 * Math.cos(th),
    z: 0.12 * Math.sin(th) * Math.sin(a),
  }
}

function finPoint(side: number, u: number, v: number): Pt {
  const y = 0.58 + u * 0.5
  const chord = Math.sin(u * Math.PI)
  const attach = mantleR(Math.min(1, Math.max(0, (y - 0.03) / 0.9)))
  const span = 0.018 + chord * 0.36
  return {
    x: side * (attach * 0.82 + v * span),
    y: y + (v - 0.15) * 0.03,
    z: 0.012 + v * 0.018 + chord * 0.02,
  }
}

function limbRadius(limb: Limb, t: number) {
  const base = limb.kind === 'tentacle' ? lerp(0.022, 0.008, t) : lerp(0.03, 0.007, t)
  if (limb.kind !== 'tentacle' || t < 0.7) return base
  return base + Math.sin(((t - 0.7) / 0.3) * Math.PI) * 0.058
}

function limbPath(limb: Limb, t: number, aim: Pt, swim: number, pulse: number): Pt {
  const wave = Math.sin(swim * 1.45 + limb.phase + t * 4.1) * 0.03 * t
  const reach = (limb.kind === 'tentacle' ? 0.5 : 0.22) * t * t
  return {
    x: bez3(limb.ox, limb.c1.x, limb.c2.x, limb.end.x, t) + aim.x * reach + wave,
    y: bez3(MOUTH_Y, limb.c1.y, limb.c2.y, limb.end.y, t) + aim.y * reach * 0.4 + pulse * 0.028 * t,
    z: bez3(limb.oz, limb.c1.z, limb.c2.z, limb.end.z, t) + wave * 0.45,
  }
}

function limbFrame(limb: Limb, t: number, aim: Pt, swim: number, pulse: number) {
  const a = limbPath(limb, Math.max(0, t - 0.012), aim, swim, pulse)
  const b = limbPath(limb, Math.min(1, t + 0.012), aim, swim, pulse)
  const T = norm(sub(b, a))
  const ref = Math.abs(T.z) > 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 }
  const N = norm(cross(T, ref))
  const B = norm(cross(T, N))
  return { T, N, B }
}

function limbTube(limb: Limb, t: number, v: number, aim: Pt, swim: number, pulse: number): Pt {
  const p = limbPath(limb, t, aim, swim, pulse)
  const { N, B } = limbFrame(limb, t, aim, swim, pulse)
  const r = limbRadius(limb, t)
  const club = limb.kind === 'tentacle' && t > 0.7 ? 0.32 : 1
  const twist = v + t * 1.15
  return add(p, add(mul(N, Math.cos(twist) * r), mul(B, Math.sin(twist) * r * club)))
}

export function ParticleSquid({ runtime }: { runtime: SimRuntime }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const live = useRef(runtime)
  live.current = runtime

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const view = canvas
    const ctx = view.getContext('2d', { alpha: false, desynchronized: true })
    if (!ctx) return

    const mouse = { x: 0, y: 0, tx: 0, ty: 0, pulse: 0, hot: 0 }
    let box = view.getBoundingClientRect()

    function onMove(ev: PointerEvent) {
      mouse.tx = ((ev.clientX - box.left) / box.width) * 2 - 1
      mouse.ty = ((ev.clientY - box.top) / box.height) * 2 - 1
      mouse.hot = 1
    }
    function onLeave() {
      mouse.tx = 0
      mouse.ty = 0
    }
    function onDown() {
      mouse.pulse = 1
      mouse.hot = 1
    }

    view.addEventListener('pointermove', onMove)
    view.addEventListener('pointerleave', onLeave)
    view.addEventListener('pointerdown', onDown)

    const mantleU = 34
    const mantleV = 20
    const headU = 12
    const headV = 16
    const finU = 12
    const finV = 7
    const limbU = 18
    const limbV = 6

    let resizeAt = 0
    const draw = (now: number) => {
      const rt = live.current
      mouse.x += (mouse.tx - mouse.x) * 0.07
      mouse.y += (mouse.ty - mouse.y) * 0.07
      mouse.pulse *= 0.93

      mouse.hot *= 0.94
      const parent = view.parentElement
      const w = parent?.clientWidth ?? 1200
      const h = parent?.clientHeight ?? 800
      const dpr = canvasDpr(w)
      if (now - resizeAt > 400) {
        resizeAt = now
        box = view.getBoundingClientRect()
        if (view.width !== Math.floor(w * dpr) || view.height !== Math.floor(h * dpr)) {
          view.width = Math.floor(w * dpr)
          view.height = Math.floor(h * dpr)
          view.style.width = `${w}px`
          view.style.height = `${h}px`
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      ctx.fillStyle = '#050304'
      ctx.fillRect(0, 0, w, h)

      const vMem = rt.axons[rt.axon - 1]?.v ?? -65
      const spike = Math.max(0, (vMem + 20) / 80)
      const motor = rt.score
      const swim = now * 0.00105
      const yaw = -0.7 + mouse.x * 0.6
      const roll = -0.78 + mouse.x * 0.16
      const scale = Math.min(w * 0.7, h * 0.5)
      const cx = w * 0.53 + mouse.x * 36
      const cy = h * 0.38 + mouse.y * 18

      const aim = {
        x: mouse.x * Math.cos(-roll) - mouse.y * Math.sin(-roll),
        y: mouse.x * Math.sin(-roll) + mouse.y * Math.cos(-roll),
        z: 0,
      }

      const project = (p: Pt) => {
        const r = rotZ(rotY(p, yaw), roll)
        const persp = 1 / (1.18 - r.z * 0.5)
        return {
          x: cx + r.x * scale * persp,
          y: cy - r.y * scale * persp,
          z: r.z,
        }
      }

      const edges: { a: Pt; b: Pt }[] = []
      const dots: Pt[] = []

      const pushGrid = (pts: Pt[][], closed: boolean) => {
        for (let i = 0; i < pts.length; i++) {
          for (let j = 0; j < pts[i].length; j++) {
            dots.push(pts[i][j])
            const jn = j + 1
            if (closed) edges.push({ a: pts[i][j], b: pts[i][jn % pts[i].length] })
            else if (jn < pts[i].length) edges.push({ a: pts[i][j], b: pts[i][jn] })
            if (i + 1 < pts.length) edges.push({ a: pts[i][j], b: pts[i + 1][j] })
          }
        }
      }

      const mantle: Pt[][] = []
      for (let i = 0; i <= mantleU; i++) {
        const u = i / mantleU
        const ring: Pt[] = []
        for (let j = 0; j < mantleV; j++) {
          ring.push(mantlePoint(u, (j / mantleV) * Math.PI * 2, swim))
        }
        mantle.push(ring)
      }
      pushGrid(mantle, true)
      for (let k = 0; k < 160; k++) {
        dots.push(mantlePoint(hash(k, 1), hash(k, 2) * Math.PI * 2, swim))
      }

      const head: Pt[][] = []
      for (let i = 0; i <= headU; i++) {
        const ring: Pt[] = []
        for (let j = 0; j < headV; j++) {
          ring.push(headPoint(i / headU, (j / headV) * Math.PI * 2))
        }
        head.push(ring)
      }
      pushGrid(head, true)

      for (const side of [-1, 1]) {
        const fin: Pt[][] = []
        for (let i = 0; i <= finU; i++) {
          const row: Pt[] = []
          for (let j = 0; j <= finV; j++) {
            row.push(finPoint(side, i / finU, j / finV))
          }
          fin.push(row)
        }
        pushGrid(fin, false)
      }

      for (const limb of LIMBS) {
        const segs = limb.kind === 'tentacle' ? limbU + 8 : limbU
        const grid: Pt[][] = []
        for (let u = 0; u <= segs; u++) {
          const ring: Pt[] = []
          for (let v = 0; v < limbV; v++) {
            ring.push(limbTube(limb, u / segs, (v / limbV) * Math.PI * 2, aim, swim, mouse.pulse))
          }
          grid.push(ring)
        }
        pushGrid(grid, true)
      }

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      for (const edge of edges) {
        const a = project(edge.a)
        const b = project(edge.b)
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
      }
      const edgeA = 0.38 + spike * 0.16 + mouse.pulse * 0.18 + motor * 0.08
      ctx.strokeStyle = `rgba(232, 238, 255, ${Math.min(0.72, edgeA)})`
      ctx.lineWidth = 0.55
      ctx.stroke()

      for (const p of dots) {
        const q = project(p)
        const near = 0.55 + Math.max(-0.25, q.z) * 0.9
        const a = (0.42 + near * 0.48 + spike * 0.18 + mouse.pulse * 0.22) * (0.8 + motor * 0.2)
        ctx.fillStyle = `rgba(244, 248, 255, ${Math.min(0.98, a)})`
        const s = 1.15 + near * 0.55
        ctx.fillRect(q.x, q.y, s, s)
      }

      for (const limb of LIMBS) {
        const nSuck = limb.kind === 'tentacle' ? 10 : 7
        for (let s = 0; s < nSuck; s++) {
          const t = 0.08 + (s / (nSuck - 1)) * 0.74
          const p = limbPath(limb, t, aim, swim, mouse.pulse)
          const inward = norm({ x: -p.x, y: 0.02, z: -p.z })
          const q = project(add(p, mul(inward, limbRadius(limb, t) * 1.05)))
          const rr = scale * (0.011 + (1 - t) * 0.013)
          ctx.beginPath()
          ctx.strokeStyle = `rgba(236, 242, 255, ${0.42 + (1 - t) * 0.2})`
          ctx.lineWidth = 1
          ctx.arc(q.x, q.y, rr, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      const eye = project(headPoint(0.52, 0.62))
      const eyeR = scale * 0.042
      ctx.beginPath()
      ctx.fillStyle = '#06070b'
      ctx.arc(eye.x, eye.y, eyeR, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(238, 244, 255, 0.92)'
      ctx.lineWidth = 1.7
      ctx.stroke()
      for (let r = 0.32; r < 1; r += 0.14) {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(230, 238, 255, ${0.2 + (1 - r) * 0.14})`
        ctx.lineWidth = 0.7
        ctx.arc(eye.x, eye.y, eyeR * r, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.fillStyle = '#020203'
      ctx.arc(eye.x + eyeR * 0.06, eye.y, eyeR * 0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
      ctx.arc(eye.x - eyeR * 0.22, eye.y - eyeR * 0.2, eyeR * 0.1, 0, Math.PI * 2)
      ctx.fill()

    }

    const stop = loopWhileVisible(view, draw, 22)
    return () => {
      stop()
      view.removeEventListener('pointermove', onMove)
      view.removeEventListener('pointerleave', onLeave)
      view.removeEventListener('pointerdown', onDown)
    }
  }, [])

  return <canvas ref={ref} className="hero-canvas" />
}
