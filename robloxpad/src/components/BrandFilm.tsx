import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'

export function BrandFilm() {
  const reduce = useReducedMotion()
  const box = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: box, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])

  return (
    <figure ref={box} className="brandfilm">
      <motion.img
        src="/brand/banner.jpg"
        alt="RobloxPad"
        width={1600}
        height={640}
        style={reduce ? undefined : { y }}
      />
    </figure>
  )
}
