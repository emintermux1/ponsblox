import { createContext, useContext } from 'react'

export const NavigateContext = createContext<(href: string) => void>(() => {})

export function useNavigate() {
  return useContext(NavigateContext)
}

export function isExternalHref(href: string) {
  return href.startsWith('http://') || href.startsWith('https://')
}
