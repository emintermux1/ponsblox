import { motion, useReducedMotion } from 'motion/react'
import { shareOf } from '../lib/chart.ts'
import { formatPlayers, type GameListing } from '../lib/games.ts'
import { ease, stagger } from '../lib/motion.ts'
import { gamePath, onNavClick } from '../lib/router.ts'

export function BoardHeat({ items }: { items: GameListing[] }) {
  const reduce = useReducedMotion()
  const top = [...items].sort((a, b) => b.playing - a.playing).slice(0, 8)
  const max = top[0]?.playing || 1
  if (top.length === 0) return null

  return (
    <ol className="heat" aria-label="Games by players right now">
      {top.map((g, i) => (
        <motion.li
          key={g.id}
          initial={reduce ? false : { y: 8 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.4, ease, delay: stagger(i, 8, 0.045) }}
          whileHover={reduce ? undefined : { x: 4 }}
        >
          <a href={gamePath(g.id)} onClick={onNavClick(gamePath(g.id))}>
            <em>{String(i + 1).padStart(2, '0')}</em>
            {g.image ? <img src={g.image} alt="" /> : <span className="heat__blank" />}
            <div>
              <strong>{g.name}</strong>
              <span>{formatPlayers(g.playing)} playing</span>
              <motion.i
                className="heat__bar"
                aria-hidden
                style={{ width: `${shareOf(g.playing, max) * 100}%`, originX: 0 }}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.55, ease, delay: 0.08 + stagger(i, 8, 0.04) }}
              />
            </div>
          </a>
        </motion.li>
      ))}
    </ol>
  )
}

export function GenreMix({ items }: { items: GameListing[] }) {
  const reduce = useReducedMotion()
  const counts = new Map<string, number>()
  for (const g of items) counts.set(g.genre, (counts.get(g.genre) || 0) + 1)
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  const max = rows[0]?.[1] || 1
  if (rows.length === 0) return null

  return (
    <ol className="mix" aria-label="Genres on the board">
      {rows.map(([genre, n], i) => (
        <motion.li
          key={genre}
          initial={reduce ? false : { y: 6 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.35, ease, delay: stagger(i, 8, 0.04) }}
        >
          <span>{genre}</span>
          <motion.i
            aria-hidden
            style={{ width: `${shareOf(n, max) * 100}%`, originX: 0 }}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, ease, delay: 0.06 + stagger(i, 8, 0.04) }}
          />
          <em>{n}</em>
        </motion.li>
      ))}
    </ol>
  )
}
