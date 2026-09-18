/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PONS_FACTORY?: string
  readonly VITE_PONS_LAUNCH_AND_BUY?: string
  readonly VITE_PONS_PAIR?: string
  readonly VITE_PONS_LAUNCH_CONFIG_ID?: string
  readonly VITE_ROBINHOOD_CHAIN_ID?: string
  readonly VITE_ROBINHOOD_RPC?: string
  readonly VITE_ROBINHOOD_EXPLORER?: string
  readonly VITE_EDITOR_FEE_VAULT?: string
  readonly VITE_GITPAD_FEE_ROUTER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
