import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Scroll-reveal section. Visibility-safe by construction: the hiding class is
 * only ever added from JS after confirming IntersectionObserver support and
 * that reduced motion is off — if any of that fails, content stays visible.
 */
export function Reveal({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return
    el.classList.add('reveal')
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add('reveal--in')
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return <section ref={ref} className={className}>{children}</section>
}
