export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: never[]) => void) => void
  removeListener?: (event: string, handler: (...args: never[]) => void) => void
}

export type ProviderDetail = {
  info: { uuid: string; name: string; icon: string; rdns: string }
  provider: Eip1193Provider
}

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
}

export function getProviders(): ProviderDetail[] {
  return [...detected.values()]
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
    info: { uuid: 'legacy-injected', name: 'Injected', icon: '', rdns: 'legacy.injected' },
    provider: eth,
  }
}
