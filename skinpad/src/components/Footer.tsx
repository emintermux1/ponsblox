import { PONS_DOCS_URL, SKINPAD_OFFICIAL_TOKEN, SKINPAD_TICKER } from '../config/official.ts'
import { EXPLORER } from '../lib/chain.ts'
import { onNavClick } from '../lib/router.ts'
import { CopyButton } from './CopyButton.tsx'

export function Footer() {
  return (
    <footer className="foot">
      {SKINPAD_OFFICIAL_TOKEN && (
        <p className="foot__ca">
          <span>${SKINPAD_TICKER} CA</span>
          <code className="mono">{SKINPAD_OFFICIAL_TOKEN}</code>
          <CopyButton value={SKINPAD_OFFICIAL_TOKEN} label="Copy" className="btn btn--ghost btn--xs" />
          <a href={`${EXPLORER}/token/${SKINPAD_OFFICIAL_TOKEN}`} target="_blank" rel="noreferrer">Explorer ↗</a>
        </p>
      )}
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
