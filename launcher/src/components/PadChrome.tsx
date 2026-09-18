import { useEffect, useState, type ReactNode } from 'react'
import { chainLabel, quoteAsset, type SupportedChain } from '../lib/chain.ts'
import type { CustomSkin } from '../lib/custom.ts'
import { type KitId } from '../lib/kits.ts'
import { kitCssVars, kitVarsStyle } from '../lib/skin.ts'
import { studioUrl } from '../lib/tenant.ts'

type NavLink = { label: string; href: string }

function extra(kit: KitId, chain: SupportedChain): NavLink[] {
  const trade = chain === 'arc' ? '#trade' : '#tokens'
  switch (kit) {
    case 'pons':
      return [
        { label: 'Explore', href: '#tokens' },
        { label: 'Launch', href: '#launch' },
      ]
    case 'pumpfun':
      return [
        { label: 'Home', href: '#launch' },
        { label: 'Tokens', href: '#tokens' },
      ]
    case 'bags':
      return [
        { label: 'Home', href: '#launch' },
        { label: 'Trade', href: trade },
        { label: 'Launch', href: '#launch' },
      ]
    case 'app':
      return [
        { label: 'Playbook', href: '#launch' },
        { label: 'Tokens', href: '#tokens' },
      ]
    case 'flap':
      return [
        { label: 'HOME', href: '#launch' },
        { label: 'TOKENS', href: '#tokens' },
      ]
    case 'four':
      return [
        { label: 'Home', href: '#launch' },
        { label: 'Tokens', href: '#tokens' },
      ]
    case 'long':
      return [
        { label: 'Create', href: '#launch' },
        { label: 'Tokens', href: '#tokens' },
      ]
    case 'custom':
      return [
        { label: 'Create', href: '#launch' },
        { label: 'Tokens', href: '#tokens' },
      ]
    default: {
      const _n: never = kit
      return _n
    }
  }
}

function mark(kit: KitId, title: string): string {
  switch (kit) {
    case 'pons':
      return 'pons'
    case 'pumpfun':
      return 'pump.fun'
    case 'bags':
      return 'bags'
    case 'app':
      return 'b'
    case 'flap':
      return 'FLAP'
    case 'four':
      return 'FOUR'
    case 'long':
      return 'LONG'
    case 'custom':
      return title
    default: {
      const _n: never = kit
      return _n
    }
  }
}

function BagsIcons() {
  return (
    <>
      <a className="bags-ico" href="#launch" title="Home" aria-label="Home">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M4 11.5 12 4l8 7.5V20h-6v-6H10v6H4Z" fill="currentColor" /></svg>
      </a>
      <a className="bags-ico" href="#tokens" title="Trade" aria-label="Trade">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M7 7h13l-3-3M17 17H4l3 3M6 7v10h12V7" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
      </a>
      <a className="bags-ico on" href="#launch" title="Launch" aria-label="Launch">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      </a>
    </>
  )
}

export function PadChrome(props: {
  kit: KitId
  custom?: CustomSkin
  title: string
  slug: string
  account: string | null
  chainHint: SupportedChain
  onConnect: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const vars = kitCssVars(props.kit, props.custom)
    const root = document.documentElement
    root.style.background = vars['--pad-paper']
    return () => {
      root.style.background = ''
    }
  }, [props.kit, props.custom])
  const short = props.account
    ? `${props.account.slice(0, 6)}…${props.account.slice(-4)}`
    : (props.kit === 'bags' ? 'log in' : 'Connect')
  const links = extra(props.kit, props.chainHint)

  if (props.kit === 'bags') {
    return (
      <div className="pad bags-shell" data-kit="bags" data-slug={props.slug} style={kitVarsStyle(props.kit, props.custom)}>
        <div className="bags-lime" aria-hidden />
        <aside className="bags-rail">
          <a className="bags-mark" href="#launch">bags</a>
          <BagsIcons />
          <a className="bags-docs" href={studioUrl()}>Docs</a>
        </aside>
        <div className="bags-main">
          <header className="bags-top">
            <a className="bags-mark-inline" href="#launch">bags</a>
            <span className="pad-chip">{chainLabel(props.chainHint)} · {quoteAsset(props.chainHint)}</span>
            <button type="button" className="pad-btn bags-login" onClick={props.onConnect}>{short}</button>
          </header>
          {props.children}
        </div>
      </div>
    )
  }

  return (
    <div className="pad" data-kit={props.kit} data-slug={props.slug} style={kitVarsStyle(props.kit, props.custom)}>
      <header className="pad-nav">
        <a className="pad-mark" href="#launch">{mark(props.kit, props.title)}</a>
        <button type="button" className="pad-toggle" onClick={() => setOpen((v) => !v)}>
          {open ? 'Close' : 'Menu'}
        </button>
        <nav className={open ? 'open' : ''}>
          {links.map((item) => (
            <a key={`${item.label}:${item.href}`} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
          <a href={studioUrl()} onClick={() => setOpen(false)}>Studio</a>
        </nav>
        <div className="pad-right">
          <span className="pad-chip">{chainLabel(props.chainHint)} · {quoteAsset(props.chainHint)}</span>
          <button type="button" className="pad-btn" onClick={props.onConnect}>{short}</button>
        </div>
      </header>
      {props.children}
    </div>
  )
}
