import { CATALOGUE_SIZE, PONS_DOCS_URL, PONS_FACTORY, PONS_FEE_ESCROW, PONS_LAUNCH_LOCKER, PONS_MEME_HOOK, ROBLOXPAD_OFFICIAL_TOKEN, ROBLOXPAD_TICKER } from '../config/official.ts'

export function Docs() {
  return (
    <main className="page docs">
      <p className="kicker">Docs</p>
      <h1>Play. Launch. Earn.</h1>
      <p>
        People are in these Roblox games right now. Pick one. Launch a token on Pons V2.
        Trade from the first block. Creator tax hits every swap.
      </p>

      <figure className="docs__art">
        <img src="/brand/banner.jpg" alt="RobloxPad" loading="lazy" />
      </figure>

      <h2>Overview</h2>
      <p>
        A token here is a Pons V2 launch on a live Roblox game: a bonding curve holding the entire supply,
        tradeable from the first block, graduating into a pool with permanently locked liquidity.
        Playing count and likes come from Roblox.
      </p>
      <ol>
        <li><strong>Play.</strong> Search a title or pick from live Roblox Explore. Playing count is who is in it now.</li>
        <li><strong>Launch.</strong> The universe id rides with the token as <code>ROBLOXPAD:{'{universeId}'}</code>. One sign. Curve is live.</li>
        <li><strong>Earn.</strong> Trade while they play. Creator tax on every swap. Graduation locks the pool.</li>
      </ol>

      <h2>The game on the token</h2>
      <p>Each launch is tied to one Roblox universe — title, players, creator, genre, the game URL.</p>
      <pre>ROBLOXPAD:383310974</pre>
      <p>
        The game stays on the token from launch. Website on the launch is the Roblox game URL.
      </p>

      <h2>Where game data comes from</h2>
      <p>
        Titles, icons, playing counts, votes, and genres come from Roblox Explore and search.
        Icons are official Roblox thumbnails. Nothing on this site invents a game that Roblox did not return.
      </p>

      <h2>The board</h2>
      <p>
        The board is the {CATALOGUE_SIZE} busiest games from Roblox Explore sorts — trending,
        up-and-coming, playing now, with friends, revisited — ranked by CCU. Search reaches beyond
        that list. A token already launched is unaffected by a reranking. Two tokens may pair the same game.
      </p>

      <h2>Bonding curve</h2>
      <p>
        A bonding curve holds the whole supply from the moment of launch and will always sell you
        tokens and always buy them back. This is why a token is tradeable in its first block with
        nobody providing liquidity.
      </p>

      <h2>Graduation</h2>
      <p>
        When the curve has sold its sellable supply, the launch graduates. Everything the curve
        collected seeds a Uniswap v4 pool, and the liquidity position is locked permanently.
      </p>

      <h2>Fees</h2>
      <ul>
        <li><strong>Launch fee</strong> — set by Pons, paid once in ETH.</li>
        <li><strong>Curve fee</strong> — charged by Pons on curve trades.</li>
        <li><strong>Creator fee</strong> — charged on every trade, paid to the creator through the Pons escrow.</li>
      </ul>
      <p>Fees are always charged in ETH. Creators collect from the token fees page.</p>

      <h2>Contracts</h2>
      <p>Everything runs on the Pons V2 contracts on Robinhood Chain, chain id 4663.</p>
      <ul className="mono">
        <li>${ROBLOXPAD_TICKER} {ROBLOXPAD_OFFICIAL_TOKEN}</li>
        <li>Launch factory {PONS_FACTORY}</li>
        <li>Meme hook {PONS_MEME_HOOK}</li>
        <li>Fee escrow {PONS_FEE_ESCROW}</li>
        <li>Launch locker {PONS_LAUNCH_LOCKER}</li>
      </ul>
      <p>
        Official Pons documentation:{' '}
        <a href={PONS_DOCS_URL} target="_blank" rel="noreferrer">{PONS_DOCS_URL}</a>
      </p>
      <p>
        This site is non-custodial. Your wallet signs every transaction. The site keeps an index of
        tokens launched through it and the game each one is paired to. Platform ticker ${ROBLOXPAD_TICKER}.
      </p>
    </main>
  )
}
