import { createWalletClient, custom, type Address, type WalletClient } from 'viem'
import { chainOf, numericChainId, type SupportedChain } from './chain.ts'
import { getProviders, legacyProvider, startDiscovery, subscribe, type Eip1193Provider, type ProviderDetail } from './eip6963.ts'

export type WalletState = {
  providers: ProviderDetail[]
  account: Address | null
  chainId: number | null
  provider: Eip1193Provider | null
}

const listeners = new Set<() => void>()
const state: WalletState = { providers: [], account: null, chainId: null, provider: null }

function emit() {
  listeners.forEach((fn) => fn())
}

export function watchWallet(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getWallet(): WalletState {
  return state
}

export function bootWallet() {
  startDiscovery()
  subscribe((list) => {
    state.providers = list.length ? list : (legacyProvider() ? [legacyProvider()!] : [])
    emit()
  })
}

export async function connectWallet(detail?: ProviderDetail): Promise<void> {
  const d = detail || getProviders()[0] || legacyProvider()
  if (!d) throw new Error('No wallet found.')
  const accounts = (await d.provider.request({ method: 'eth_requestAccounts' })) as string[]
  const chainHex = (await d.provider.request({ method: 'eth_chainId' })) as string
  state.provider = d.provider
  state.account = (accounts[0] || null) as Address | null
  state.chainId = Number.parseInt(chainHex, 16)
  emit()
}

export async function switchChain(id: SupportedChain): Promise<void> {
  if (!state.provider) throw new Error('Connect a wallet first.')
  const chainId = numericChainId(id)
  const hex = `0x${chainId.toString(16)}`
  try {
    await state.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] })
  } catch (e) {
    const err = e as { code?: number }
    if (err.code !== 4902) throw e
    const chain = chainOf(id)
    await state.provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: hex,
        chainName: chain.name,
        nativeCurrency: chain.nativeCurrency,
        rpcUrls: chain.rpcUrls.default.http,
        blockExplorerUrls: chain.blockExplorers?.default ? [chain.blockExplorers.default.url] : [],
      }],
    })
  }
  state.chainId = chainId
  emit()
}

export function walletClient(): WalletClient {
  if (!state.provider || !state.account) throw new Error('Connect a wallet first.')
  return createWalletClient({
    account: state.account,
    transport: custom(state.provider),
  })
}
