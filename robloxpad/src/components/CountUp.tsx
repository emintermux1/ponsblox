import { useEffect, useRef, useState } from 'react'

export function CountUp({ value, fallback = '—' }: { value: number | null | undefined; fallback?: string }) {
  const [shown, setShown] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (value == null || !Number.isFinite(value)) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setShown(value)
      fromRef.current = value
      return
    }
    const start = performance.now()
    const from = fromRef.current
    const dur = 720
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - (1 - t) ** 3
      setShown(Math.round(from + (value - from) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
      else fromRef.current = value
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  if (value == null || !Number.isFinite(value)) return <>{fallback}</>
  return <>{shown.toLocaleString('en-US')}</>
}
