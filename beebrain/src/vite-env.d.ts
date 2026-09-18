/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BEEBRAIN_CA?: string
  readonly VITE_BEEBRAIN_BUY?: string
  readonly VITE_BEEBRAIN_TX?: string
  readonly VITE_BEEBRAIN_IMAGE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
