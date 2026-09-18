import type { MouseEvent, ReactNode } from 'react'
import { isExternalHref, useNavigate } from '../nav.ts'

export function AppLink({
  href,
  children,
  className,
  ariaLabel,
}: {
  href: string
  children: ReactNode
  className?: string
  ariaLabel?: string
}) {
  const navigate = useNavigate()

  if (isExternalHref(href)) {
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel}>
        {children}
      </a>
    )
  }

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return
    }
    event.preventDefault()
    navigate(href)
  }

  return (
    <a className={className} href={href} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </a>
  )
}
