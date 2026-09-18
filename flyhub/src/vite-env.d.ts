/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLYHUB_CA?: string
  readonly VITE_FLYHUB_BUY?: string
  readonly VITE_FLYHUB_TX?: string
  readonly VITE_FLYHUB_IMAGE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
