import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import domainHandler from './api/domain.js'
import ipfsHandler from './api/ipfs.js'
import padHandler from './api/pad.js'
import resolveHandler from './api/resolve.js'
import writeHandler from './api/write.js'

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

loadDotEnv(resolve(root, '.env'))
loadDotEnv(resolve(root, '.env.local'))

type VercelRes = {
  status: (code: number) => VercelRes
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

function wrapRes(res: ServerResponse): VercelRes {
  const api: VercelRes = {
    status(code) {
      res.statusCode = code
      return api
    },
    setHeader(name, value) {
      res.setHeader(name, value)
    },
    json(body) {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(body))
    },
  }
  return api
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.from(c)))
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      if (!text) {
        resolveBody({})
        return
      }
      try {
        resolveBody(JSON.parse(text) as unknown)
      } catch {
        reject(new Error('Bad JSON'))
      }
    })
    req.on('error', reject)
  })
}

function launcherApi(): Plugin {
  return {
    name: 'launcher-api',
    configureServer(server) {
      if (!process.env.PINATA_JWT) console.warn('[launcher] PINATA_JWT unset')
      server.middlewares.use((req, res, next) => {
        void (async () => {
          const path = req.url?.split('?')[0] || ''
          const handler = path === '/api/ipfs'
            ? ipfsHandler
            : path === '/api/write'
              ? writeHandler
              : path === '/api/domain'
                ? domainHandler
                : path === '/api/resolve'
                  ? resolveHandler
                  : path === '/api/pad'
                    ? padHandler
                    : null
          if (!handler) {
            next()
            return
          }
          try {
            const body = req.method === 'POST' || req.method === 'PUT' ? await readJson(req) : {}
            const fakeReq = Object.assign(req, { body })
            await handler(fakeReq, wrapRes(res))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'API failed' }))
          }
        })()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), launcherApi()],
  root,
  server: {
    port: 5190,
    strictPort: true,
  },
  preview: {
    port: 4190,
  },
})
