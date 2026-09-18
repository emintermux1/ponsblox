import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { ease } from '../lib/motion.ts'

export function Rise({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { y: 16 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.5, ease, delay }}
    >
      {children}
    </motion.div>
  )
}
