import { motion, useReducedMotion } from 'motion/react'
import { formatPlayers, type GameListing } from '../lib/games.ts'
import { ease, stagger } from '../lib/motion.ts'
import { gamePath, onNavClick } from '../lib/router.ts'

export function HeatRow({ items }: { items: GameListing[] }) {
  const reduce = useReducedMotion()
  const row = items.filter((g) => g.image).slice(0, 3)
  if (row.length < 3) return null
  return (
    <div className="heatrow">
      {row.map((game, i) => (
        <motion.a
          key={game.id}
          className="heatrow__card"
          href={gamePath(game.id)}
          onClick={onNavClick(gamePath(game.id))}
          initial={reduce ? false : { y: 16 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease, delay: stagger(i, 3, 0.07) }}
        >
          <span className="heatrow__img">
            <img src={game.image} alt="" width={400} height={400} />
          </span>
          <span className="heatrow__meta">
            <strong>{game.name}</strong>
            <em>{formatPlayers(game.playing)} playing</em>
          </span>
        </motion.a>
      ))}
    </div>
  )
}
