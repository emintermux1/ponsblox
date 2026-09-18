import { useEffect, useState } from 'react'
import { InspectPane } from '../components/InspectModal.tsx'
import { EmptyState, ErrorState } from '../components/ErrorState.tsx'
import { PlayerSpark } from '../components/Spark.tsx'
import { fetchGame, type GameDetail } from '../lib/api.ts'
import { launchPath, onNavClick, tokenPath } from '../lib/router.ts'

export function GamePage({ id }: { id: string }) {
  const [game, setGame] = useState<GameDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setGame(null)
    void fetchGame(id).then(setGame).catch((e: Error) => setErr(e.message))
  }, [id])

  return (
    <main className="page">
      <ErrorState error={err} />
      {game && (
        <>
          <InspectPane game={game} />
          <PlayerSpark gameId={game.id} playing={game.playing} likeRatio={game.likeRatio} />
          <div className="row">
            <a className="btn btn--fire" href={launchPath(game.id)} onClick={onNavClick(launchPath(game.id))}>Launch</a>
            <a className="btn btn--ghost" href={game.url} target="_blank" rel="noreferrer">Open on Roblox ↗</a>
          </div>
          <h2>Tokens paired to this game</h2>
          {(!game.tokens || game.tokens.length === 0) && (
            <EmptyState title="None yet" body="Launch on this game. First on the curve.">
              <a className="btn btn--fire btn--sm" href={launchPath(game.id)} onClick={onNavClick(launchPath(game.id))}>Launch</a>
            </EmptyState>
          )}
          {game.tokens && game.tokens.length > 0 && (
            <ul className="pick">
              {game.tokens.map((t) => (
                <li key={t.token}>
                  <a href={tokenPath(t.token)} onClick={onNavClick(tokenPath(t.token))}>{t.token}</a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
