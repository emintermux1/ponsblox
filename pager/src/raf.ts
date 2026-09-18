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
    if (!seen || document.visibilityState !== 'visible') return
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
  if (width >= 1400) return Math.min(1.15, raw)
  return Math.min(1.35, raw)
}
