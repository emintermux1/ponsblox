import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  envDir: '..',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/v1': { target: 'http://localhost:8787', changeOrigin: true },
      '/health': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
})
