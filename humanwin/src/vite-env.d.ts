/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HUMANWIN_CA?: string
  readonly VITE_HUMANWIN_BUY?: string
  readonly VITE_HUMANWIN_TX?: string
  readonly VITE_HUMANWIN_IMAGE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
