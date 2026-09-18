const MESSAGE_KEYS = ['shortMessage', 'message', 'details', 'reason', 'error'] as const
const CODE_KEYS = ['code', 'cause', 'error', 'data'] as const
const GENERIC = 'Something failed. Try again.'

const FACTORY_COPY: { test: RegExp; copy: string }[] = [
  { test: /SlugTaken|0x903f87db/i, copy: 'That slug is taken.' },
  { test: /BadSlug|0x18f46120/i, copy: 'Pick a different slug.' },
  { test: /BadFee|0x917f1a53/i, copy: 'Fees are too high.' },
  { test: /BadCurve|0x9f4d8ad5/i, copy: 'Pick a different curve.' },
  { test: /UnknownPad|0x27f00225/i, copy: 'This pad is not on this chain.' },
  { test: /NotAuthorized|0xea8e4eb5|NotOwner|0x30cd7471/i, copy: 'This wallet cannot do that.' },
  { test: /TokenUnknown|0xf517c1c1/i, copy: 'That token is not on this pad.' },
  { test: /NotFactory|0x32cc7236/i, copy: 'Launcher factory is not set.' },
]

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function messageOf(e: unknown, depth = 0): string {
  if (typeof e === 'string') return e.trim()
  if (e instanceof Error && e.message.trim()) return e.message.trim()
  if (!isRecord(e) || depth > 3) return ''
  for (const key of MESSAGE_KEYS) {
    const v = e[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (isRecord(v)) {
      const inner = messageOf(v, depth + 1)
      if (inner) return inner
    }
  }
  return ''
}

function textsOf(e: unknown, depth = 0, out: string[] = []): string[] {
  if (e == null || depth > 5) return out
  if (typeof e === 'string') {
    if (e.trim()) out.push(e.trim())
    return out
  }
  if (e instanceof Error && e.message.trim()) out.push(e.message.trim())
  if (!isRecord(e)) return out
  for (const key of ['errorName', 'signature', ...MESSAGE_KEYS, 'data']) {
    const v = e[key]
    if (typeof v === 'string' && v.trim()) out.push(v.trim())
  }
  if ('cause' in e) textsOf(e.cause, depth + 1, out)
  if (isRecord(e.error)) textsOf(e.error, depth + 1, out)
  if (isRecord(e.data)) textsOf(e.data, depth + 1, out)
  return out
}

function codeOf(e: unknown, depth = 0): number | null {
  if (!isRecord(e) || depth > 3) return null
  for (const key of CODE_KEYS) {
    const v = e[key]
    if (key === 'code') {
      const n = typeof v === 'string' ? Number(v) : v
      if (typeof n === 'number' && Number.isFinite(n)) return n
      continue
    }
    const inner = codeOf(v, depth + 1)
    if (inner != null) return inner
  }
  return null
}

/** Known factory / slug reverts, even when buried under an eth_call dump. */
export function factoryUserError(e: unknown): string | null {
  const texts = textsOf(e)
  const blob = texts.join('\n')
  if (!blob) return null
  for (const row of FACTORY_COPY) {
    if (row.test.test(blob)) return row.copy
  }
  if (texts.some((t) => /^(reserved|charset|length|hyphen)$/i.test(t))) {
    return 'Pick a different slug.'
  }
  return null
}

export function userError(e: unknown): string {
  const code = codeOf(e)
  if (code === 4001) return 'Wallet rejected the transaction.'
  if (code === -32002) return 'Wallet request already pending.'
  const factory = factoryUserError(e)
  if (factory) return factory
  const raw = messageOf(e)
  if (!raw || raw === '[object Object]') return GENERIC
  if (/Receipt timed out|Timed out while waiting for transaction|Still confirming/i.test(raw)) {
    return 'Still confirming — open Explorer'
  }
  if (/user rejected|denied|4001/i.test(raw)) return 'Wallet rejected the transaction.'
  if (/already pending|-32002/i.test(raw)) return 'Wallet request already pending.'
  if (/insufficient funds|exceeds the balance|out of USDC/i.test(raw)) {
    return /usdc/i.test(raw) ? 'Not enough USDC for gas.' : 'Insufficient funds for gas.'
  }
  if (/eth_call|HTTP request failed|Too Many Requests|429/i.test(raw)) {
    return 'Chain RPC is busy. Try again.'
  }
  if (/factory is not/i.test(raw)) return raw
  return raw.length > 140 ? GENERIC : raw
}
