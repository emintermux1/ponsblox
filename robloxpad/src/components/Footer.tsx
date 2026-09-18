import { PONS_DOCS_URL, ROBLOXPAD_OFFICIAL_TOKEN, ROBLOXPAD_TG_URL, ROBLOXPAD_TICKER, ROBLOXPAD_X_URL } from '../config/official.ts'
import { EXPLORER } from '../lib/chain.ts'
import { onNavClick } from '../lib/router.ts'
import { CopyButton } from './CopyButton.tsx'

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot__inner">
        {ROBLOXPAD_OFFICIAL_TOKEN && (
          <p className="foot__ca">
            <span>${ROBLOXPAD_TICKER} CA</span>
            <code className="mono">{ROBLOXPAD_OFFICIAL_TOKEN}</code>
            <CopyButton value={ROBLOXPAD_OFFICIAL_TOKEN} label="Copy" className="btn btn--ghost btn--xs" />
            <a href={`${EXPLORER}/token/${ROBLOXPAD_OFFICIAL_TOKEN}`} target="_blank" rel="noreferrer">Explorer ↗</a>
          </p>
        )}
        <div className="foot__grid">
          <div>
            <a className="foot__brand" href="/" onClick={onNavClick('/')}>
              <img src="/brand/cube.jpg" alt="" width={20} height={20} />
              RobloxPad
            </a>
            <p>Play the game. Earn on it.</p>
          </div>
          <div>
            <p className="kicker">Product</p>
            <a href="/games" onClick={onNavClick('/games')}>Games</a>
            <a href="/markets" onClick={onNavClick('/markets')}>Markets</a>
            <a href="/launch" onClick={onNavClick('/launch')}>Launch</a>
            <a href="/docs" onClick={onNavClick('/docs')}>Docs</a>
          </div>
          <div>
            <p className="kicker">Network</p>
            <a href={PONS_DOCS_URL} target="_blank" rel="noreferrer">Pons</a>
            <a href={EXPLORER} target="_blank" rel="noreferrer">Explorer</a>
            <span>Robinhood · 4663</span>
          </div>
          <div>
            <p className="kicker">Social</p>
            <a href={ROBLOXPAD_X_URL} target="_blank" rel="noreferrer">X</a>
            <a href={ROBLOXPAD_TG_URL} target="_blank" rel="noreferrer">Telegram</a>
          </div>
        </div>
        <p className="legal">
          Roblox game names and artwork belong to their creators and Roblox Corporation.
          RobloxPad is not affiliated with Roblox. Platform ticker ${ROBLOXPAD_TICKER}.
        </p>
      </div>
    </footer>
  )
}
