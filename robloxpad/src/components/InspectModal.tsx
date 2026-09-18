import { formatLikePct, formatPlayers, type GameListing } from '../lib/games.ts'

export function InspectPane({ game }: { game: GameListing }) {
  return (
    <div className="inspect">
      <div className="inspect__art">
        {game.image ? (
          <img src={game.image} alt={game.name} width={480} height={480} />
        ) : (
          <div className="inspect__empty">No Roblox icon</div>
        )}
      </div>
      <div className="inspect__copy">
        <p className="kicker">{game.genre}{game.maturity ? ` · ${game.maturity}` : ''}</p>
        <h2>{game.name}</h2>
        <dl className="kv">
          <div>
            <dt>Playing now</dt>
            <dd>{formatPlayers(game.playing)}</dd>
          </div>
          <div><dt>Likes</dt><dd>{formatLikePct(game.likeRatio)}</dd></div>
          <div><dt>Creator</dt><dd>{game.creatorName || 'Roblox'}</dd></div>
          <div><dt>Universe</dt><dd className="mono">{game.universeId}</dd></div>
        </dl>
        <a className="btn btn--ghost btn--sm" href={game.url} target="_blank" rel="noreferrer">
          Open on Roblox ↗
        </a>
      </div>
    </div>
  )
}
