import type { MouseEvent, ReactNode } from 'react'
import { isExternalHref, useNavigate } from '../nav.ts'

export function AppLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  const navigate = useNavigate()

  if (isExternalHref(href)) {
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer">
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
    <a className={className} href={href} onClick={onClick}>
      {children}
    </a>
  )
}
