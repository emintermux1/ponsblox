import { motion, useReducedMotion } from 'motion/react'
import { formatLikePct, formatPlayers, type GameListing } from '../lib/games.ts'
import { ease, stagger } from '../lib/motion.ts'
import { gamePath, launchPath, onNavClick } from '../lib/router.ts'

export function GameCard({
  game,
  index = 0,
  rank,
}: {
  game: GameListing
  index?: number
  rank?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.article
      className="gcard"
      initial={reduce ? false : { y: 10 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.36, ease, delay: stagger(index) }}
    >
      {rank != null && <em className="gcard__rank">{String(rank).padStart(2, '0')}</em>}
      <a className="gcard__game" href={gamePath(game.id)} onClick={onNavClick(gamePath(game.id))}>
        {game.image ? (
          <span className="gcard__thumb">
            <img className="gcard__img" src={game.image} alt="" />
          </span>
        ) : (
          <span className="gcard__thumb">
            <span className="gcard__img gcard__img--empty" />
          </span>
        )}
        <div className="gcard__copy">
          <h3>{game.name}</h3>
          <p>{game.creatorName || 'Roblox'} · {game.genre}</p>
        </div>
      </a>
      <span className="gcard__n">{formatPlayers(game.playing)}</span>
      <span className="likes">{game.likeRatio > 0 ? formatLikePct(game.likeRatio) : '—'}</span>
      <a className="gcard__go" href={launchPath(game.id)} onClick={onNavClick(launchPath(game.id))}>
        Launch
      </a>
    </motion.article>
  )
}
