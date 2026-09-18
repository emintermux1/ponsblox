import { useEffect, useRef, useState } from 'react'

export function useInView<T extends HTMLElement>(once = true) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      setVisible(true)
      if (once) return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setVisible(true)
        if (once) io.disconnect()
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [once])

  return { ref, visible }
}
