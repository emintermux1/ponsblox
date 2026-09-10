import { PONS_DOCS_URL, SKINPAD_TICKER } from '../config/official.ts'
import { EXPLORER } from '../lib/chain.ts'
import { onNavClick } from '../lib/router.ts'

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot__row">
        <a className="foot__brand" href="/" onClick={onNavClick('/')}>
          <img src="/brand/coin-64.png" alt="" width={18} height={18} />
          CS2 SKINPAD
        </a>
        <a href="/docs" onClick={onNavClick('/docs')}>Docs</a>
        <a href={PONS_DOCS_URL} target="_blank" rel="noreferrer">Pons</a>
        <a href={EXPLORER} target="_blank" rel="noreferrer">Explorer</a>
      </div>
      <p className="legal">
        A token is not a skin: it cannot be redeemed for one and there is no inventory behind it.
        Skin prices are Steam Community Market data. Counter-Strike 2, CS2, and the skin names and
        artwork belong to Valve Corporation; there is no relationship, endorsement, or obligation
        of any kind. Tokens can go to zero. Your wallet signs every transaction. This site holds nothing.
        Platform ticker ${SKINPAD_TICKER}.
      </p>
    </footer>
  )
}
