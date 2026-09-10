import { CATALOGUE_SIZE, ON_PEG_BAND, PONS_DOCS_URL, PONS_FACTORY, PONS_FEE_ESCROW, PONS_LAUNCH_LOCKER, PONS_MEME_HOOK, SKINPAD_TICKER } from '../config/official.ts'

export function Docs() {
  return (
    <main className="page docs">
      <p className="kicker">Docs</p>
      <h1>How it works</h1>
      <p>
        Every token here is pegged to one CS2 skin, one to one. This page covers the whole system:
        what the peg is and is not, where skin prices come from, and what happens on the curve
        before and after graduation.
      </p>

      <figure className="docs__art">
        <img src="/brand/character.jpg" alt="SKINPAD brand art — engraved ivory and gold AK-47" loading="lazy" />
      </figure>

      <h2>Overview</h2>
      <p>
        A token here is two things at once. It is an ordinary Pons V2 launch: a bonding curve holding
        the entire supply, tradeable from the first block, graduating into a pool with permanently
        locked liquidity. It also carries a reference: the Steam Community Market median of one
        specific CS2 listing.
      </p>
      <p>
        The listing is chosen once, at launch, and written into the launch record as
        {' '}<code>market_hash_name</code>. It cannot be changed afterwards by the creator, by us,
        or by anyone holding the token.
      </p>
      <ol>
        <li><strong>Choose.</strong> Pick a skin from the catalogue and name the token. The pairing and the Steam median at that moment are recorded at creation.</li>
        <li><strong>Trade.</strong> The token trades on its bonding curve immediately. Anyone can buy or sell from the first block.</li>
        <li><strong>Compare.</strong> The skin&apos;s price is refreshed on a schedule, and every page shows the token against it, including how far apart they are.</li>
      </ol>

      <h2>The peg</h2>
      <p>The peg is a price relationship. One token is worth what one skin is worth.</p>
      <pre>target price of 1 token = Steam median of 1 market_hash_name</pre>
      <p>
        There is no ratio and no supply arithmetic in that line. A skin has a price. A token has a
        price. They are the same kind of number, so they are set equal.
      </p>
      <p>
        The peg is not redemption. A token cannot be exchanged for a skin, and there is no inventory
        of skins held behind these tokens. It is a price the market is pushed toward, not a claim on
        an object.
      </p>

      <h2>Where prices come from</h2>
      <p>
        Names, wear, StatTrak / Souvenir, and artwork come from Steam and the public CS2 item schema
        (ByMykel CSGO-API). Prices are Steam Community Market figures. The peg uses Steam&apos;s
        {' '}<code>median_price</code>, not the cheapest listing: on a thin item the lowest ask is
        often a single outlier, and quoting it would misprice the peg on every page at once.
      </p>
      <p>
        When Steam publishes no median, the last known median is held and marked unavailable rather
        than dropped to zero. A zero would show a Dragon Lore pegged at nothing.
      </p>
      <p>
        The peg is always quoted against one exact <code>market_hash_name</code>, because a skin is
        not one asset. Factory New and Field-Tested are different items. StatTrak is different again.
      </p>

      <h2>Drift</h2>
      <pre>drift = (token price ÷ skin price) − 1</pre>
      <p>
        Positive drift means the token trades richer than the skin it tracks. Negative means cheaper.
        Inside a ±{ON_PEG_BAND * 100}% band a token counts as on peg.
      </p>
      <p>
        Be clear-eyed about scale. A launch mints the full supply to the curve, and a curve opens at
        a market cap of a few ETH. A token whose target is a $10,000 skin therefore opens with drift
        near −100% and closes the gap only as its market cap grows. The reference is information
        about how far the market is from the skin, not a promise that it will get there.
      </p>

      <h2>Convergence</h2>
      <p>
        On this site, today, nothing trades against drift automatically. The creator fee goes to the
        creator&apos;s wallet. No contract reads a Steam price. What closes the gap is people.
        Treat the peg as a reference the market may or may not respect.
      </p>

      <h2>The catalogue</h2>
      <p>
        The catalogue is the {CATALOGUE_SIZE} most valuable CS2 weapon listings (knives, gloves,
        rifles, pistols, SMGs, heavy), ranked from Steam Community Market. Stickers, agents, and
        cases are out of V1. The list is rebuilt from time to time. A token already launched is
        unaffected by a reranking. Two tokens may be pegged to the same skin. Nothing is reserved.
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
        collected seeds a Uniswap v4 pool, and the liquidity position is locked permanently. There
        is no unlock and no privileged wallet that can reach it. Graduating is not a quality signal.
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
        tokens launched through it and the skin each one is pegged to. Platform ticker ${SKINPAD_TICKER}.
      </p>

      <h2>Risks</h2>
      <ul>
        <li>Nothing defends the peg. A token can trade at any fraction or multiple of its skin.</li>
        <li>A token is not a skin. It cannot be redeemed for one.</li>
        <li>The price feed can fail. Steam can rate-limit or go stale.</li>
        <li>Skin prices are volatile and thin. High-tier knives trade rarely.</li>
        <li>Valve is not involved. CS2 names and artwork belong to Valve Corporation.</li>
        <li>Names are not unique. Check the contract address.</li>
        <li>Graduating is not a quality signal.</li>
        <li>Transactions are irreversible.</li>
      </ul>
    </main>
  )
}
