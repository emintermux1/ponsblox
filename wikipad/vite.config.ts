import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { handleApi } from './src/server/handleApi.ts'
import { SECURITY_HEADERS } from './src/server/security.ts'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)))

function wikipadApi(): Plugin {
  const run = () => async (req: { method?: string; url?: string }, res: {
    statusCode: number
    setHeader: (k: string, v: string) => void
    end: (s: string) => void
  }, next: () => void) => {
    if (!req.url?.startsWith('/api/')) return next()
    try {
      const url = new URL(req.url, 'http://wikipad.local')
      const result = await handleApi({
        method: req.method || 'GET',
        pathname: url.pathname,
        search: url.searchParams,
        origin: undefined,
        host: 'localhost',
      })
      res.statusCode = result.status
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
      res.setHeader('content-type', result.contentType || 'application/json')
      res.end(result.raw ?? JSON.stringify(result.json ?? {}))
    } catch (e) {
      console.error('[wikipad:api]', (e as Error).message)
      res.statusCode = 500
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'Something failed.' }))
    }
  }

  return {
    name: 'wikipad-api',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
        next()
      })
      server.middlewares.use(run())
    },
    configurePreviewServer(server) {
      server.middlewares.use(run())
    },
  }
}

export default defineConfig({
  plugins: [react(), wikipadApi()],
  root,
  server: {
    port: 5186,
    strictPort: true,
  },
  preview: {
    port: 4186,
  },
})
