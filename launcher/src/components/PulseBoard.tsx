import { useEffect, useRef } from 'react'
import { CUSTOM_DEFAULT, type CustomSkin } from '../lib/custom.ts'
import { kitById, type KitId } from '../lib/kits.ts'
import { loopWhileVisible } from '../lib/raf.ts'

const BARS = 28

export function PulseBoard(props: { kit: KitId; custom?: CustomSkin; pads: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const stop = loopWhileVisible(c, (t) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = c.clientWidth
      const h = c.clientHeight
      if (c.width !== Math.floor(w * dpr) || c.height !== Math.floor(h * dpr)) {
        c.width = Math.floor(w * dpr)
        c.height = Math.floor(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const kit = kitById(props.kit)
      const skin = props.kit === 'custom' ? { ...CUSTOM_DEFAULT, ...props.custom } : kit
      const gap = 4
      const bw = (w - gap * (BARS - 1)) / BARS
      for (let i = 0; i < BARS; i += 1) {
        const n = 0.18 + 0.82 * Math.abs(Math.sin(t * 0.0018 + i * 0.38))
        const seed = (props.pads + 1) * 0.04
        const hh = (n * 0.7 + seed * 0.15) * (h - 6)
        ctx.fillStyle = skin.accent
        ctx.globalAlpha = 0.28 + n * 0.72
        ctx.fillRect(i * (bw + gap), h - hh, bw, hh)
      }
      ctx.globalAlpha = 1
    })
    return stop
  }, [props.kit, props.custom, props.pads])

  return (
    <div className="pulse">
      <canvas ref={canvas} />
      <p>{props.pads} pads</p>
    </div>
  )
}
