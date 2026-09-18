/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GMEGIRL_CA?: string
  readonly VITE_GMEGIRL_BUY?: string
  readonly VITE_RILIE_ETH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
