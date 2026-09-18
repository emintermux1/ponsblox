import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { Address } from 'viem'

function filePath(name: string) {
  return resolve(process.cwd(), '..', 'data', name)
}

function readJson<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(filePath(name), 'utf8')) as T
  } catch {
    return fallback
  }
}

function writeJson(name: string, value: unknown) {
  const p = filePath(name)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(value, null, 2))
}

export type KnownToken = { token: Address; seenAt: number }
export type Link = { robloxUserId: string; address: Address; linkedAt: number }

let tokens = readJson<KnownToken[]>('tokens.json', [])
let links = readJson<Link[]>('links.json', [])

export function listKnownTokens(): KnownToken[] {
  return tokens
}

export function rememberToken(token: Address) {
  const k = token.toLowerCase()
  if (tokens.some((t) => t.token.toLowerCase() === k)) return
  tokens = [{ token, seenAt: Date.now() }, ...tokens]
  writeJson('tokens.json', tokens)
}

export function getLink(robloxUserId: string): Link | undefined {
  return links.find((l) => l.robloxUserId === robloxUserId)
}

export function getLinkByAddress(address: string): Link | undefined {
  return links.find((l) => l.address.toLowerCase() === address.toLowerCase())
}

export function setLink(robloxUserId: string, address: Address) {
  links = [
    { robloxUserId, address, linkedAt: Date.now() },
    ...links.filter((l) => l.robloxUserId !== robloxUserId && l.address.toLowerCase() !== address.toLowerCase()),
  ]
  writeJson('links.json', links)
}
