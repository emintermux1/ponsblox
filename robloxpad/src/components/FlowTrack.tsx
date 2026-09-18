import { motion, useReducedMotion } from 'motion/react'
import { Fragment } from 'react'
import { ease, stagger } from '../lib/motion.ts'

const STEPS = [
  { title: 'Play', body: 'The board is live Roblox. Find a game people are in right now.', img: '/brand/games-grid.jpg' },
  { title: 'Launch', body: 'Put a token on that game. One sign. The curve is live from the first block.', img: '/brand/hero-cube.jpg' },
  { title: 'Earn', body: 'Trade while they play. Creator tax on every swap. Graduation locks the pool.', img: '/brand/mascot.jpg' },
] as const

export function FlowTrack() {
  const reduce = useReducedMotion()
  return (
    <section className="flowtrack" aria-label="How it works">
      {STEPS.map((step, i) => (
        <Fragment key={step.title}>
          <motion.article
            className="flowtrack__card"
            initial={reduce ? false : { y: 16 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease, delay: stagger(i, 3, 0.08) }}
          >
            <div className="flowtrack__img">
              <motion.img
                src={step.img}
                alt=""
                width={640}
                height={360}
                initial={reduce ? false : { scale: 1.08 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease, delay: stagger(i, 3, 0.08) }}
              />
            </div>
            <p className="kicker">{String(i + 1).padStart(2, '0')}</p>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </motion.article>
          {i < STEPS.length - 1 && (
            <motion.span
              className="flowtrack__join"
              aria-hidden
              initial={reduce ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease, delay: 0.2 + stagger(i, 3, 0.1) }}
            />
          )}
        </Fragment>
      ))}
    </section>
  )
}
