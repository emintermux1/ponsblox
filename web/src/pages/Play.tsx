import { playUrl } from '../lib/play.ts'

export function Play() {
  const href = playUrl()
  return (
    <div className="stage">
      <header className="bar">
        <div className="bar__name">PONSBLOX</div>
        <a className="play play--sm" href={href}>Play on Roblox</a>
      </header>

      <section className="mast">
        <p className="mast__kicker">A game on Roblox</p>
        <h1>Get on the server.</h1>
        <p className="mast__lead">
          Ponsblox is a 3D map. You spawn in, walk the floor, and play a game inside the game.
          The site does not launch anything. The game does.
        </p>
        <a className="play play--xl" href={href}>Play on Roblox</a>
      </section>

      <div className="iso" aria-hidden="true">
        <div className="iso__ground" />
        <div className="iso__pad">
          <span>THE PAD</span>
        </div>
        <div className="iso__floor">
          <span>THE FLOOR</span>
        </div>
        <div className="iso__board">
          <span>THE BOARD</span>
        </div>
        <div className="iso__you">YOU</div>
      </div>

      <section className="spots">
        <article>
          <h2>The Pad</h2>
          <p>A building on the map. Walk up, use it, keep playing.</p>
        </article>
        <article>
          <h2>The Floor</h2>
          <p>The trade hall. Same server. Same walk. No website form.</p>
        </article>
        <article>
          <h2>The Board</h2>
          <p>Live wall in the plaza. Watch the room, then go back in.</p>
        </article>
      </section>

      <footer className="foot">
        <a className="play" href={href}>Join the server</a>
      </footer>
    </div>
  )
}
