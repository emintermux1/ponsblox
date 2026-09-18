export type ClipKind = 'fruit' | 'drain' | 'kitchen' | 'night' | 'compost' | 'swarm' | 'server'

export type Rail = 'hot' | 'new' | 'trending'

export type Clip = {
  id: string
  title: string
  kind: ClipKind
  rail: Rail
  mins: number
  secs: number
  views: number
  hd: boolean
}

export const CLIPS: Clip[] = [
  { id: 'x1', title: 'Mounted on the peach', kind: 'fruit', rail: 'hot', mins: 9, secs: 14, views: 890_440, hd: true },
  { id: 'x2', title: 'Pinned on compost heat', kind: 'compost', rail: 'hot', mins: 7, secs: 41, views: 612_008, hd: true },
  { id: 'x3', title: 'Swarm pile · they lock in the bin', kind: 'swarm', rail: 'hot', mins: 12, secs: 3, views: 544_210, hd: true },
  { id: 'x4', title: 'Kitchen ceiling · he is on her', kind: 'kitchen', rail: 'trending', mins: 8, secs: 22, views: 301_880, hd: true },
  { id: 'x5', title: 'Drain grate mount', kind: 'drain', rail: 'hot', mins: 6, secs: 55, views: 277_640, hd: true },
  { id: 'x6', title: 'Porch light · they fuck in the glow', kind: 'night', rail: 'hot', mins: 11, secs: 8, views: 419_330, hd: true },
  { id: 'x7', title: 'Triple stack · fruit mess', kind: 'fruit', rail: 'trending', mins: 4, secs: 19, views: 188_050, hd: true },
  { id: 'x8', title: 'Night pair · locked in the dark', kind: 'night', rail: 'new', mins: 5, secs: 40, views: 41_220, hd: false },
  { id: 'x9', title: 'Manure heap · rocking', kind: 'compost', rail: 'trending', mins: 14, secs: 2, views: 388_901, hd: true },
  { id: 'x10', title: 'Server rack · they do it on the GPUs', kind: 'server', rail: 'hot', mins: 10, secs: 17, views: 501_880, hd: true },
  { id: 'x11', title: 'Sink film · she takes him', kind: 'kitchen', rail: 'trending', mins: 3, secs: 48, views: 96_410, hd: true },
  { id: 'x12', title: 'Bin 04 · pile of locked pairs', kind: 'swarm', rail: 'hot', mins: 16, secs: 0, views: 229_440, hd: true },
  { id: 'x13', title: 'Warm grate · abdomen curl', kind: 'drain', rail: 'new', mins: 8, secs: 11, views: 22_880, hd: true },
  { id: 'x14', title: 'Mango skin · he will not get off', kind: 'fruit', rail: 'new', mins: 6, secs: 27, views: 18_770, hd: false },
  { id: 'x15', title: 'Compost steam · two on one', kind: 'compost', rail: 'new', mins: 5, secs: 9, views: 9_770, hd: true },
  { id: 'x16', title: 'Bulb halo · wings buzzing on her back', kind: 'night', rail: 'new', mins: 3, secs: 33, views: 31_050, hd: true },
  { id: 'x17', title: 'Warm fans · rack 7 pile', kind: 'server', rail: 'trending', mins: 13, secs: 4, views: 143_900, hd: true },
  { id: 'x18', title: 'Countertop · mounted and rocking', kind: 'kitchen', rail: 'new', mins: 4, secs: 52, views: 14_330, hd: false },
]

export const CATEGORIES: { id: ClipKind; label: string }[] = [
  { id: 'fruit', label: 'Fruit' },
  { id: 'drain', label: 'Drain' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'night', label: 'Night' },
  { id: 'compost', label: 'Compost' },
  { id: 'swarm', label: 'Swarm' },
  { id: 'server', label: 'Server' },
]

export function railLabel(rail: Rail) {
  switch (rail) {
    case 'hot':
      return 'HOT'
    case 'new':
      return 'NEW'
    case 'trending':
      return 'MOST WATCHED'
    default: {
      const _never: never = rail
      return _never
    }
  }
}

export function kindLabel(kind: ClipKind) {
  switch (kind) {
    case 'fruit':
      return 'Fruit'
    case 'drain':
      return 'Drain'
    case 'kitchen':
      return 'Kitchen'
    case 'night':
      return 'Night'
    case 'compost':
      return 'Compost'
    case 'swarm':
      return 'Swarm'
    case 'server':
      return 'Server'
    default: {
      const _never: never = kind
      return _never
    }
  }
}

export function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`
  return String(n)
}

export function formatTime(mins: number, secs: number) {
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function clipsFor(kind: ClipKind | 'all', rail?: Rail, q = '') {
  const needle = q.trim().toLowerCase()
  return CLIPS.filter((clip) => {
    if (kind !== 'all' && clip.kind !== kind) return false
    if (rail && clip.rail !== rail) return false
    if (needle && !clip.title.toLowerCase().includes(needle)) return false
    return true
  })
}

export function relatedTo(clip: Clip) {
  return CLIPS.filter((row) => row.id !== clip.id).slice(0, 6)
}

export function seedOf(id: string) {
  let n = 2166136261
  for (let i = 0; i < id.length; i++) n = Math.imul(n ^ id.charCodeAt(i), 16777619)
  return Math.abs(n)
}
