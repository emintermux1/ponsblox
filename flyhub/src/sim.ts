import { useEffect, useState } from 'react'

export function useClock() {
  const [tMs, setTMs] = useState(0)

  useEffect(() => {
    const start = performance.now()
    let frame = 0
    const loop = (now: number) => {
      setTMs(now - start)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  return tMs
}
