/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SQUIDMIND_CA?: string
  readonly VITE_SQUIDMIND_BUY?: string
  readonly VITE_SQUIDMIND_TX?: string
  readonly VITE_SQUIDMIND_IMAGE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
