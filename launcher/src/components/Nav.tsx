import { useState } from 'react'
import { COPY } from '../lib/copy.ts'
import { BrandMark } from './BrandMark.tsx'
import { OfficialCa } from './OfficialCa.tsx'
import { XLink } from './XLink.tsx'

export function Nav(props: {
  account: string | null
  onConnect: () => void
  tenant?: string | null
}) {
  const [open, setOpen] = useState(false)
  const short = props.account
    ? `${props.account.slice(0, 6)}…${props.account.slice(-4)}`
    : COPY.connect
  return (
    <header className="nav">
      <a className="wordmark" href={props.tenant ? `/p/${props.tenant}` : '/'}>
        <BrandMark />
      </a>
      <button type="button" className="nav-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'Close' : 'Menu'}
      </button>
      <nav className={open ? 'open' : ''}>
        {props.tenant ? (
          <a href="/" onClick={() => setOpen(false)}>{COPY.studio}</a>
        ) : (
          <>
            <a href="/" onClick={() => setOpen(false)}>{COPY.studio}</a>
            <a href="/pads" onClick={() => setOpen(false)}>{COPY.directory}</a>
            <a href="/docs" onClick={() => setOpen(false)}>{COPY.docs}</a>
          </>
        )}
        <XLink />
      </nav>
      <div className="nav-right">
        <OfficialCa kind="chip" />
        <span className="nav-x">
          <XLink kind="mark" />
        </span>
        <button type="button" className="btn" onClick={props.onConnect}>{short}</button>
      </div>
    </header>
  )
}
