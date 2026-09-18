import { getVercelOidcToken } from '@vercel/oidc'

const MAX_ENHANCE = 600
const MAX_FEE_BPS = 1000
const DEFAULT_OWNER_BPS = 100
const DEFAULT_CREATOR_BPS = 50

const STOP = new Set([
  'a', 'an', 'and', 'any', 'anybody', 'anyone', 'build', 'clone', 'copies', 'copy', 'create',
  'everyone', 'for', 'i', 'im', 'just', 'launch', 'launchpad', 'launchpads', 'let', 'lets',
  "let's", 'like', 'make', 'my', 'need', 'of', 'on', 'or', 'our', 'pad', 'pads', 'please',
  'redirect', 'redirects', 'that', 'the', 'this', 'to', 'us', 'want', 'we', 'where', 'which',
  'with', 'your',
])
const KIT_WORDS = new Set([
  'bags', 'fm', 'pump', 'fun', 'pumpfun', 'believe', 'flap', 'four', 'meme', 'long', 'xyz', 'pons',
])
const CHAIN_WORDS = new Set(['arc', 'robinhood', 'testnet', 'chain'])

const KIT_LINE = {
  pons: 'ponsfamily.com',
  pumpfun: 'pump.fun',
  bags: 'bags.fm',
  app: 'believe.app',
  flap: 'flap.sh',
  four: 'four.meme',
  long: 'long.xyz',
  custom: '',
}

function chainLabel(chain) {
  return chain === 'arc' ? 'Arc testnet' : 'Robinhood'
}

function tickerFrom(name) {
  const first = name.split(' ')[0]?.replace(/[^a-zA-Z0-9]/g, '') || ''
  if (first.length >= 2 && first.length <= 10) return first.toUpperCase()
  const letters = name.replace(/[^a-zA-Z0-9]/g, '')
  return letters ? letters.slice(0, 6).toUpperCase() : ''
}

function slugFrom(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)
  if (base && base.length >= 3 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(base) && !['www', 'app', 'api', 'studio', 'docs', 'launcher', 'p', 'preview', 'staging'].includes(base)) {
    return base
  }
  const padded = `${base || 'pad'}-pad`.replace(/--+/g, '-').slice(0, 32)
  return padded.length >= 3 ? padded : 'new-pad'
}

function isFiller(word) {
  const key = word.toLowerCase()
  return STOP.has(key) || KIT_WORDS.has(key) || CHAIN_WORDS.has(key)
}

function titleCase(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .slice(0, 32)
}

function nameFrom(prompt) {
  const text = String(prompt || '').replace(/\s+/g, ' ').trim()
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

function chainFromPrompt(prompt, fallback) {
  if (/\barc\b/i.test(prompt)) return 'arc'
  if (/\brobinhood\b/i.test(prompt)) return 'robinhood'
  return fallback === 'arc' ? 'arc' : 'robinhood'
}

function kitInText(prompt) {
  const t = String(prompt || '').toLowerCase()
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

function kitFromPrompt(prompt, fallback) {
  return kitInText(prompt) || fallback || 'pons'
}

function percentText(bps) {
  return `${(bps / 100).toString()}%`
}

function feeFromText(text, re, fallback) {
  const m = text.match(re)
  if (!m?.[1]) return fallback
  return clampBps(Math.round(Number(m[1]) * 100))
}

function feesFromText(text) {
  return {
    ownerFeeBps: feeFromText(text, /\bowner\s+fee\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*%/i, DEFAULT_OWNER_BPS),
    creatorFeeBps: feeFromText(text, /\bcreator\s+(?:tax|fee)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*%/i, DEFAULT_CREATOR_BPS),
  }
}

function localEnhance(prompt) {
  const text = String(prompt || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const lower = text.toLowerCase()
  const name = nameFrom(text)
  const ticker = tickerFrom(name)
  const chain = /\b(arc|robinhood)\b/i.test(text) ? chainFromPrompt(text, 'robinhood') : null
  const kit = kitInText(text)
  const kitLine = kit ? KIT_LINE[kit] : ''
  const fees = feesFromText(text)
  const sentences = []
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

function localBuild(prompt, kit, chain) {
  const text = String(prompt || '').replace(/\s+/g, ' ').trim()
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

function plainText(text) {
  return String(text || '')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanEnhance(draft, fallback) {
  const prompt = plainText(draft?.prompt).slice(0, MAX_ENHANCE)
  return { prompt: prompt || fallback }
}

function clampBps(n) {
  if (!Number.isFinite(n)) return DEFAULT_OWNER_BPS
  return Math.max(0, Math.min(MAX_FEE_BPS, Math.round(n)))
}

/** Accepts bps (integer), a percent string like "1%", or a fractional percent (0.5 → 50 bps). */
function feeBps(raw, fallback) {
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

function percentBps(raw, fallback) {
  if (raw == null || raw === '') return fallback
  const n = Number(String(raw).replace('%', '').trim())
  return Number.isFinite(n) ? clampBps(n * 100) : fallback
}

function cleanName(raw) {
  return String(raw || '').trim().replace(/^(?:build|create|launch|make)\s+/i, '').slice(0, 32).trim()
}

function cleanBuild(draft, fallback) {
  const name = cleanName(draft?.name)
  const ticker = String(draft?.ticker || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase()
  const description = String(draft?.description || '').trim().slice(0, 160)
  const slug = String(draft?.slug || '').trim().toLowerCase()
  const chain = draft?.chain === 'arc' || draft?.chain === 'robinhood' ? draft.chain : fallback.chain
  const kit = kitFromPrompt(String(draft?.kit || ''), fallback.kit)
  const ownerFeeBps = draft?.ownerFeePercent != null
    ? percentBps(draft.ownerFeePercent, fallback.ownerFeeBps)
    : feeBps(draft?.ownerFeeBps, fallback.ownerFeeBps)
  const creatorFeeBps = draft?.creatorFeePercent != null
    ? percentBps(draft.creatorFeePercent, fallback.creatorFeeBps)
    : feeBps(draft?.creatorFeeBps, fallback.creatorFeeBps)
  return {
    name: name || fallback.name,
    ticker: ticker || fallback.ticker,
    description: description || fallback.description,
    slug: slug || fallback.slug,
    chain,
    kit,
    ownerFeeBps,
    creatorFeeBps,
    curveId: [0, 1, 2].includes(Number(draft?.curveId)) ? Number(draft.curveId) : fallback.curveId,
  }
}

const KIT_SITES = 'pons = ponsfamily.com, pumpfun = pump.fun, bags = bags.fm, app = believe.app, flap = flap.sh, four = four.meme, long = long.xyz'

const ENHANCE_SYSTEM = [
  'Rewrite the user\'s launchpad request as a clear 2-5 sentence English spec. Keep their meaning.',
  'Add: a suggested pad name, a 3-6 letter ticker, a one-line description,',
  'the template it copies (one of pons, pumpfun, bags, app (believe.app), flap, four, long, custom) if implied,',
  'the chain (Robinhood or Arc testnet), owner fee and creator tax as percentages (default 1% and 0.5% if not given),',
  'and any fee-routing rule the user described.',
  `Refer to the template by its site (${KIT_SITES}), for example "copies the bags.fm create flow".`,
  'Name the pad after the user\'s own idea, never after the template it copies (no "BagsClone", "PumpCopy").',
  'Keep platform names the user wrote, such as X (Twitter) usernames or handles.',
  'The kit= and chain= lines are the current UI selection; the user\'s text wins when it names a chain or template.',
  'Write flowing prose, not "Label: value" lines. Weave the name, ticker, template, chain and fees into sentences, in this style:',
  '"Build Coin Desk ($DESK), a launchpad on Arc testnet that copies the bags.fm create flow. Anyone can launch a coin and trade it on a bonding curve. Fees route to the X usernames the creator sets. Owner fee 1%, creator tax 0.5%."',
  'If the request already reads as such a spec, refine it lightly instead of adding more.',
  'No emojis, no hype slogans, no markdown. Max 600 characters.',
  'Return only JSON {"prompt": "..."}.',
].join(' ')

const BUILD_SYSTEM = [
  'Extract a launchpad spec from the user\'s request, which may already be an enhanced spec.',
  'Return only JSON {"name":"","ticker":"","description":"","slug":"","chain":"robinhood|arc","kit":"pons|pumpfun|bags|app|flap|four|long|custom","ownerFeeBps":100,"creatorFeeBps":50,"curveId":1}.',
  'name: the pad name from the text (max 32 chars), a noun phrase only, never starting with Build/Create/Launch. ticker: 3-6 uppercase letters. description: one line, max 160 chars.',
  'slug: lowercase letters, digits and hyphens. chain: arc if the text says Arc, robinhood if it says Robinhood, else the given chain.',
  `kit: by site (${KIT_SITES}); else the given kit.`,
  'ownerFeeBps and creatorFeeBps are basis points (1% = 100). Convert percentages. Defaults 100 and 50. Never above 1000.',
  'Do not invent slogans or features.',
].join(' ')

async function oidcToken() {
  try {
    const token = await getVercelOidcToken()
    if (token) return token
  } catch {
    /* no OIDC context; try the raw env below */
  }
  return (process.env.VERCEL_OIDC_TOKEN || '').trim()
}

async function llmAuth() {
  const gateway = (process.env.AI_GATEWAY_API_KEY || '').trim()
  if (gateway) return { key: gateway, via: 'gateway-key' }
  const oidc = await oidcToken()
  if (oidc) return { key: oidc, via: 'oidc' }
  const openai = (process.env.OPENAI_API_KEY || '').trim()
  if (openai) return { key: openai, via: 'openai' }
  return null
}

const DEFAULT_GATEWAY_MODEL = 'openai/gpt-4.1-mini'
const DEFAULT_GATEWAY_FALLBACKS = ['google/gemini-2.5-flash-lite', 'openai/gpt-4.1-nano']

function modelList(viaGateway) {
  const primary = (process.env.AI_MODEL || '').trim() || (viaGateway ? DEFAULT_GATEWAY_MODEL : 'gpt-4.1-mini')
  if (!viaGateway) return { model: primary, models: undefined }
  const extra = (process.env.AI_MODELS_FALLBACK || '').split(',').map((m) => m.trim()).filter(Boolean)
  const fallbacks = (extra.length ? extra : DEFAULT_GATEWAY_FALLBACKS).filter((m) => m !== primary)
  return { model: primary, models: fallbacks.length ? [primary, ...fallbacks] : undefined }
}

/** The text wins over the UI chips when it names a chain or template. */
function resolveHints(prompt, kit, chain) {
  return {
    kit: kitInText(prompt) || kit,
    chain: chainFromPrompt(prompt, chain),
  }
}

async function llm(action, prompt, kit, chain) {
  const auth = await llmAuth()
  if (!auth) return null
  const viaGateway = auth.via !== 'openai'
  const url = viaGateway
    ? 'https://ai-gateway.vercel.sh/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions'
  const system = action === 'enhance' ? ENHANCE_SYSTEM : BUILD_SYSTEM
  const hints = resolveHints(prompt, kit, chain)
  const { model, models } = modelList(viaGateway)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      ...(models ? { models } : {}),
      temperature: 0.3,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `kit=${hints.kit}\nchain=${hints.chain}\n${prompt}` },
      ],
    }),
  })
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    console.warn(`[write] llm ${auth.via} ${res.status}: ${detail}`)
    return null
  }
  const json = await res.json()
  const text = json?.choices?.[0]?.message?.content
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const action = req.body?.action === 'enhance' ? 'enhance' : 'build'
  const prompt = String(req.body?.prompt || '').slice(0, 2000)
  const kit = String(req.body?.kit || 'pons')
  const chain = req.body?.chain === 'arc' ? 'arc' : 'robinhood'
  try {
    if (action === 'enhance') {
      const fallback = localEnhance(prompt)
      const drafted = await llm('enhance', prompt, kit, chain)
      res.status(200).json({ ...cleanEnhance(drafted || { prompt: fallback }, fallback), source: drafted ? 'ai' : 'local' })
      return
    }
    const fallback = localBuild(prompt, kit, chain)
    const drafted = await llm('build', prompt, kit, chain)
    res.status(200).json({ ...cleanBuild(drafted || fallback, fallback), source: drafted ? 'ai' : 'local' })
  } catch (e) {
    console.warn(`[write] ${action} failed: ${e instanceof Error ? e.message : 'unknown'}`)
    if (action === 'enhance') res.status(200).json({ prompt: localEnhance(prompt), source: 'local' })
    else res.status(200).json({ ...localBuild(prompt, kit, chain), source: 'local' })
  }
}
