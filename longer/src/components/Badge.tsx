import type { ReactNode } from 'react'

export function Badge({
  children,
  tone = 'line',
}: {
  children: ReactNode
  tone?: 'line' | 'accent' | 'muted' | 'ok' | 'danger'
}) {
  const cls = (() => {
    switch (tone) {
      case 'line':
        return 'border-line text-paper'
      case 'accent':
        return 'border-accent/40 text-accent'
      case 'muted':
        return 'border-line text-muted'
      case 'ok':
        return 'border-ok/40 text-ok'
      case 'danger':
        return 'border-danger/40 text-danger'
      default: {
        const _e: never = tone
        return _e
      }
    }
  })()
  return (
    <span className={`inline-flex items-center border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${cls}`}>
      {children}
    </span>
  )
}
