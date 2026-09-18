import { sparkSeries } from './chart.ts'
import { loadLocalLaunches, type LocalLaunch } from './localLaunches.ts'

export type Kind = 'subreddit' | 'meme' | 'post' | 'character' | 'lore'
export type Status = 'bonding' | 'graduated'
export type SortTab = 'hot' | 'new' | 'top' | 'bonding' | 'graduated'

export type Pair = {
  id: string
  name: string
  ticker: string
  subreddit: string
  sourceUrl: string
  kind: Kind
  image: string
  blurb: string
  mcap: number
  volume: number
  holders: number
  createdAt: number
  bonding: number
  status: Status
  price: number
  change24h: number
  onchain?: { token: `0x${string}`; curve: `0x${string}`; hash: `0x${string}` }
}

const NOW = Date.now()

export const CATALOG: Pair[] = [
  {
    id: 'wsb',
    name: 'WallStreetBets',
    ticker: 'WSB',
    subreddit: 'r/wallstreetbets',
    sourceUrl: 'https://www.reddit.com/r/wallstreetbets/',
    kind: 'subreddit',
    image: '/tokens/wsb.png',
    blurb: 'Bets, loss porn, and the original retail tape.',
    mcap: 4_280_000,
    volume: 912_000,
    holders: 18420,
    createdAt: NOW - 36 * 3_600_000,
    bonding: 74,
    status: 'bonding',
    price: 0.0042,
    change24h: 18.4,
  },
  {
    id: 'memes',
    name: 'Memes',
    ticker: 'MEMES',
    subreddit: 'r/memes',
    sourceUrl: 'https://www.reddit.com/r/memes/',
    kind: 'meme',
    image: '/brand/snoo-emotions.jpg',
    blurb: 'The format factory. Every template is a market.',
    mcap: 2_140_000,
    volume: 540_000,
    holders: 9904,
    createdAt: NOW - 12 * 3_600_000,
    bonding: 51,
    status: 'bonding',
    price: 0.0021,
    change24h: 6.2,
  },
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    ticker: 'CRYPTO',
    subreddit: 'r/cryptocurrency',
    sourceUrl: 'https://www.reddit.com/r/cryptocurrency/',
    kind: 'subreddit',
    image: '/tokens/crypto.png',
    blurb: 'Moons were a dress rehearsal. This is the pair.',
    mcap: 3_010_000,
    volume: 701_000,
    holders: 12110,
    createdAt: NOW - 58 * 3_600_000,
    bonding: 100,
    status: 'graduated',
    price: 0.003,
    change24h: -2.4,
  },
  {
    id: 'aita',
    name: 'Am I the Asshole',
    ticker: 'AITA',
    subreddit: 'r/AmItheAsshole',
    sourceUrl: 'https://www.reddit.com/r/AmItheAsshole/',
    kind: 'post',
    image: '/tokens/aita.png',
    blurb: 'Judgement as a bonding curve. YTA is priced in.',
    mcap: 880_000,
    volume: 142_000,
    holders: 4210,
    createdAt: NOW - 8 * 3_600_000,
    bonding: 29,
    status: 'bonding',
    price: 0.00088,
    change24h: 11.1,
  },
  {
    id: 'ama',
    name: 'Ask Me Anything',
    ticker: 'AMA',
    subreddit: 'r/IAmA',
    sourceUrl: 'https://www.reddit.com/r/IAmA/',
    kind: 'post',
    image: '/tokens/ama.png',
    blurb: 'Proof of presence. One thread, one ticker.',
    mcap: 640_000,
    volume: 98_000,
    holders: 2104,
    createdAt: NOW - 20 * 3_600_000,
    bonding: 22,
    status: 'bonding',
    price: 0.00064,
    change24h: 3.3,
  },
  {
    id: 'eli5',
    name: 'Explain Like Im Five',
    ticker: 'ELI5',
    subreddit: 'r/explainlikeimfive',
    sourceUrl: 'https://www.reddit.com/r/explainlikeimfive/',
    kind: 'lore',
    image: '/tokens/eli5.png',
    blurb: 'Complexity, compressed. The most honest market.',
    mcap: 1_120_000,
    volume: 210_000,
    holders: 5602,
    createdAt: NOW - 72 * 3_600_000,
    bonding: 100,
    status: 'graduated',
    price: 0.0011,
    change24h: 1.8,
  },
  {
    id: 'til',
    name: 'Today I Learned',
    ticker: 'TIL',
    subreddit: 'r/todayilearned',
    sourceUrl: 'https://www.reddit.com/r/todayilearned/',
    kind: 'lore',
    image: '/tokens/til.png',
    blurb: 'Facts that move. A new tile every morning.',
    mcap: 760_000,
    volume: 88_000,
    holders: 3011,
    createdAt: NOW - 5 * 3_600_000,
    bonding: 18,
    status: 'bonding',
    price: 0.00076,
    change24h: 9.7,
  },
  {
    id: 'aww',
    name: 'Aww',
    ticker: 'AWW',
    subreddit: 'r/aww',
    sourceUrl: 'https://www.reddit.com/r/aww/',
    kind: 'character',
    image: '/brand/reddit-icon.png',
    blurb: 'Soft assets. High retention. No irony required.',
    mcap: 1_540_000,
    volume: 266_000,
    holders: 8700,
    createdAt: NOW - 44 * 3_600_000,
    bonding: 63,
    status: 'bonding',
    price: 0.0015,
    change24h: 4.1,
  },
  {
    id: 'ask',
    name: 'AskReddit',
    ticker: 'ASK',
    subreddit: 'r/AskReddit',
    sourceUrl: 'https://www.reddit.com/r/AskReddit/',
    kind: 'post',
    image: '/tokens/ask.png',
    blurb: 'The oldest prompt engine on the internet.',
    mcap: 2_880_000,
    volume: 430_000,
    holders: 14002,
    createdAt: NOW - 96 * 3_600_000,
    bonding: 100,
    status: 'graduated',
    price: 0.0028,
    change24h: -0.6,
  },
  {
    id: 'science',
    name: 'Science',
    ticker: 'SCIENCE',
    subreddit: 'r/science',
    sourceUrl: 'https://www.reddit.com/r/science/',
    kind: 'lore',
    image: '/tokens/science.png',
    blurb: 'Citations in, liquidity out.',
    mcap: 990_000,
    volume: 121_000,
    holders: 3888,
    createdAt: NOW - 15 * 3_600_000,
    bonding: 41,
    status: 'bonding',
    price: 0.00099,
    change24h: 2.2,
  },
  {
    id: 'gme',
    name: 'Superstonk',
    ticker: 'GME',
    subreddit: 'r/Superstonk',
    sourceUrl: 'https://www.reddit.com/r/Superstonk/',
    kind: 'lore',
    image: '/tokens/gme.png',
    blurb: 'The sequel thread. Still not financial advice.',
    mcap: 5_120_000,
    volume: 1_240_000,
    holders: 22140,
    createdAt: NOW - 110 * 3_600_000,
    bonding: 100,
    status: 'graduated',
    price: 0.0051,
    change24h: 7.9,
  },
  {
    id: 'dnd',
    name: 'Dungeons and Dragons',
    ticker: 'DND',
    subreddit: 'r/DnD',
    sourceUrl: 'https://www.reddit.com/r/DnD/',
    kind: 'character',
    image: '/brand/snoo-lego.jpg',
    blurb: 'Nat 20s as a volatility event.',
    mcap: 540_000,
    volume: 67_000,
    holders: 1980,
    createdAt: NOW - 3 * 3_600_000,
    bonding: 14,
    status: 'bonding',
    price: 0.00054,
    change24h: 14.6,
  },
]

function fallbackImage(ticker: string): string {
  const t = ticker.toLowerCase()
  if (t.includes('wsb') || t.includes('gme')) return '/brand/snoo-emotions.jpg'
  if (t.includes('meme')) return '/brand/snoo-emotions.jpg'
  if (t.includes('lego') || t.includes('dnd')) return '/brand/snoo-lego.jpg'
  return '/brand/redditpad-mark.jpg'
}

function fromLocal(row: LocalLaunch): Pair {
  return {
    id: row.id,
    name: row.name,
    ticker: row.ticker,
    subreddit: row.subreddit,
    sourceUrl: row.sourceUrl,
    kind: row.kind,
    image: row.image || fallbackImage(row.ticker),
    blurb: row.blurb,
    mcap: row.mcap,
    volume: row.volume,
    holders: row.holders,
    createdAt: row.createdAt,
    bonding: row.bonding,
    status: row.status,
    price: row.price,
    change24h: row.change24h,
    onchain: row.onchain,
  }
}

export function allPairs(): Pair[] {
  const local = loadLocalLaunches().map(fromLocal)
  const seen = new Set(local.map((p) => p.id))
  return [...local, ...CATALOG.filter((p) => !seen.has(p.id))]
}

export function pairById(id: string): Pair | null {
  const key = id.toLowerCase().replace(/^\$/, '')
  return allPairs().find((p) => p.id === key || p.ticker.toLowerCase() === key) ?? null
}

export function pairHref(p: Pair): string {
  return `/p/${encodeURIComponent(p.ticker.toLowerCase())}`
}

export function kindLabel(kind: Kind): string {
  switch (kind) {
    case 'subreddit':
      return 'Subreddits'
    case 'meme':
      return 'Memes'
    case 'post':
      return 'Posts'
    case 'character':
      return 'Characters'
    case 'lore':
      return 'Reddit Lore'
    default: {
      const _e: never = kind
      return _e
    }
  }
}

export function filterPairs(input: {
  q?: string
  tab?: SortTab
  kind?: Kind | 'all'
}): Pair[] {
  const q = (input.q || '').trim().toLowerCase()
  const tab = input.tab ?? 'hot'
  const kind = input.kind ?? 'all'
  let rows = allPairs()
  if (kind !== 'all') rows = rows.filter((p) => p.kind === kind)
  if (q) {
    rows = rows.filter((p) => {
      const hay = `${p.name} ${p.ticker} ${p.subreddit} ${p.blurb} ${p.sourceUrl}`.toLowerCase()
      return hay.includes(q)
    })
  }
  switch (tab) {
    case 'hot':
      rows = [...rows].sort((a, b) => b.volume * (1 + b.change24h / 100) - a.volume * (1 + a.change24h / 100))
      break
    case 'new':
      rows = [...rows].sort((a, b) => b.createdAt - a.createdAt)
      break
    case 'top':
      rows = [...rows].sort((a, b) => b.mcap - a.mcap)
      break
    case 'bonding':
      rows = rows.filter((p) => p.status === 'bonding').sort((a, b) => b.bonding - a.bonding)
      break
    case 'graduated':
      rows = rows.filter((p) => p.status === 'graduated').sort((a, b) => b.mcap - a.mcap)
      break
    default: {
      const _e: never = tab
      return _e
    }
  }
  return rows
}

export function relatedPairs(p: Pair, n = 3): Pair[] {
  return allPairs()
    .filter((x) => x.id !== p.id && (x.subreddit === p.subreddit || x.kind === p.kind))
    .slice(0, n)
}

export function sameSubreddit(p: Pair, n = 4): Pair[] {
  const same = allPairs().filter((x) => x.id !== p.id && x.subreddit.toLowerCase() === p.subreddit.toLowerCase())
  if (same.length) return same.slice(0, n)
  return filterPairs({ tab: 'hot' }).filter((x) => x.id !== p.id).slice(0, n)
}

export function sparkFor(p: Pair): number[] {
  return sparkSeries(p.id, 24, Math.max(0.2, p.price * 200))
}
