import { LONGER_BUY_URL, LONGER_TICKER, X_HANDLE, X_URL } from '@/lib/official'
import { BrandLockup } from './BrandLockup'
import { OfficialCa } from './OfficialCa'

export function Footer() {
  return (
    <footer className="site-footer mt-auto border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-4 text-[11px] text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <BrandLockup compact />
        <OfficialCa compact />
        <a
          href={LONGER_BUY_URL}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[12px] text-accent hover:text-paper"
        >
          Buy {LONGER_TICKER}
        </a>
        <a
          href={X_URL}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[13px] transition-colors hover:text-paper"
        >
          {X_HANDLE}
        </a>
        <span className="font-mono">Robinhood Chain · 4663</span>
      </div>
    </footer>
  )
}
