import { ART } from '../lib/chain.ts'
import { X_URL } from '../lib/format.ts'
import { onNavClick, useRoute } from '../lib/router.ts'
import { Connect } from './Connect.tsx'
import { LiveOnPons } from './LiveOnPons.tsx'

const LINKS: { href: string; label: string; match: string }[] = [
  { href: '/explore', label: 'Explore', match: 'explore' },
  { href: '/first', label: 'First', match: 'first' },
  { href: '/daily', label: 'Daily', match: 'daily' },
  { href: '/launch', label: 'Launch', match: 'launch' },
  { href: '/activity', label: 'Activity', match: 'activity' },
  { href: '/watch', label: 'Watch', match: 'watch' },
  { href: '/connect', label: 'Existing', match: 'existing' },
  { href: '/docs', label: 'Docs', match: 'docs' },
]

export function Nav() {
  const route = useRoute()
  return (
    <header className="nav">
      <a className="nav__brand" href="/" onClick={onNavClick('/')} aria-label="GitPad home">
        <img src={ART.lockup} alt="GitPad" />
      </a>
      <nav className="nav__links" aria-label="Primary">
        {LINKS.map((l) => {
          const on = l.match === 'existing'
            ? route.name === 'launch' && route.mode === 'existing'
            : l.match === 'launch'
              ? route.name === 'launch' && route.mode !== 'existing'
              : route.name === l.match
          return (
            <a
              key={l.href}
              href={l.href}
              className={on ? 'is-on' : ''}
              aria-current={on ? 'page' : undefined}
              onClick={onNavClick(l.href)}
            >
              {l.label}
            </a>
          )
        })}
      </nav>
      <div className="nav__right">
        <a href={X_URL} target="_blank" rel="noreferrer">X</a>
        <LiveOnPons />
        <Connect />
      </div>
    </header>
  )
}
