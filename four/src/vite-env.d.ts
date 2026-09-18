/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FOUR_CA?: string
  readonly VITE_FOUR_BUY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
