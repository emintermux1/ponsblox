import { createConnector } from 'wagmi'
import { getAddress, type Address } from 'viem'

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: never[]) => void) => void
  removeListener?: (event: string, handler: (...args: never[]) => void) => void
}

type Announced = { info: { name: string; rdns: string }; provider: Eip1193 }

const announced = new Map<string, Announced>()

function discover(): Eip1193 | undefined {
  if (typeof window === 'undefined') return undefined
  window.dispatchEvent(new Event('eip6963:requestProvider'))
  const ranked = [...announced.values()].sort((a, b) => {
    const pref = ['io.metamask', 'io.rabby', 'app.phantom', 'com.coinbase.wallet']
    const ai = pref.findIndex((r) => a.info.rdns === r || a.info.rdns.startsWith(`${r}.`))
    const bi = pref.findIndex((r) => b.info.rdns === r || b.info.rdns.startsWith(`${r}.`))
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
  return ranked[0]?.provider ?? (window as unknown as { ethereum?: Eip1193 }).ethereum
}

if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', ((event: CustomEvent<Announced>) => {
    const d = event.detail
    if (!d?.info?.rdns || !d.provider) return
    announced.set(d.info.rdns, d)
  }) as EventListener)
  window.dispatchEvent(new Event('eip6963:requestProvider'))
}

export const injected = createConnector((config) => {
  async function provider(): Promise<Eip1193 | undefined> {
    return discover()
  }

  return {
    id: 'injected',
    name: 'Injected',
    type: 'injected',
    connect: (async () => {
      const p = await provider()
      if (!p) throw new Error('No wallet found')
      const accounts = ((await p.request({ method: 'eth_requestAccounts' })) as string[]).map((a) =>
        getAddress(a),
      ) as Address[]
      const chainId = Number(await p.request({ method: 'eth_chainId' }))
      return { accounts, chainId }
    }) as never,
    async disconnect() {},
    async getAccounts() {
      const p = await provider()
      if (!p) return []
      const accounts = (await p.request({ method: 'eth_accounts' })) as string[]
      return accounts.map((a) => getAddress(a)) as Address[]
    },
    async getChainId() {
      const p = await provider()
      if (!p) return config.chains[0].id
      return Number(await p.request({ method: 'eth_chainId' }))
    },
    async getProvider() {
      return discover()
    },
    async isAuthorized() {
      const accounts = await this.getAccounts()
      return accounts.length > 0
    },
    async switchChain({ chainId }) {
      const p = await provider()
      const chain = config.chains.find((c) => c.id === chainId)
      if (!p || !chain) throw new Error('Cannot switch chain')
      const hex = `0x${chainId.toString(16)}`
      try {
        await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] })
      } catch (e) {
        if ((e as { code?: number }).code === 4902) {
          await p.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: hex,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: [chain.rpcUrls.default.http[0]],
              blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : [],
            }],
          })
        } else {
          throw e
        }
      }
      return chain
    },
    onAccountsChanged(accounts) {
      if (!accounts.length) config.emitter.emit('disconnect')
      else config.emitter.emit('change', { accounts: accounts.map((a) => getAddress(a)) as Address[] })
    },
    onChainChanged(chain) {
      config.emitter.emit('change', { chainId: Number(chain) })
    },
    onDisconnect() {
      config.emitter.emit('disconnect')
    },
  }
})
