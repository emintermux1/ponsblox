import { chainLabel, type SupportedChain } from './chain.ts'
import type { CurveId } from './copy.ts'
import { kitById, kitIdOrDefault, type KitId } from './kits.ts'
import { slugError } from './slug.ts'

const MAX_ENHANCE = 600
const MAX_FEE_BPS = 1000
const DEFAULT_OWNER_BPS = 100
const DEFAULT_CREATOR_BPS = 50

export type Draft = {
  name: string
  ticker: string
  description: string
}

export type PadBuild = {
  name: string
  ticker: string
  description: string
  slug: string
  chain: SupportedChain
  kit: KitId
  ownerFeeBps: number
  creatorFeeBps: number
  curveId: CurveId
}

export type WriteAction = 'enhance' | 'build'

export type WriteSource = 'ai' | 'local'

export type Enhanced = { prompt: string; source: WriteSource }

export function parseWriteSource(raw: unknown): WriteSource {
  return raw === 'ai' ? 'ai' : 'local'
}

const STOP = new Set([
  'a',
  'an',
  'and',
  'any',
  'anybody',
  'anyone',
  'build',
  'clone',
  'copies',
  'copy',
  'create',
  'everyone',
  'for',
  'i',
  'im',
  'just',
  'launch',
  'launchpad',
  'launchpads',
  'let',
  'lets',
  "let's",
  'like',
  'make',
  'my',
  'need',
  'of',
  'on',
  'or',
  'our',
  'pad',
  'pads',
  'please',
  'redirect',
  'redirects',
  'that',
  'the',
  'this',
  'to',
  'us',
  'want',
  'we',
  'where',
  'which',
  'with',
  'your',
])

const KIT_WORDS = new Set([
  'bags',
  'fm',
  'pump',
  'fun',
  'pumpfun',
  'believe',
  'flap',
  'four',
  'meme',
  'long',
  'xyz',
  'pons',
])

const CHAIN_WORDS = new Set(['arc', 'robinhood', 'testnet', 'chain'])

export function parseWriteAction(raw: string): WriteAction {
  if (raw === 'enhance') return 'enhance'
  return 'build'
}

function percentText(bps: number): string {
  return `${(bps / 100).toString()}%`
}

function feeFromText(text: string, re: RegExp, fallback: number): number {
  const m = text.match(re)
  if (!m?.[1]) return fallback
  return clampBps(Math.round(Number(m[1]) * 100))
}

function feesFromText(text: string): { ownerFeeBps: number; creatorFeeBps: number } {
  return {
    ownerFeeBps: feeFromText(text, /\bowner\s+fee\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*%/i, DEFAULT_OWNER_BPS),
    creatorFeeBps: feeFromText(text, /\bcreator\s+(?:tax|fee)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*%/i, DEFAULT_CREATOR_BPS),
  }
}

/** Builds a fuller spec from the text alone; mirrors localEnhance in api/write.js. */
export function localEnhance(prompt: string): string {
  const text = prompt.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const lower = text.toLowerCase()
  const name = nameFrom(text)
  const ticker = tickerFrom(name)
  const chain = /\b(arc|robinhood)\b/i.test(text) ? chainFromPrompt(text, 'robinhood') : null
  const kit = kitInText(text)
  const kitLine = kit && kit !== 'custom' ? kitById(kit).line : ''
  const fees = feesFromText(text)
  const sentences: string[] = []
  let first = `Build ${name}${ticker ? ` ($${ticker})` : ''}, a launchpad`
  if (chain) first += ` on ${chainLabel(chain)}`
  if (kitLine) first += ` that copies the ${kitLine} create flow`
  sentences.push(`${first}.`)
  sentences.push('Anyone can launch a coin.')
  if (/\bfees?\b/.test(lower) && /\b(x|twitter)\b/.test(lower)) {
    sentences.push(
      /\b(usernames?|handles?)\b/.test(lower)
        ? 'Fees route to X usernames the creator sets.'
        : 'Fees route to any X user the creator picks.',
    )
  }
  sentences.push(`Owner fee ${percentText(fees.ownerFeeBps)}, creator tax ${percentText(fees.creatorFeeBps)}.`)
  return sentences.join(' ').slice(0, MAX_ENHANCE)
}

export function tickerFrom(name: string): string {
  const first = name.split(' ')[0]?.replace(/[^a-zA-Z0-9]/g, '') || ''
  if (first.length >= 2 && first.length <= 10) return first.toUpperCase()
  const letters = name.replace(/[^a-zA-Z0-9]/g, '')
  if (!letters) return ''
  return letters.slice(0, 6).toUpperCase()
}

export function slugFrom(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)
  if (base && !slugError(base)) return base
  const padded = `${base || 'pad'}-pad`.replace(/--+/g, '-').replace(/^-|-$/g, '').slice(0, 32)
  if (!slugError(padded)) return padded
  return 'new-pad'
}

function isFiller(word: string): boolean {
  const key = word.toLowerCase()
  return STOP.has(key) || KIT_WORDS.has(key) || CHAIN_WORDS.has(key)
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .slice(0, 32)
}

export function nameFrom(prompt: string): string {
  const text = prompt.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const lower = text.toLowerCase()
  const called = text.match(/\b(?:called|named)\s+([a-zA-Z0-9]+(?:\s+[a-zA-Z0-9]+){0,2})/i)
  if (called?.[1]) {
    const own = called[1].split(/\s+/)
    while (own.length > 1 && isFiller(own[own.length - 1])) own.pop()
    return titleCase(own.join(' '))
  }
  const spec = text.match(/^build\s+([a-zA-Z0-9][a-zA-Z0-9 ]{0,31}?)\s*\(\$[A-Za-z0-9]+\)/i)
  if (spec?.[1]) return titleCase(spec[1])
  if (/\bx\b/.test(lower) && /\bfees?\b/.test(lower)) return 'X Fees'
  const words = text.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  const kept = words.filter((w) => !isFiller(w))
  if (!kept.length) return 'Pad'
  return titleCase(kept.slice(0, 3).join(' '))
}

export function chainFromPrompt(prompt: string, fallback: SupportedChain): SupportedChain {
  if (/\barc\b/i.test(prompt)) return 'arc'
  if (/\brobinhood\b/i.test(prompt)) return 'robinhood'
  return fallback
}

export function kitInText(prompt: string): KitId | null {
  const t = prompt.toLowerCase()
  if (/\bpump/.test(t)) return 'pumpfun'
  if (/\bbags/.test(t)) return 'bags'
  if (/\bflap/.test(t)) return 'flap'
  if (/\bfour/.test(t)) return 'four'
  if (/\blong/.test(t)) return 'long'
  if (/\bbelieve/.test(t)) return 'app'
  if (/\bcustom/.test(t)) return 'custom'
  if (/\bpons/.test(t)) return 'pons'
  return null
}

export function kitFromPrompt(prompt: string, fallback: KitId): KitId {
  return kitInText(prompt) ?? fallback
}

function clampBps(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_OWNER_BPS
  return Math.max(0, Math.min(MAX_FEE_BPS, Math.round(n)))
}

/** Accepts bps (integer), a percent string like "1%", or a fractional percent (0.5 → 50 bps). */
export function feeBps(raw: unknown, fallback: number): number {
  if (raw == null || raw === '') return fallback
  if (typeof raw === 'string') {
    const n = Number(raw.replace('%', '').trim())
    if (!Number.isFinite(n)) return fallback
    return clampBps(raw.includes('%') ? n * 100 : n)
  }
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  return clampBps(Number.isInteger(n) ? n : n * 100)
}

function curveFrom(n: number): CurveId {
  switch (n) {
    case 0:
    case 1:
    case 2:
      return n
    default:
      return 1
  }
}

export function localBuild(prompt: string, kit: KitId, chain: SupportedChain): PadBuild {
  const text = prompt.replace(/\s+/g, ' ').trim()
  const name = nameFrom(text)
  const fees = feesFromText(text)
  return {
    name,
    ticker: tickerFrom(name),
    description: text.slice(0, 160),
    slug: slugFrom(name),
    chain: chainFromPrompt(text, chain),
    kit: kitFromPrompt(text, kit),
    ownerFeeBps: fees.ownerFeeBps,
    creatorFeeBps: fees.creatorFeeBps,
    curveId: 1,
  }
}

export function localDraft(prompt: string): Draft {
  const built = localBuild(prompt, 'pons', 'robinhood')
  return { name: built.name, ticker: built.ticker, description: built.description }
}

function cleanName(raw: unknown): string {
  return String(raw || '').trim().replace(/^(?:build|create|launch|make)\s+/i, '').slice(0, 32).trim()
}

function asDraft(json: Partial<Draft>, fallback: Draft): Draft {
  const name = cleanName(json.name)
  const ticker = String(json.ticker || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase()
  const description = String(json.description || '').trim().slice(0, 160)
  if (!name && !ticker) return fallback
  return {
    name: name || fallback.name,
    ticker: ticker || fallback.ticker,
    description: description || fallback.description,
  }
}

function asBuild(json: Partial<PadBuild>, fallback: PadBuild): PadBuild {
  const draft = asDraft(json, fallback)
  const slugRaw = String(json.slug || '').trim().toLowerCase()
  const chainRaw = String(json.chain || fallback.chain)
  const chain: SupportedChain = chainRaw === 'arc' ? 'arc' : chainRaw === 'robinhood' ? 'robinhood' : fallback.chain
  return {
    name: draft.name,
    ticker: draft.ticker,
    description: draft.description,
    slug: slugRaw && !slugError(slugRaw) ? slugRaw : fallback.slug,
    chain,
    kit: kitIdOrDefault(String(json.kit || fallback.kit)),
    ownerFeeBps: feeBps(json.ownerFeeBps, fallback.ownerFeeBps),
    creatorFeeBps: feeBps(json.creatorFeeBps, fallback.creatorFeeBps),
    curveId: json.curveId == null ? fallback.curveId : curveFrom(Number(json.curveId)),
  }
}

export async function enhancePrompt(prompt: string): Promise<Enhanced> {
  const fallback: Enhanced = { prompt: localEnhance(prompt), source: 'local' }
  try {
    const res = await fetch('/api/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'enhance', prompt }),
    })
    if (!res.ok) return fallback
    const json = await res.json() as { prompt?: string; source?: unknown }
    const next = String(json.prompt || '').replace(/\s+/g, ' ').trim().slice(0, MAX_ENHANCE)
    if (!next) return fallback
    return { prompt: next, source: parseWriteSource(json.source) }
  } catch {
    return fallback
  }
}

export async function buildPad(prompt: string, kit: KitId, chain: SupportedChain): Promise<PadBuild> {
  const fallback = localBuild(prompt, kit, chain)
  try {
    const res = await fetch('/api/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'build', prompt, kit, chain }),
    })
    if (!res.ok) return fallback
    const json = await res.json() as Partial<PadBuild>
    return asBuild(json, fallback)
  } catch {
    return fallback
  }
}

export async function draftWrite(prompt: string, kit: string): Promise<Draft> {
  const built = await buildPad(prompt, kitIdOrDefault(kit), 'robinhood')
  return { name: built.name, ticker: built.ticker, description: built.description }
}
