import { useEffect, useState } from 'react'

let now = Date.now()
const listeners = new Set<() => void>()
let timer = 0

function tick() {
  now = Date.now()
  listeners.forEach((fn) => fn())
}

export function useSharedNow(): number {
  const [value, setValue] = useState(now)

  useEffect(() => {
    const onTick = () => setValue(now)
    listeners.add(onTick)
    if (listeners.size === 1) timer = window.setInterval(tick, 1000)
    return () => {
      listeners.delete(onTick)
      if (listeners.size === 0) window.clearInterval(timer)
    }
  }, [])

  return value
}
