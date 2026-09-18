import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CaChip } from './CaChip.tsx'
import { Connect } from './Connect.tsx'
import { XLink } from './XLink.tsx'

const TABS = [
  { to: '/', label: 'Chat', icon: 'chat' },
  { to: '/stories', label: 'Stories', icon: 'stories' },
  { to: '/launch', label: 'Camera', icon: 'camera' },
  { to: '/spotlight', label: 'Spotlight', icon: 'spotlight' },
] as const

function TabIcon({ name }: { name: (typeof TABS)[number]['icon'] }) {
  switch (name) {
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H12l-4.2 3.2A.7.7 0 0 1 6.7 18.6V16H7.5A2.5 2.5 0 0 1 5 13.5v-7Z" />
        </svg>
      )
    case 'stories':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="4" width="10" height="16" rx="3" />
          <rect x="9" y="6" width="10" height="16" rx="3" />
        </svg>
      )
    case 'camera':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3.2" />
        </svg>
      )
    case 'spotlight':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5h8l3 14H5L8 5Z" />
        </svg>
      )
    default: {
      const _e: never = name
      return _e
    }
  }
}

export function Chrome({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const camera = pathname === '/launch'

  return (
    <div className={`app ${camera ? 'app--dark' : ''}`}>
      <a className="skip" href="#main">Skip to content</a>
      <header className="top">
        <NavLink to="/" className="brand" aria-label="Snappad home">
          <img src="/brand/ghost.png" alt="" width={40} height={40} fetchPriority="high" />
          <span>Snappad</span>
        </NavLink>
        <form className="search" role="search" action="/stories" method="get">
          <span aria-hidden="true">⌕</span>
          <input name="q" placeholder="Search snaps" aria-label="Search snaps" />
        </form>
        <nav className="top__icons" aria-label="SnapPad">
          {TABS.filter((t) => t.icon !== 'camera').map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => isActive ? 'on' : ''}>
              <TabIcon name={t.icon} />
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="top__end">
          <CaChip compact />
          <XLink compact />
          <Connect compact />
          <NavLink className="btn btn--yellow btn--sm top__cta" to="/launch">Coin it</NavLink>
        </div>
      </header>
      <div id="main">{children}</div>
      <nav className="dock" aria-label="Camera dock">
        <div className="dock__side dock__side--left">
          {TABS.filter((t) => t.icon === 'chat' || t.icon === 'stories').map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => isActive ? 'on' : ''} aria-label={t.label}>
              <TabIcon name={t.icon} />
              <span>{t.label}</span>
            </NavLink>
          ))}
        </div>
        <NavLink to="/launch" className={({ isActive }) => `dock__cam ${isActive ? 'on' : ''}`} aria-label="Snap it. Coin it.">
          <img src="/brand/ghost.png" alt="" className="dock__mascot" />
        </NavLink>
        <div className="dock__side dock__side--right">
          {TABS.filter((t) => t.icon === 'spotlight').map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => isActive ? 'on' : ''} aria-label={t.label}>
              <TabIcon name={t.icon} />
              <span>{t.label}</span>
            </NavLink>
          ))}
          <span className="dock__slot" aria-hidden="true" />
        </div>
      </nav>
      <footer className="foot">
        <CaChip />
        <XLink />
      </footer>
    </div>
  )
}
