import { ROBLOXPAD_OFFICIAL_TOKEN, ROBLOXPAD_TICKER, ROBLOXPAD_X_URL } from '../config/official.ts'
import { short } from '../lib/chain.ts'
import { onNavClick } from '../lib/router.ts'
import { Connect } from './Connect.tsx'
import { CopyButton } from './CopyButton.tsx'

const LINKS = [
  { href: '/games', label: 'Games' },
  { href: '/markets', label: 'Markets' },
  { href: '/launch', label: 'Launch' },
  { href: '/docs', label: 'Docs' },
] as const

function isActive(href: string, path: string): boolean {
  if (path === href) return true
  if (href === '/games') return path.startsWith('/game')
  if (href === '/markets') return path.startsWith('/token') || path.startsWith('/fees')
  return path.startsWith(`${href}/`)
}

export function Nav() {
  const path = window.location.pathname
  return (
    <>
      <header className="nav">
        <div className="nav__inner">
          <a className="brand" href="/" onClick={onNavClick('/')}>
            <img className="brand__mark" src="/brand/cube.jpg" alt="" width={22} height={22} />
            <span className="brand__name">RobloxPad</span>
          </a>
          <nav className="nav__links">
            {LINKS.map((l) => (
              <a
                key={l.href}
                className={isActive(l.href, path) ? 'on' : undefined}
                href={l.href}
                onClick={onNavClick(l.href)}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="nav__end">
            <span className="ticker">
              ${ROBLOXPAD_TICKER}
              {ROBLOXPAD_OFFICIAL_TOKEN && (
                <>
                  {' '}{short(ROBLOXPAD_OFFICIAL_TOKEN)}
                  <CopyButton value={ROBLOXPAD_OFFICIAL_TOKEN} label="Copy" className="btn btn--ghost btn--xs" />
                </>
              )}
            </span>
            {ROBLOXPAD_X_URL && (
              <a className="nav__x" href={ROBLOXPAD_X_URL} target="_blank" rel="noreferrer">X</a>
            )}
            <Connect />
          </div>
        </div>
      </header>
      <nav className="nav__scroll" aria-label="Sections">
        {LINKS.map((l) => (
          <a key={l.href} className={isActive(l.href, path) ? 'on' : undefined} href={l.href} onClick={onNavClick(l.href)}>{l.label}</a>
        ))}
      </nav>
    </>
  )
}
