import { useEffect, useRef } from 'react'
import { canvasDpr, loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

export function DanceFloor({ runtime }: { runtime: SimRuntime }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const live = useRef(runtime)
  live.current = runtime
  const trail = useRef<Array<[number, number]>>([])
  const lastScout = useRef(runtime.scout)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
    if (!ctx) return

    const draw = () => {
      const rt = live.current
      const parent = canvas.parentElement
      const w = parent?.clientWidth ?? 640
      const h = parent?.clientHeight ?? 300
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

      const cx = w * 0.5
      const cy = h * 0.58
      const r = Math.min(w, h) * 0.3

      ctx.fillStyle = 'rgba(240,180,74,0.72)'
      ctx.font = '11px "IBM Plex Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('SUN', cx, 22)
      ctx.strokeStyle = 'rgba(240,180,74,0.22)'
      ctx.beginPath()
      ctx.moveTo(cx, 28)
      ctx.lineTo(cx, h - 10)
      ctx.stroke()

      const site = rt.site
      ctx.strokeStyle = 'rgba(244,240,232,0.5)'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      switch (site.kind) {
        case 'round':
          ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2)
          break
        case 'waggle': {
          const bear = (site.bearingDeg * Math.PI) / 180
          const run = r * (0.42 + Math.min(1, site.waggleS / 4) * 0.38)
          const wx = cx + Math.sin(bear) * run
          const wy = cy - Math.cos(bear) * run
          ctx.moveTo(cx, cy)
          ctx.lineTo(wx, wy)
          ctx.moveTo(cx, cy)
          ctx.bezierCurveTo(cx + r * 0.72, cy + r * 0.18, wx + r * 0.18, wy + r * 0.32, wx, wy)
          ctx.moveTo(cx, cy)
          ctx.bezierCurveTo(cx - r * 0.72, cy + r * 0.18, wx - r * 0.18, wy + r * 0.32, wx, wy)
          break
        }
        default: {
          const _never: never = site.kind
          return _never
        }
      }
      ctx.stroke()

      if (lastScout.current !== rt.scout) {
        lastScout.current = rt.scout
        trail.current = []
      }
      const px = cx + Math.sin(rt.angle) * r * 0.6
      const py = cy - Math.cos(rt.angle) * r * 0.6
      const path = trail.current
      path.push([px, py])
      if (path.length > 90) path.shift()

      if (path.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(240,180,74,0.35)'
        ctx.lineWidth = 1
        ctx.moveTo(path[0][0], path[0][1])
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1])
        ctx.stroke()
      }

      ctx.fillStyle = '#f0b44a'
      ctx.beginPath()
      ctx.arc(px, py, 3.4 + rt.waggle * 3.2, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#8a8176'
      ctx.textAlign = 'left'
      ctx.fillText(site.kind === 'round' ? `round  ${site.meters} m` : `${site.bearingDeg}°  ${site.waggleS.toFixed(2)} s`, 12, h - 12)
    }

    const stop = loopWhileVisible(canvas, draw, 33)
    return stop
  }, [])

  return <canvas ref={ref} className="lab-canvas" />
}
