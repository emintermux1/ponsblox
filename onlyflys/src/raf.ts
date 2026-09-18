export function loopWhileVisible(
  el: HTMLElement,
  draw: (now: number) => void,
  minMs = 33,
): () => void {
  let frame = 0
  let last = 0
  let seen = true

  const io = new IntersectionObserver(
    ([entry]) => {
      seen = entry.isIntersecting
    },
    { rootMargin: '160px' },
  )
  io.observe(el)

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick)
    if (!seen) return
    if (now - last < minMs) return
    last = now
    draw(now)
  }
  frame = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(frame)
    io.disconnect()
  }
}

export function canvasDpr(width: number) {
  const raw = window.devicePixelRatio || 1
  if (width >= 1400) return Math.min(1.5, raw)
  return Math.min(2, raw)
}

export function seedOf(id: string) {
  let n = 2166136261
  for (let i = 0; i < id.length; i++) n = Math.imul(n ^ id.charCodeAt(i), 16777619)
  return Math.abs(n)
}
