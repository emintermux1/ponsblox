import { useEffect, useState } from 'react'

export function useRotate(count: number, hold = 2800) {
  const [i, setI] = useState(0)
  const [out, setOut] = useState(false)

  useEffect(() => {
    if (count < 2) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const wait = reduce ? Math.max(hold, 5000) : hold
    let swap = 0
    const id = window.setInterval(() => {
      if (reduce) {
        setI((n) => (n + 1) % count)
        return
      }
      setOut(true)
      swap = window.setTimeout(() => {
        setI((n) => (n + 1) % count)
        setOut(false)
      }, 340)
    }, wait)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(swap)
    }
  }, [count, hold])

  return { i, out }
}
