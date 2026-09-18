import { Disclosure } from './Disclosure.tsx'
import { ART, PONS_DOCS } from '../lib/chain.ts'
import { X_URL } from '../lib/format.ts'
import { onNavClick } from '../lib/router.ts'

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot__brand">
        <img src={ART.lockup} alt="GitPad" />
        <span>Tokens paired with repositories. Factory: Pons V2. Chain: Robinhood.</span>
        <Disclosure />
      </div>
      <nav className="foot__links">
        <a href="/" onClick={onNavClick('/')}>GitPad</a>
        <a href="/explore" onClick={onNavClick('/explore')}>Explore</a>
        <a href="/board" onClick={onNavClick('/board')}>Board</a>
        <a href="/first" onClick={onNavClick('/first')}>Be First</a>
        <a href="/daily" onClick={onNavClick('/daily')}>Daily</a>
        <a href="/map" onClick={onNavClick('/map')}>Map</a>
        <a href="/dashboard/launches" onClick={onNavClick('/dashboard/launches')}>Launches</a>
        <a href="/claim" onClick={onNavClick('/claim')}>Claim</a>
        <a href="/docs" onClick={onNavClick('/docs')}>Docs</a>
        <a href={PONS_DOCS} target="_blank" rel="noreferrer">Pons</a>
        <a href={X_URL} target="_blank" rel="noreferrer">X</a>
      </nav>
    </footer>
  )
}
