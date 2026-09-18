/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ROBLOXPAD_TOKEN?: string
  readonly VITE_ROBLOXPAD_X?: string
  readonly VITE_ROBLOXPAD_TG?: string
  readonly VITE_ROBLOXPAD_LAUNCH_AT?: string
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
