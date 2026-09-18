'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ASSETS, pairTicker } from '@/lib/assets'
import { LONGER_BUY_URL, LONGER_TICKER, X_HANDLE, X_URL } from '@/lib/official'
import { AssetMark } from './AssetMark'
import { BrandLockup } from './BrandLockup'
import { ConnectWallet } from './ConnectWallet'
import { OfficialCa } from './OfficialCa'

const NAV = [
  { href: '/', label: 'Explore' },
  { href: '/assets', label: '3X Assets' },
  { href: '/launch', label: 'Launch' },
] as const

export function Header() {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [path])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header className="site-header sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-[2px]">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4">
        <Link href="/" aria-label="LONGER" className="shrink-0">
          <BrandLockup />
        </Link>
        <nav className="hidden items-center gap-4 text-[13px] md:flex">
          {NAV.map((item) => {
            const active = item.href === '/' ? path === '/' : path.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'text-paper' : 'text-muted transition-colors hover:text-paper'}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <div className="hidden min-w-0 lg:block">
            <OfficialCa compact />
          </div>
          <a
            href={LONGER_BUY_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden font-mono text-[11px] text-accent transition-colors hover:text-paper md:inline"
          >
            Buy {LONGER_TICKER}
          </a>
          <a
            href={X_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden font-mono text-[11px] text-muted transition-colors hover:text-paper xl:inline"
          >
            {X_HANDLE}
          </a>
          <div className="hidden items-center gap-1 lg:flex">
            {ASSETS.map((asset) => (
              <Link
                key={asset.id}
                href={`/?pair=${asset.id}`}
                title={pairTicker(asset)}
                className="opacity-90 transition-opacity hover:opacity-100"
              >
                <AssetMark asset={asset} size="xs" />
              </Link>
            ))}
          </div>
          <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted xl:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            Robinhood Chain
          </span>
          <ConnectWallet />
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-ink text-paper md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-bg/70"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute inset-x-0 top-0 border-b border-line bg-panel px-2 py-2">
            {NAV.map((item) => {
              const active = item.href === '/' ? path === '/' : path.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-12 items-center px-3 text-[16px] ${active ? 'text-accent' : 'text-paper'}`}
                >
                  {item.label}
                </Link>
              )
            })}
            <div className="px-3 py-3">
              <OfficialCa compact />
            </div>
            <a
              href={LONGER_BUY_URL}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center px-3 font-mono text-[15px] text-accent"
            >
              Buy {LONGER_TICKER}
            </a>
            <a
              href={X_URL}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center px-3 font-mono text-[15px] text-muted"
            >
              {X_HANDLE}
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {open ? (
        <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.6" />
      ) : (
        <path d="M2 4 H14 M2 8 H14 M2 12 H14" stroke="currentColor" strokeWidth="1.6" />
      )}
    </svg>
  )
}
