/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITPAD_X?: string
  readonly VITE_GITPAD_FACTORY?: string
  readonly VITE_GITPAD_REGISTRY?: string
  readonly VITE_GITPAD_METADATA?: string
  readonly VITE_GITPAD_FEE_ROUTER?: string
  readonly VITE_GITPAD_ADAPTER?: string
  readonly VITE_GITPAD_TREASURY?: string
  readonly VITE_GITPAD_ADMINS?: string
  readonly VITE_PONS_FACTORY?: string
  readonly VITE_PONS_LAUNCH_AND_BUY?: string
  readonly VITE_PONS_PAIR?: string
  readonly VITE_PONS_LAUNCH_CONFIG_ID?: string
  readonly VITE_ROBINHOOD_CHAIN_ID?: string
  readonly VITE_ROBINHOOD_RPC?: string
  readonly VITE_ROBINHOOD_EXPLORER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
