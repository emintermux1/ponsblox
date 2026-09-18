import { tickerClean } from './format.ts'

export type SnapKind = 'screenshot' | 'story' | 'streak' | 'spotlight' | 'link'

export type SnapSource = {
  kind: SnapKind
  url: string
  account: string
  caption: string
  hint: string
  name: string
  ticker: string
  image?: string
  videoUrl?: string
  snapUrl?: string
}

const HANDLE = /(?:^|[\s/@])([A-Za-z][A-Za-z0-9._]{1,23})\b/

function kindLabel(kind: SnapKind): string {
  switch (kind) {
    case 'screenshot': return 'Screenshot'
    case 'story': return 'Story Snap'
    case 'streak': return 'Streak Snap'
    case 'spotlight': return 'Spotlight'
    case 'link': return 'Public Snap'
    default: {
      const _e: never = kind
      return _e
    }
  }
}

export { kindLabel }

function prettyHandle(raw: string): string {
  const clean = raw.replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 24)
  return clean ? `@${clean.toLowerCase()}` : '@snap'
}

function titleFromHandle(handle: string): string {
  const core = handle.replace(/^@/, '')
  if (!core) return 'Untitled Snap'
  return core.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function tickerFrom(parts: string[]): string {
  const joined = parts.join(' ')
  const words = joined.split(/[^A-Za-z0-9]+/).filter((w) => w.length >= 2)
  const first = words[0] || 'SNAP'
  return tickerClean(first).slice(0, 8) || 'SNAP'
}

function parseUrl(raw: string): SnapSource | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '')
  const path = url.pathname.replace(/\/+$/, '')
  const add = path.match(/^\/add\/([^/]+)/i)
  const at = path.match(/^\/@([^/]+)/i)
  const user = add?.[1] || at?.[1] || ''
  const isSnap = host === 'snapchat.com' || host === 't.snapchat.com' || host.endsWith('.snapchat.com')
  const kind: SnapKind = path.includes('spotlight')
    ? 'spotlight'
    : path.includes('story') || path.includes('/p/')
      ? 'story'
      : isSnap
        ? 'link'
        : 'link'
  const account = prettyHandle(user || url.searchParams.get('user') || (isSnap ? 'public' : host.split('.')[0] || 'snap'))
  const caption = decodeURIComponent(path.split('/').filter(Boolean).pop() || '').replace(/[-_]/g, ' ')
  return {
    kind,
    url: url.toString(),
    account,
    caption: caption && caption !== user ? caption : '',
    hint: `${kindLabel(kind)} · ${account}`,
    name: titleFromHandle(account),
    ticker: tickerFrom([user, caption, account]),
  }
}

export function parseSnapSource(raw: string): SnapSource | null {
  const text = raw.trim()
  if (!text) return null
  if (/^https?:\/\//i.test(text)) return parseUrl(text)
  const handle = text.match(HANDLE)
  if (text.startsWith('@') || handle) {
    const account = prettyHandle(text.startsWith('@') ? text : handle?.[1] || text)
    return {
      kind: 'story',
      url: `https://www.snapchat.com/add/${account.slice(1)}`,
      account,
      caption: '',
      hint: `Story Snap · ${account}`,
      name: titleFromHandle(account),
      ticker: tickerFrom([account]),
    }
  }
  return null
}

export function sourceFromFile(file: File): SnapSource {
  const base = file.name.replace(/\.[a-z0-9]+$/i, '')
  const words = base.replace(/[-_]+/g, ' ').trim()
  const handle = words.match(HANDLE)?.[1]
  const account = prettyHandle(handle || 'camera-roll')
  const streak = /streak/i.test(words)
  return {
    kind: streak ? 'streak' : 'screenshot',
    url: '',
    account,
    caption: words && words !== handle ? words : '',
    hint: streak ? `Streak Snap · ${account}` : `Screenshot · ${account}`,
    name: words ? words.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 32) : titleFromHandle(account),
    ticker: tickerFrom([words, account]),
  }
}
