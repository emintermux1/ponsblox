import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  appType: 'mpa',
  server: { port: 5184, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        eagle: 'eagle.html',
      },
    },
  },
})
