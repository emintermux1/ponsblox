/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAGER_CA?: string
  readonly VITE_PAGER_BUY?: string
  readonly VITE_PAGER_TX?: string
  readonly VITE_PAGER_IMAGE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
