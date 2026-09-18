import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadDotEnv() {
  const path = resolve(process.cwd(), '..', '.env')
  let text = ''
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    try {
      text = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
    } catch {
      return
    }
  }
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    const k = t.slice(0, i).trim()
    const v = t.slice(i + 1).trim()
    if (process.env[k] === undefined) process.env[k] = v
  }
}

loadDotEnv()

export const ENV = {
  rpc: process.env.RHC_RPC || 'https://rpc.mainnet.chain.robinhood.com',
  port: Number(process.env.PORT || 8787),
  robloxSecret: process.env.ROBLOX_SERVER_SECRET || '',
  gmgnKey: process.env.GMGN_API_KEY || '',
  publicWebUrl: (process.env.PUBLIC_WEB_URL || 'http://localhost:5173').replace(/\/+$/, ''),
}
