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
        Counter-Strike 2 skin names and artwork belong to Valve Corporation. Prices are Steam
        Community Market data. Platform ticker ${SKINPAD_TICKER}.
      </p>
    </footer>
  )
}
