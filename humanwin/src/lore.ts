export const TOKEN_NAME = 'Human Win'
export const TICKER = '$HUMAN'
export const CHAIN = 'Robinhood Chain'
export const PONS_APP = 'https://www.ponsfamily.com'
export const PONS_LAUNCHPAD = `${PONS_APP}/launchpad`
export const EXPLORER = 'https://robinhoodchain.blockscout.com'
export const GMGN = 'https://gmgn.ai/robinhood'
export const X_HANDLE = '@openhumanwin'
export const X_URL = 'https://x.com/openhumanwin'

export const CA = (import.meta.env.VITE_HUMANWIN_CA as string | undefined)?.trim() ?? ''
export const BUY = (import.meta.env.VITE_HUMANWIN_BUY as string | undefined)?.trim() || ponsTokenHref()

export function ponsTokenHref() {
  return CA ? `${PONS_LAUNCHPAD}/token/${CA}` : PONS_LAUNCHPAD
}

export function shortCa(addr: string) {
  if (addr.length < 14) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}
