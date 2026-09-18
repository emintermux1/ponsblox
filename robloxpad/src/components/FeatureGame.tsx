import { motion, useReducedMotion } from 'motion/react'
import { formatLikePct, formatPlayers, type GameListing } from '../lib/games.ts'
import { ease } from '../lib/motion.ts'
import { gamePath, launchPath, onNavClick } from '../lib/router.ts'

export function FeatureGame({ game }: { game: GameListing }) {
  const reduce = useReducedMotion()
  return (
    <motion.section
      className="feature"
      initial={reduce ? false : { y: 18 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease }}
    >
      <a
        className="feature__art"
        href={gamePath(game.id)}
        onClick={onNavClick(gamePath(game.id))}
      >
        {game.image ? (
          <img src={game.image} alt="" width={400} height={400} />
        ) : (
          <div className="feature__empty" />
        )}
      </a>
      <div className="feature__copy">
        <p className="kicker">Hottest now</p>
        <h2>{game.name}</h2>
        <p className="lede">
          {formatPlayers(game.playing)} playing
          {game.likeRatio > 0 ? ` · ${formatLikePct(game.likeRatio)} likes` : ''}
          {game.genre ? ` · ${game.genre}` : ''}
        </p>
        <div className="hero__cta">
          <a className="btn btn--fire" href={launchPath(game.id)} onClick={onNavClick(launchPath(game.id))}>Launch</a>
          <a className="btn btn--ghost" href={gamePath(game.id)} onClick={onNavClick(gamePath(game.id))}>Open</a>
          <a className="btn btn--ghost" href={game.url} target="_blank" rel="noreferrer">Roblox ↗</a>
        </div>
      </div>
    </motion.section>
  )
}
