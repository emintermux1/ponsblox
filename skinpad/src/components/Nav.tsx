import { SKINPAD_OFFICIAL_TOKEN, SKINPAD_TICKER, SKINPAD_X_URL } from '../config/official.ts'
import { short } from '../lib/chain.ts'
import { onNavClick } from '../lib/router.ts'
import { Connect } from './Connect.tsx'
import { CopyButton } from './CopyButton.tsx'

const LINKS = [
  { href: '/catalogue', label: 'Catalogue' },
  { href: '/markets', label: 'Markets' },
  { href: '/launch', label: 'Launch' },
  { href: '/docs', label: 'Docs' },
] as const

function isActive(href: string, path: string): boolean {
  if (path === href) return true
  if (href === '/catalogue') return path.startsWith('/skin')
  if (href === '/markets') return path.startsWith('/token') || path.startsWith('/fees')
  return path.startsWith(`${href}/`)
}

export function Nav() {
  const path = window.location.pathname
  return (
    <>
    <header className="nav">
      <a className="brand" href="/" onClick={onNavClick('/')}>
        <img className="brand__mark" src="/brand/coin-64.png" alt="" width={24} height={24} />
        <span className="brand__name">CS2 <em>SKINPAD</em></span>
      </a>
      <nav className="nav__links">
        {LINKS.map((l) => (
          <a key={l.href} className={isActive(l.href, path) ? 'on' : undefined} href={l.href} onClick={onNavClick(l.href)}>{l.label}</a>
        ))}
      </nav>
      <div className="nav__end">
        <span className="pill pill--live">
          <i className="pulse-dot" aria-hidden />
          ${SKINPAD_TICKER}
          {SKINPAD_OFFICIAL_TOKEN && (
            <>
              {' '}{short(SKINPAD_OFFICIAL_TOKEN)}
              <CopyButton value={SKINPAD_OFFICIAL_TOKEN} label="Copy" className="btn btn--ghost btn--xs" />
            </>
          )}
        </span>
        {SKINPAD_X_URL && (
          <a className="btn btn--ghost btn--sm" href={SKINPAD_X_URL} target="_blank" rel="noreferrer">X</a>
        )}
        <Connect />
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
