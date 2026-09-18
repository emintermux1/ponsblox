import { useEffect, useRef } from 'react'
import { BALL_R, PADDLE_H, PADDLE_SLIM, PAGER_X, YOU_X, type SimRuntime } from './sim.ts'
import { canvasDpr, loopWhileVisible } from './raf.ts'

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function MindCourt({
  live,
  aim,
  setAspect,
}: {
  live: { current: SimRuntime }
  aim: (y: number, on: boolean) => void
  setAspect: (aspect: number) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const view = canvas
    const ctx = view.getContext('2d', { alpha: false, desynchronized: true })
    if (!ctx) return

    function courtY(clientY: number, box: DOMRect) {
      const t = (clientY - box.top) / Math.max(1, box.height)
      return 1 - t * 2
    }

    function onMove(ev: PointerEvent) {
      const box = view.getBoundingClientRect()
      aim(courtY(ev.clientY, box) * 0.92, true)
    }
    function onLeave() {
      aim(live.current.youY, false)
    }
    function onDown(ev: PointerEvent) {
      view.setPointerCapture(ev.pointerId)
      onMove(ev)
    }

    view.addEventListener('pointermove', onMove)
    view.addEventListener('pointerdown', onDown)
    view.addEventListener('pointerleave', onLeave)
    view.addEventListener('pointerup', onLeave)

    let resizeAt = -999
    const draw = (now: number) => {
      const rt = live.current
      const parent = view.parentElement
      const w = parent?.clientWidth ?? 640
      const h = parent?.clientHeight ?? 420
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
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)

      const pad = 36
      const x0 = pad
      const y0 = pad
      const x1 = w - pad
      const y1 = h - pad
      const cx = (x0 + x1) / 2
      const sx = (x1 - x0) / 2
      const sy = (y1 - y0) / 2
      setAspect(sx / Math.max(1, sy))

      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 1
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0)
      ctx.beginPath()
      ctx.setLineDash([3, 10])
      ctx.moveTo(cx, y0)
      ctx.lineTo(cx, y1)
      ctx.stroke()
      ctx.setLineDash([])

      const toX = (nx: number) => lerp(x0, x1, (nx + 1) / 2)
      const toY = (ny: number) => lerp(y1, y0, (ny + 1) / 2)
      const ph = PADDLE_H * sy
      const pw = (ph * 2) / PADDLE_SLIM
      const br = BALL_R * sx

      ctx.fillStyle = 'rgba(244,244,242,0.94)'
      ctx.fillRect(toX(YOU_X) - pw / 2, toY(rt.youY) - ph, pw, ph * 2)
      ctx.fillRect(toX(PAGER_X) - pw / 2, toY(rt.pagerY) - ph, pw, ph * 2)

      ctx.beginPath()
      ctx.fillStyle = '#fff'
      ctx.arc(toX(rt.ballX), toY(rt.ballY), br, 0, Math.PI * 2)
      ctx.fill()
    }

    const stop = loopWhileVisible(view, draw, 16)
    return () => {
      stop()
      view.removeEventListener('pointermove', onMove)
      view.removeEventListener('pointerdown', onDown)
      view.removeEventListener('pointerleave', onLeave)
      view.removeEventListener('pointerup', onLeave)
    }
  }, [aim, live, setAspect])

  return <canvas ref={ref} className="court-canvas" tabIndex={0} />
}
