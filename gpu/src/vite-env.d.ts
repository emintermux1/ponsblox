/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GPU_CA?: string
  readonly VITE_GPU_BUY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
