import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolveSnapchatPage } from './src/server/snapchat.ts'

function snapApi(): Plugin {
  return {
    name: 'snappad-api',
    configureServer(server) {
      server.middlewares.use('/api/resolve', (req, res) => {
        const q = new URL(req.url || '', 'http://localhost').searchParams.get('q') || ''
        void resolveSnapchatPage(q).then((data) => {
          res.statusCode = data ? 200 : 404
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(data || { error: 'not found' }))
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), snapApi()],
  server: {
    port: 5191,
    strictPort: true,
  },
  preview: {
    port: 4191,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/viem') || id.includes('node_modules/abitype') || id.includes('node_modules/ox')) {
            return 'viem'
          }
          if (id.includes('/src/lib/pons/')) return 'pons'
          return undefined
        },
      },
    },
  },
})
