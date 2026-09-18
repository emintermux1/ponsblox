import { useEffect, useRef } from 'react'

type Ember = {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  life: number
  max: number
}

function seed(count: number, w: number, h: number): Ember[] {
  return Array.from({ length: count }, () => {
    const max = 80 + Math.random() * 140
    return {
      x: Math.random() * w,
      y: h * (0.45 + Math.random() * 0.55),
      r: 0.6 + Math.random() * 1.8,
      vx: -0.25 + Math.random() * 0.5,
      vy: -0.35 - Math.random() * 0.7,
      life: Math.random() * max,
      max,
    }
  })
}

export function Embers() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frame = 0
    let embers: Ember[] = []
    let running = true

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      embers = seed(42, w, h)
    }

    const tick = () => {
      if (!running) return
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)
      for (const e of embers) {
        e.x += e.vx
        e.y += e.vy
        e.life += 1
        if (e.life > e.max || e.y < -8) {
          e.x = Math.random() * w
          e.y = h * (0.55 + Math.random() * 0.45)
          e.life = 0
        }
        const t = e.life / e.max
        const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85
        ctx.beginPath()
        ctx.fillStyle = `rgba(255, ${Math.floor(90 + 80 * (1 - t))}, 20, ${0.55 * alpha})`
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
        ctx.fill()
      }
      frame = window.requestAnimationFrame(tick)
    }

    resize()
    frame = window.requestAnimationFrame(tick)
    window.addEventListener('resize', resize)
    return () => {
      running = false
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="embers" aria-hidden="true" />
}
