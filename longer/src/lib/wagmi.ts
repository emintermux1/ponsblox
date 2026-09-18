import { http, createConfig } from 'wagmi'
import { robinhood } from './chain'
import { injected } from './injected'

export const wagmiConfig = createConfig({
  chains: [robinhood],
  connectors: [injected],
  transports: {
    [robinhood.id]: http(robinhood.rpcUrls.default.http[0]),
  },
  ssr: true,
})
