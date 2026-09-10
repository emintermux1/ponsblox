import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createWalletClient, custom, type Address, type WalletClient } from 'viem'
import { rhc } from './chain.ts'
import {
  startDiscovery, getProviders, subscribe, legacyProvider, requestProviders, isMetaMask,
  type Eip1193Provider, type ProviderDetail, type ProviderRpcError,
} from './eip6963.ts'

const CHAIN_HEX = `0x${rhc.id.toString(16)}` as const
const STORAGE_KEY = 'skinpad.wallet.rdns'

type Ctx = {
  address: Address | null
  chainId: number | null
  onRightChain: boolean
  providers: ProviderDetail[]
  connecting: boolean
  error: string | null
  connect: (d: ProviderDetail) => Promise<void>
  connectMetaMask: () => Promise<void>
  disconnect: () => void
  switchAccount: () => Promise<void>
  switchChain: () => Promise<void>
  walletClient: WalletClient | null
}

const WalletCtx = createContext<Ctx | null>(null)

const PREFERRED = [
  'io.metamask',
  'io.metamask.flask',
  'app.phantom',
  'io.rabby',
  'com.coinbase.wallet',
]

function rankProviders(list: ProviderDetail[]): ProviderDetail[] {
  return [...list].sort((a, b) => {
    const ai = PREFERRED.findIndex((r) => a.info.rdns === r || a.info.rdns.startsWith(`${r}.`))
    const bi = PREFERRED.findIndex((r) => b.info.rdns === r || b.info.rdns.startsWith(`${r}.`))
    const av = ai === -1 ? PREFERRED.length : ai
    const bv = bi === -1 ? PREFERRED.length : bi
    if (av !== bv) return av - bv
    return a.info.name.localeCompare(b.info.name)
  })
}

async function pickAccounts(p: Eip1193Provider): Promise<string[]> {
  try {
    const granted = (await p.request({
      method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }],
    })) as { parentCapability?: string; caveats?: { type?: string; value?: unknown }[] }[]
    const accounts = granted
      ?.find((g) => g.parentCapability === 'eth_accounts')
      ?.caveats?.map((c) => c.value)
      .flat()
      .filter((v): v is string => typeof v === 'string' && v.startsWith('0x'))
    if (accounts?.length) return accounts
  } catch (e) {
    if ((e as ProviderRpcError)?.code === 4001) throw e
  }
  return (await p.request({ method: 'eth_requestAccounts' })) as string[]
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useState<ProviderDetail[]>([])
  const [active, setActive] = useState<ProviderDetail | null>(null)
  const [address, setAddress] = useState<Address | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const detach = useRef<(() => void) | null>(null)

  useEffect(() => {
    startDiscovery()
    setProviders(getProviders())
    return subscribe(setProviders)
  }, [])

  const attach = useCallback((p: Eip1193Provider) => {
    detach.current?.()
    const onAccounts = (accs: unknown) => {
      const list = accs as string[]
      if (!list?.length) { setAddress(null); setActive(null); localStorage.removeItem(STORAGE_KEY) }
      else setAddress(list[0] as Address)
    }
    const onChain = (id: unknown) => setChainId(Number(id))
    p.on?.('accountsChanged', onAccounts)
    p.on?.('chainChanged', onChain)
    detach.current = () => {
      p.removeListener?.('accountsChanged', onAccounts)
      p.removeListener?.('chainChanged', onChain)
      detach.current = null
    }
  }, [])

  const connect = useCallback(async (d: ProviderDetail) => {
    setConnecting(true)
    setError(null)
    try {
      const accs = await pickAccounts(d.provider)
      const id = (await d.provider.request({ method: 'eth_chainId' })) as string
      setActive(d)
      setAddress((accs[0] ?? null) as Address | null)
      setChainId(Number(id))
      attach(d.provider)
      localStorage.setItem(STORAGE_KEY, d.info.rdns)
    } catch (e) {
      const err = e as ProviderRpcError
      setError(err?.code === 4001 ? null : err?.message ?? 'Could not connect')
    } finally {
      setConnecting(false)
    }
  }, [attach])

  const connectMetaMask = useCallback(async () => {
    setConnecting(true)
    setError(null)
    startDiscovery()
    requestProviders()
    let mm = getProviders().find(isMetaMask) ?? null
    for (let i = 0; !mm && i < 6; i++) {
      await new Promise<void>((resolve) => { window.setTimeout(resolve, 200) })
      requestProviders()
      mm = getProviders().find(isMetaMask) ?? null
    }
    if (!mm) {
      setError('Install MetaMask, then refresh.')
      setConnecting(false)
      return
    }
    await connect(mm)
  }, [connect])

  useEffect(() => {
    const rdns = localStorage.getItem(STORAGE_KEY)
    if (!rdns || address) return
    if (!rdns.startsWith('io.metamask')) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    const d = providers.find((p) => p.info.rdns === rdns)
    if (!d) return
    void (async () => {
      try {
        const accs = (await d.provider.request({ method: 'eth_accounts' })) as string[]
        if (!accs?.length) return
        const id = (await d.provider.request({ method: 'eth_chainId' })) as string
        setActive(d); setAddress(accs[0] as Address); setChainId(Number(id)); attach(d.provider)
      } catch { /* not authorised yet */ }
    })()
  }, [providers, address, attach])

  const switchAccount = useCallback(async () => {
    const d = active ?? providers[0]
    if (!d) return
    setConnecting(true); setError(null)
    try {
      const accs = await pickAccounts(d.provider)
      const id = (await d.provider.request({ method: 'eth_chainId' })) as string
      setActive(d)
      setAddress((accs[0] ?? null) as Address | null)
      setChainId(Number(id))
      attach(d.provider)
      localStorage.setItem(STORAGE_KEY, d.info.rdns)
    } catch (e) {
      const err = e as ProviderRpcError
      setError(err?.code === 4001 ? null : err?.message ?? 'Could not switch account')
    } finally { setConnecting(false) }
  }, [active, providers, attach])

  const disconnect = useCallback(() => {
    const p = active?.provider
    detach.current?.()
    setActive(null); setAddress(null); setChainId(null)
    localStorage.removeItem(STORAGE_KEY)
    void p?.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] }).catch(() => {})
  }, [active])

  const switchChain = useCallback(async () => {
    if (!active) return
    try {
      await active.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_HEX }] })
    } catch (e) {
      if ((e as ProviderRpcError)?.code === 4902) {
        await active.provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: CHAIN_HEX,
            chainName: rhc.name,
            nativeCurrency: rhc.nativeCurrency,
            rpcUrls: [rhc.rpcUrls.default.http[0]],
            blockExplorerUrls: [rhc.blockExplorers!.default.url],
          }],
        })
      } else throw e
    }
  }, [active])

  const walletClient = useMemo(
    () => (active && address ? createWalletClient({ account: address, chain: rhc, transport: custom(active.provider) }) : null),
    [active, address],
  )

  const all = useMemo(() => {
    const ranked = rankProviders(providers)
    const legacy = legacyProvider()
    if (!legacy) return ranked
    if (ranked.some((p) => p.info.rdns === legacy.info.rdns)) return ranked
    if (ranked.length) return ranked
    return [legacy]
  }, [providers])

  const value: Ctx = {
    address, chainId, onRightChain: chainId === rhc.id, providers: all,
    connecting, error, connect, connectMetaMask, disconnect, switchAccount, switchChain, walletClient,
  }
  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>
}

export function useWallet(): Ctx {
  const c = useContext(WalletCtx)
  if (!c) throw new Error('useWallet outside WalletProvider')
  return c
}
