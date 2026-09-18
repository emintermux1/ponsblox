import { GameCard } from './GameCard.tsx'
import { type GameListing } from '../lib/games.ts'

export function BoardList({ items }: { items: GameListing[] }) {
  return (
    <div className="blist">
      <div className="blist__head">
        <span className="gcard__rank">#</span>
        <span>Game</span>
        <span>Playing</span>
        <span>Likes</span>
        <span />
      </div>
      {items.map((g, i) => <GameCard key={g.id} game={g} index={i} rank={i + 1} />)}
    </div>
  )
}
