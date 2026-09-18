export function loopWhileVisible(
  el: HTMLElement,
  frame: (t: number) => void,
): () => void {
  let id = 0
  let running = false
  const tick = (t: number) => {
    if (!running) return
    frame(t)
    id = requestAnimationFrame(tick)
  }
  const io = new IntersectionObserver((entries) => {
    const on = entries.some((e) => e.isIntersecting)
    if (on && !running) {
      running = true
      id = requestAnimationFrame(tick)
    } else if (!on && running) {
      running = false
      cancelAnimationFrame(id)
    }
  }, { threshold: 0.05 })
  io.observe(el)
  return () => {
    running = false
    cancelAnimationFrame(id)
    io.disconnect()
  }
}
