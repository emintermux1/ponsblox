import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef, type PointerEvent } from 'react'
import { ease } from '../lib/motion.ts'

export function HeroStage() {
  const reduce = useReducedMotion()
  const box = useRef<HTMLElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 140, damping: 24, mass: 0.6 })
  const y = useSpring(my, { stiffness: 140, damping: 24, mass: 0.6 })
  const gx = useSpring(mx, { stiffness: 80, damping: 28, mass: 0.9 })
  const gy = useSpring(my, { stiffness: 80, damping: 28, mass: 0.9 })
  const { scrollYProgress } = useScroll({ target: box, offset: ['start end', 'end start'] })
  const drift = useTransform(scrollYProgress, [0, 1], [12, -12])
  const cubeY = useTransform(() => y.get() + (reduce ? 0 : drift.get()))
  const gridY = useTransform(() => gy.get() + (reduce ? 0 : drift.get() * 0.35))

  function move(e: PointerEvent<HTMLElement>) {
    if (reduce) return
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 20)
    my.set(((e.clientY - r.top) / r.height - 0.5) * 16)
  }

  function leave() {
    mx.set(0)
    my.set(0)
  }

  return (
    <motion.figure
      ref={box}
      className="hero__art"
      onPointerMove={move}
      onPointerLeave={leave}
      initial={reduce ? false : { y: 20 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.7, ease }}
    >
      <motion.img
        className="hero__art-grid"
        src="/brand/games-grid.jpg"
        alt=""
        width={1600}
        height={800}
        style={reduce ? undefined : { x: gx, y: gridY }}
      />
      <motion.img
        className="hero__art-cube"
        src="/brand/hero-cube.jpg"
        alt="RobloxPad"
        width={1024}
        height={1024}
        style={reduce ? undefined : { x, y: cubeY }}
      />
    </motion.figure>
  )
}
