import { motion, useReducedMotion } from 'motion/react'
import { type GameListing } from '../lib/games.ts'
import { stagger } from '../lib/motion.ts'
import { gamePath, onNavClick } from '../lib/router.ts'

export function IconRail({ items }: { items: GameListing[] }) {
  const reduce = useReducedMotion()
  const icons = items.filter((g) => g.image).slice(0, 16)
  if (icons.length < 8) return null
  return (
    <nav className="rail" aria-label="Games on the board">
      {icons.map((g, i) => (
        <motion.a
          key={g.id}
          href={gamePath(g.id)}
          onClick={onNavClick(gamePath(g.id))}
          title={g.name}
          initial={reduce ? false : { y: 10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.4, delay: reduce ? 0 : stagger(i, 16, 0.025) }}
        >
          <img src={g.image} alt={g.name} width={52} height={52} />
        </motion.a>
      ))}
    </nav>
  )
}
