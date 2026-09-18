import { useEffect, useRef } from 'react'
import type { SceneKind } from './creators.ts'
import { drawHouseFly, drawPair, drawPile } from './fly2d.ts'
import { canvasDpr, loopWhileVisible, seedOf } from './raf.ts'

type Props = {
  kind: SceneKind
  seed: string
  detail?: 'thumb' | 'player' | 'avatar'
}

function fillScene(ctx: CanvasRenderingContext2D, w: number, h: number, kind: SceneKind) {
  switch (kind) {
    case 'night':
      ctx.fillStyle = '#07060a'
      break
    case 'drain':
      ctx.fillStyle = '#090a0c'
      break
    case 'kitchen':
      ctx.fillStyle = '#100d0a'
      break
    case 'server':
      ctx.fillStyle = '#08090e'
      break
    case 'compost':
      ctx.fillStyle = '#0c0905'
      break
    case 'swarm':
      ctx.fillStyle = '#0a0907'
      break
    case 'fruit':
      ctx.fillStyle = '#100c08'
      break
    default: {
      const _never: never = kind
      return _never
    }
  }
  ctx.fillRect(0, 0, w, h)
}

function setDress(ctx: CanvasRenderingContext2D, w: number, h: number, kind: SceneKind, t: number) {
  switch (kind) {
    case 'fruit': {
      ctx.fillStyle = '#3a2210'
      ctx.beginPath()
      ctx.ellipse(w * 0.5, h * 0.82, w * 0.42, h * 0.14, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#c45a18'
      ctx.beginPath()
      ctx.ellipse(w * 0.38, h * 0.72, w * 0.2, h * 0.16, -0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e8c040'
      ctx.beginPath()
      ctx.ellipse(w * 0.62, h * 0.7, w * 0.16, h * 0.12, 0.25, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'drain': {
      ctx.fillStyle = '#1a1c1e'
      ctx.fillRect(w * 0.12, h * 0.52, w * 0.76, h * 0.4)
      ctx.strokeStyle = 'rgba(180, 190, 200, 0.28)'
      ctx.lineWidth = 2
      for (let i = 0; i < 7; i++) {
        ctx.beginPath()
        ctx.moveTo(w * 0.14, h * 0.56 + i * h * 0.055)
        ctx.lineTo(w * 0.86, h * 0.56 + i * h * 0.055)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(40, 90, 50, 0.4)'
      ctx.fillRect(w * 0.3, h * 0.64, w * 0.4, h * 0.1)
      break
    }
    case 'kitchen': {
      ctx.fillStyle = '#1a1612'
      ctx.fillRect(0, h * 0.62, w, h * 0.38)
      ctx.fillStyle = '#c45a18'
      ctx.beginPath()
      ctx.ellipse(w * 0.72, h * 0.7, w * 0.14, h * 0.1, 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(180, 200, 210, 0.12)'
      ctx.fillRect(w * 0.08, h * 0.1, w * 0.28, h * 0.36)
      break
    }
    case 'server': {
      for (let n = 0; n < 3; n++) {
        ctx.fillStyle = '#121218'
        ctx.fillRect(w * (0.1 + n * 0.3), h * 0.08, w * 0.24, h * 0.84)
        for (let r = 0; r < 8; r++) {
          ctx.fillStyle = r % 2 ? '#1c1c24' : '#16161c'
          ctx.fillRect(w * (0.12 + n * 0.3), h * (0.12 + r * 0.09), w * 0.2, h * 0.07)
        }
        ctx.fillStyle = n === 1 ? '#0070F0' : '#3d3'
        ctx.beginPath()
        ctx.arc(w * (0.3 + n * 0.3), h * 0.86, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'night': {
      const glow = 22 + Math.sin(t * 3) * 3
      ctx.fillStyle = 'rgba(0, 160, 255, 0.12)'
      ctx.beginPath()
      ctx.arc(w * 0.78, h * 0.16, glow * 2.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#7ec8ff'
      ctx.beginPath()
      ctx.arc(w * 0.78, h * 0.16, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#16120c'
      ctx.fillRect(w * 0.08, h * 0.74, w * 0.84, h * 0.16)
      break
    }
    case 'compost': {
      ctx.fillStyle = '#2a1c0e'
      ctx.beginPath()
      ctx.ellipse(w * 0.5, h * 0.78, w * 0.46, h * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#3a2814'
      ctx.beginPath()
      ctx.ellipse(w * 0.38, h * 0.7, w * 0.18, h * 0.1, -0.2, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'swarm': {
      ctx.fillStyle = '#16120c'
      ctx.fillRect(w * 0.08, h * 0.58, w * 0.36, h * 0.28)
      ctx.strokeStyle = 'rgba(0, 112, 240, 0.35)'
      ctx.strokeRect(w * 0.08, h * 0.58, w * 0.36, h * 0.28)
      ctx.fillStyle = '#1a1008'
      ctx.fillRect(0, h * 0.82, w, h * 0.18)
      break
    }
    default: {
      const _never: never = kind
      return _never
    }
  }
}

export function FlyScene({ kind, seed, detail = 'thumb' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const view = canvas
    const ctx = view.getContext('2d', { alpha: false, desynchronized: true })
    if (!ctx) return
    const rnd = seedOf(seed)

    let resizeAt = -999
    const draw = (now: number) => {
      const parent = view.parentElement
      const w = Math.max(parent?.clientWidth || 160, 80)
      const h = Math.max(parent?.clientHeight || 90, 80)
      const dpr = canvasDpr(w)
      if (now - resizeAt > 400) {
        resizeAt = now
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

      if (detail === 'avatar') {
        ctx.fillStyle = '#d8efff'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#0070F0'
        ctx.beginPath()
        ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.46, 0, Math.PI * 2)
        ctx.fill()
        const t = now * 0.001 + (rnd % 97) * 0.1
        drawHouseFly(ctx, w * 0.52, h * 0.54, Math.min(w, h) * 0.42, -0.35, t, 'hover')
        return
      }

      fillScene(ctx, w, h, kind)
      const t = now * 0.001 + (rnd % 97) * 0.1
      setDress(ctx, w, h, kind, t)
      const s = Math.min(w, h) * (detail === 'player' ? 0.52 : 0.64)

      switch (kind) {
        case 'swarm': {
          drawPile(ctx, w, h, s * 0.7, t, 4, rnd)
          break
        }
        case 'fruit':
        case 'compost':
        case 'drain':
        case 'kitchen':
        case 'night':
        case 'server': {
          drawPair(ctx, w * 0.52, h * 0.52, s, -0.42 + Math.sin(t * 0.35) * 0.06, t)
          if (detail === 'player' || kind === 'fruit') {
            drawHouseFly(ctx, w * 0.14, h * 0.2, s * 0.38, 0.7 + t * 0.2, t, 'hover')
            drawHouseFly(ctx, w * 0.86, h * 0.18, s * 0.34, -2.1, t + 1.2, 'hover')
          }
          if (kind === 'compost' && detail === 'player') {
            drawPair(ctx, w * 0.22, h * 0.72, s * 0.42, 0.4, t + 2)
          }
          break
        }
        default: {
          const _never: never = kind
          return _never
        }
      }
    }

    const stop = loopWhileVisible(view, draw, detail === 'player' ? 22 : 33)
    return () => stop()
  }, [kind, seed, detail])

  return <canvas ref={ref} className="fly-scene" />
}
