const AGE_KEY = 'onlyflys.age'
const SUBS_KEY = 'onlyflys.subs'
const LIKES_KEY = 'onlyflys.likes'
const TIPS_KEY = 'onlyflys.tips'
const CHAT_KEY = 'onlyflys.chat'

export type ChatLine = {
  from: 'me' | 'them'
  text: string
  tip?: number
}

type TipMap = Record<string, number>
type ChatMap = Record<string, ChatLine[]>

const listeners = new Set<() => void>()

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
  for (const fn of listeners) fn()
}

export function onStore(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function hasEntered() {
  return localStorage.getItem(AGE_KEY) === '1'
}

export function enterHive() {
  localStorage.setItem(AGE_KEY, '1')
  for (const fn of listeners) fn()
}

export function listSubs(): string[] {
  return readJson<string[]>(SUBS_KEY, [])
}

export function isSubbed(handle: string) {
  return listSubs().includes(handle)
}

export function subscribeTo(handle: string) {
  const next = new Set(listSubs())
  next.add(handle)
  writeJson(SUBS_KEY, [...next])
}

export function listLikes(): string[] {
  return readJson<string[]>(LIKES_KEY, [])
}

export function isLiked(id: string) {
  return listLikes().includes(id)
}

export function toggleLike(id: string) {
  const next = new Set(listLikes())
  if (next.has(id)) next.delete(id)
  else next.add(id)
  writeJson(LIKES_KEY, [...next])
}

export function tipTotal(handle: string) {
  return readJson<TipMap>(TIPS_KEY, {})[handle] ?? 0
}

export function addTip(handle: string, n: number) {
  const map = readJson<TipMap>(TIPS_KEY, {})
  map[handle] = (map[handle] ?? 0) + n
  writeJson(TIPS_KEY, map)
}

export function chatFor(handle: string, seed: ChatLine[]): ChatLine[] {
  const map = readJson<ChatMap>(CHAT_KEY, {})
  return map[handle] ?? seed
}

export function pushChat(handle: string, seed: ChatLine[], line: ChatLine) {
  const map = readJson<ChatMap>(CHAT_KEY, {})
  const prev = map[handle] ?? seed
  map[handle] = [...prev, line]
  writeJson(CHAT_KEY, map)
}
