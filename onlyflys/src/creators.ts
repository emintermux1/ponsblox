import type { ChatLine } from './store.ts'

export type SceneKind = 'fruit' | 'drain' | 'kitchen' | 'night' | 'compost' | 'swarm' | 'server'

export type Creator = {
  handle: string
  name: string
  tag: string
  bio: string
  price: string
  likes: number
  photos: number
  videos: number
  scene: SceneKind
  featured: boolean
  live: boolean
  seed: ChatLine[]
}

export const CREATORS: Creator[] = [
  {
    handle: 'musca',
    name: 'Musca Deluxe',
    tag: 'Porch regular',
    bio: 'The original house fly. I land. I stay. Subscribe if you like red eyes and bad decisions on a warm bulb.',
    price: '4.20',
    likes: 128_440,
    photos: 86,
    videos: 24,
    scene: 'night',
    featured: true,
    live: true,
    seed: [
      { from: 'them', text: 'you came to the porch. good.' },
      { from: 'them', text: 'the bulb is warm tonight. i am not getting off.' },
    ],
  },
  {
    handle: 'drainq',
    name: 'Drain Queen',
    tag: 'Grate exclusive',
    bio: 'I live on the grate. You subscribe, I buzz. Wet tile, late kitchen, no apologies.',
    price: '6.90',
    likes: 94_210,
    photos: 61,
    videos: 18,
    scene: 'drain',
    featured: true,
    live: true,
    seed: [
      { from: 'them', text: 'the grate is mine after midnight.' },
      { from: 'them', text: 'bring sugar. i do not do free landings.' },
    ],
  },
  {
    handle: 'porchglow',
    name: 'Porch Glow',
    tag: 'Night only',
    bio: 'Night shoots only. Come to the bulb. Wings on. Lights off for everyone else.',
    price: '5.00',
    likes: 77_880,
    photos: 44,
    videos: 31,
    scene: 'night',
    featured: true,
    live: false,
    seed: [{ from: 'them', text: 'halo is on. you watching or buzzing off?' }],
  },
  {
    handle: 'compostk',
    name: 'Compost Kiss',
    tag: 'Warm pile',
    bio: 'Steam, rot, romance. The pile is exclusive. Do not knock. Just land.',
    price: '3.50',
    likes: 61_002,
    photos: 39,
    videos: 12,
    scene: 'compost',
    featured: false,
    live: false,
    seed: [{ from: 'them', text: 'it is warm in here. two on one if you tip.' }],
  },
  {
    handle: 'fruitmount',
    name: 'Peach Mount',
    tag: 'Fruit bowl',
    bio: 'Sticky. Locked. I do not leave the peach until the bowl is empty.',
    price: '8.00',
    likes: 152_330,
    photos: 72,
    videos: 21,
    scene: 'fruit',
    featured: true,
    live: true,
    seed: [
      { from: 'them', text: 'the peach is still wet.' },
      { from: 'them', text: 'subscribe and i stay on it.' },
    ],
  },
  {
    handle: 'sinkfilm',
    name: 'Sink Film',
    tag: 'After hours',
    bio: 'Kitchen after midnight. I walk the film. You watch the walk.',
    price: '4.00',
    likes: 40_110,
    photos: 28,
    videos: 9,
    scene: 'kitchen',
    featured: false,
    live: false,
    seed: [{ from: 'them', text: 'faucet drips. i am still on the porcelain.' }],
  },
  {
    handle: 'rack7',
    name: 'Rack 7',
    tag: 'Server heat',
    bio: 'GPU fans, 40 degrees, we pile on the rails. IT thinks it is dust.',
    price: '7.77',
    likes: 88_901,
    photos: 33,
    videos: 16,
    scene: 'server',
    featured: true,
    live: false,
    seed: [{ from: 'them', text: 'rack 7 is live heat. they cannot see us.' }],
  },
  {
    handle: 'wingbuzz',
    name: 'Wingbuzz',
    tag: 'Amateur swarm',
    bio: 'First molt on camera. Stacks get messy. That is the point.',
    price: '2.50',
    likes: 19_440,
    photos: 17,
    videos: 6,
    scene: 'swarm',
    featured: false,
    live: false,
    seed: [{ from: 'them', text: 'we are still learning the pile. come watch.' }],
  },
  {
    handle: 'labellum',
    name: 'Labellum',
    tag: 'Sponging ASMR',
    bio: 'Close-up sponging. Sugar water. No talking. Just the labellum.',
    price: '9.99',
    likes: 55_670,
    photos: 51,
    videos: 14,
    scene: 'kitchen',
    featured: false,
    live: false,
    seed: [{ from: 'them', text: 'shh. just the sponge. tip if you hear it.' }],
  },
  {
    handle: 'swarmstack',
    name: 'Swarm Stack',
    tag: 'We pile',
    bio: 'Bin 04. Locked pairs. If you wanted one fly you are in the wrong hive.',
    price: '5.50',
    likes: 110_220,
    photos: 48,
    videos: 22,
    scene: 'swarm',
    featured: true,
    live: true,
    seed: [{ from: 'them', text: 'bin 04 is a pile. we do not take turns.' }],
  },
  {
    handle: 'ceiling',
    name: 'Ceiling Fan',
    tag: 'I hang',
    bio: 'I hang. You look up. Slow circles over the table until someone leaves fruit.',
    price: '3.00',
    likes: 27_540,
    photos: 22,
    videos: 8,
    scene: 'kitchen',
    featured: false,
    live: false,
    seed: [{ from: 'them', text: 'look up. i have been here the whole dinner.' }],
  },
  {
    handle: 'mango',
    name: 'Mango Skin',
    tag: 'Sticky locked',
    bio: 'Skin only. He will not get off. Fruit-bowl paywall. You know why.',
    price: '6.00',
    likes: 71_880,
    photos: 36,
    videos: 11,
    scene: 'fruit',
    featured: false,
    live: false,
    seed: [{ from: 'them', text: 'still on the mango. still locked.' }],
  },
]

export function creatorByHandle(handle: string) {
  return CREATORS.find((row) => row.handle === handle)
}

export function liveCreators() {
  return CREATORS.filter((row) => row.live)
}

export function featuredCreators() {
  return CREATORS.filter((row) => row.featured)
}

export function searchCreators(q: string) {
  const needle = q.trim().toLowerCase()
  if (!needle) return CREATORS
  return CREATORS.filter((row) => {
    const hay = `${row.handle} ${row.name} ${row.tag} ${row.bio}`.toLowerCase()
    return hay.includes(needle)
  })
}

export function sceneLabel(kind: SceneKind) {
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

export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`
  return String(n)
}

export const SCENES: SceneKind[] = ['night', 'fruit', 'kitchen', 'drain', 'compost', 'swarm', 'server']
