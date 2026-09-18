import type { ReactNode } from 'react'
import { COPY } from '../lib/copy.ts'
import { onNav, type Route } from '../lib/router.ts'
import { Connect } from './Connect.tsx'

const NAV: { href: string; label: string; names: Route['name'][] }[] = [
  { href: '/', label: 'Main page', names: ['home'] },
  { href: '/launch', label: 'Launch', names: ['launch'] },
  { href: '/markets', label: 'Markets', names: ['launched', 'markets', 'recent'] },
  { href: '/knowledge', label: 'Knowledge', names: ['knowledge'] },
]

export function Layout({
  children,
  route,
  tools,
}: {
  children: ReactNode
  route: Route
  tools?: ReactNode
}) {
  return (
    <div className="skin">
      <header className="masthead">
        <a className="wordmark" href="/" onClick={(e) => onNav(e, '/')}>
          <img src="/wordmark.png" alt={COPY.wordmark} />
        </a>
        <Connect />
      </header>
      <div className="columns columns--rail">
        <nav className="sidebar" aria-label="WikiPad">
          <h2 className="sidebar__h">WikiPad</h2>
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={item.names.includes(route.name) ? 'is-on' : undefined}
                  onClick={(e) => onNav(e, item.href)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          {tools}
        </nav>
        <div className="stage">
          {children}
          <footer className="colophon">
            <p>{COPY.footer}</p>
          </footer>
        </div>
        <aside className="rightrail" aria-label="WikiPad brand">
          <div className="brandbox">
            <a href="/" onClick={(e) => onNav(e, '/')}>
              <img src="/logo.png" alt={`${COPY.wordmark} — ${COPY.knowledge}`} />
            </a>
          </div>
        </aside>
      </div>
    </div>
  )
}

