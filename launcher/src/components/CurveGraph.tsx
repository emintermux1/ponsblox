import { useEffect, useRef } from 'react'
import { CURVES, type CurveId } from '../lib/copy.ts'
import { curvePoints } from '../lib/curve.ts'
import { loopWhileVisible } from '../lib/raf.ts'

const COLORS: Record<CurveId, string> = {
  0: '#7dd3fc',
  1: '#c8ff3d',
  2: '#fb7185',
}

export function CurveGraph(props: {
  active: CurveId
  onPick?: (id: CurveId) => void
  live?: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const series = CURVES.map((curve) => ({ id: curve.id, pts: curvePoints(curve.id, 80, 36) }))

    const paint = (t: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = c.clientWidth
      const h = c.clientHeight
      if (c.width !== Math.floor(w * dpr) || c.height !== Math.floor(h * dpr)) {
        c.width = Math.floor(w * dpr)
        c.height = Math.floor(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const maxY = Math.max(...series.flatMap((s) => s.pts.map((p) => p.y)))
      const head = props.live ? (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0007))) : 1
      for (const s of series) {
        ctx.beginPath()
        s.pts.forEach((p, i) => {
          if (i / s.pts.length > head) return
          const x = 8 + (p.x / 36) * (w - 16)
          const y = h - 10 - (p.y / maxY) * (h - 20)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.strokeStyle = COLORS[s.id]
        ctx.globalAlpha = s.id === props.active ? 1 : 0.28
        ctx.lineWidth = s.id === props.active ? 2.4 : 1.4
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paint(0)
      return
    }
    return loopWhileVisible(c, paint)
  }, [props.active, props.live])

  return (
    <div className="graph">
      <canvas ref={canvas} />
      {props.onPick && (
        <div className="graph-keys">
          {CURVES.map((curve) => (
            <button
              key={curve.id}
              type="button"
              className={curve.id === props.active ? 'on' : ''}
              onClick={() => props.onPick?.(curve.id)}
            >
              {curve.name} · {curve.line}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
