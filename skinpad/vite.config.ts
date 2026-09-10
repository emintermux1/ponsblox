import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { handleApi } from './src/server/handleApi.ts'
import { SECURITY_HEADERS } from './src/server/security.ts'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)))

function loadDotEnv(file: string) {
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 1) continue
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (process.env[k] === undefined) process.env[k] = v
    }
  } catch {
    /* missing env file is fine */
  }
}

loadDotEnv(resolve(root, '..', '.env'))
loadDotEnv(resolve(root, '.env'))

function skinpadApi(): Plugin {
  const run = () => async (req: { method?: string; url?: string }, res: {
    statusCode: number
    setHeader: (k: string, v: string) => void
    end: (s: string) => void
  }, next: () => void) => {
    if (!req.url?.startsWith('/api/')) return next()
    try {
      const url = new URL(req.url, 'http://skinpad.local')
      const chunks: Uint8Array[] = []
      const incoming = req as typeof req & {
        on: (ev: string, fn: (c?: Uint8Array) => void) => void
      }
      if (req.method === 'POST' || req.method === 'PUT') {
        await new Promise<void>((resolvePromise, reject) => {
          incoming.on('data', (c) => { if (c) chunks.push(c) })
          incoming.on('end', () => resolvePromise())
          incoming.on('error', () => reject(new Error('bad body')))
        })
      }
      let body: unknown
      if (chunks.length) {
        const text = Buffer.concat(chunks).toString('utf8')
        body = text ? JSON.parse(text) as unknown : undefined
      }
      const incomingHeaders = req as typeof req & { headers?: Record<string, string | undefined> }
      const result = await handleApi({
        method: req.method || 'GET',
        pathname: url.pathname,
        search: url.searchParams,
        body,
        origin: incomingHeaders.headers?.origin,
        host: incomingHeaders.headers?.host,
      })
      res.statusCode = result.status
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
      if (result.headers) {
        for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v)
      }
      res.setHeader('content-type', result.contentType || 'application/json')
      res.end(result.raw ?? JSON.stringify(result.json ?? {}))
    } catch (e) {
      console.error('[skinpad:api]', (e as Error).message)
      res.statusCode = 500
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'Something failed. Retry, then check Docs.' }))
    }
  }

  return {
    name: 'skinpad-api',
    configureServer(server) {
      if (!process.env.PINATA_JWT) console.warn('[skinpad:boot] PINATA_JWT unset — no IPFS CIDs will be invented.')
      const chain = process.env.VITE_ROBINHOOD_CHAIN_ID
      if (chain && chain !== '4663') console.warn(`[skinpad:boot] VITE_ROBINHOOD_CHAIN_ID=${chain} is not Robinhood 4663.`)
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
  plugins: [react(), skinpadApi()],
  server: {
    port: 5178,
    strictPort: true,
  },
  preview: {
    port: 4178,
  },
})
