export type ProviderRpcError = Error & { code?: number }

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: never[]) => void) => void
  removeListener?: (event: string, handler: (...args: never[]) => void) => void
}

export type ProviderInfo = { uuid: string; name: string; icon: string; rdns: string }
export type ProviderDetail = { info: ProviderInfo; provider: Eip1193Provider }

const detected = new Map<string, ProviderDetail>()
const listeners = new Set<(list: ProviderDetail[]) => void>()
let started = false

function emit() {
  const list = [...detected.values()]
  listeners.forEach((fn) => fn(list))
}

export function startDiscovery() {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('eip6963:announceProvider', ((event: CustomEvent<ProviderDetail>) => {
    const detail = event.detail
    if (!detail?.info?.rdns && !detail?.info?.uuid) return
    detected.set(detail.info.rdns || detail.info.uuid, detail)
    emit()
  }) as EventListener)
  window.dispatchEvent(new Event('eip6963:requestProvider'))
  setTimeout(() => window.dispatchEvent(new Event('eip6963:requestProvider')), 300)
  setTimeout(() => window.dispatchEvent(new Event('eip6963:requestProvider')), 1200)
}

export function getProviders(): ProviderDetail[] {
  return [...detected.values()]
}

export function requestProviders() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('eip6963:requestProvider'))
}

export function isMetaMask(d: ProviderDetail): boolean {
  const rdns = d.info.rdns.toLowerCase()
  return rdns === 'io.metamask' || rdns.startsWith('io.metamask.')
}

export function subscribe(fn: (list: ProviderDetail[]) => void): () => void {
  listeners.add(fn)
  fn(getProviders())
  return () => listeners.delete(fn)
}

export function legacyProvider(): ProviderDetail | null {
  const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum
  if (!eth) return null
  return {
    info: { uuid: 'legacy-injected', name: 'Injected wallet', icon: '', rdns: 'legacy.injected' },
    provider: eth,
  }
}

declare global {
  interface WindowEventMap {
    'eip6963:announceProvider': CustomEvent<ProviderDetail>
  }
}
