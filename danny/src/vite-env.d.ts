/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DANNY_CA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
