import { CREATORS, sceneLabel, type SceneKind } from './creators.ts'

export type Post = {
  id: string
  handle: string
  kind: SceneKind
  caption: string
  locked: boolean
  likes: number
  comments: number
  minutesAgo: number
}

export const POSTS: Post[] = [
  { id: 'p1', handle: 'musca', kind: 'night', caption: 'bulb is on. he is on me. porch is closed.', locked: false, likes: 8420, comments: 214, minutesAgo: 12 },
  { id: 'p2', handle: 'fruitmount', kind: 'fruit', caption: 'peach exclusive. stay for the juice.', locked: true, likes: 12110, comments: 388, minutesAgo: 28 },
  { id: 'p3', handle: 'drainq', kind: 'drain', caption: 'grate mount. do not flush.', locked: true, likes: 6904, comments: 141, minutesAgo: 41 },
  { id: 'p4', handle: 'swarmstack', kind: 'swarm', caption: 'bin 04 pile. we lock in.', locked: false, likes: 9901, comments: 260, minutesAgo: 55 },
  { id: 'p5', handle: 'rack7', kind: 'server', caption: 'fans spinning. abdomen curl on the GPU.', locked: true, likes: 5402, comments: 97, minutesAgo: 80 },
  { id: 'p6', handle: 'porchglow', kind: 'night', caption: 'halo only. wings buzzing on her back.', locked: false, likes: 4100, comments: 88, minutesAgo: 110 },
  { id: 'p7', handle: 'compostk', kind: 'compost', caption: 'steam + two on one. warm pile.', locked: true, likes: 3330, comments: 54, minutesAgo: 160 },
  { id: 'p8', handle: 'sinkfilm', kind: 'kitchen', caption: 'midnight film. porcelain walk.', locked: false, likes: 1888, comments: 33, minutesAgo: 200 },
  { id: 'p9', handle: 'mango', kind: 'fruit', caption: 'he will not get off the mango.', locked: true, likes: 7200, comments: 190, minutesAgo: 260 },
  { id: 'p10', handle: 'labellum', kind: 'kitchen', caption: 'sponging asmr. sugar drop.', locked: true, likes: 2501, comments: 71, minutesAgo: 310 },
  { id: 'p11', handle: 'wingbuzz', kind: 'swarm', caption: 'amateur stack. first molt.', locked: false, likes: 980, comments: 22, minutesAgo: 400 },
  { id: 'p12', handle: 'ceiling', kind: 'kitchen', caption: 'look up. dinner is still going.', locked: false, likes: 1444, comments: 19, minutesAgo: 520 },
  { id: 'p13', handle: 'musca', kind: 'night', caption: 'locked pair in the dark. subscribers only.', locked: true, likes: 6110, comments: 102, minutesAgo: 740 },
  { id: 'p14', handle: 'fruitmount', kind: 'fruit', caption: 'triple on the bowl. messy.', locked: true, likes: 8800, comments: 240, minutesAgo: 900 },
  { id: 'p15', handle: 'drainq', kind: 'drain', caption: 'warm grate. she takes him.', locked: false, likes: 2100, comments: 40, minutesAgo: 1100 },
  { id: 'p16', handle: 'swarmstack', kind: 'swarm', caption: 'live from the bin. they pile.', locked: true, likes: 4500, comments: 77, minutesAgo: 1400 },
  { id: 'p17', handle: 'rack7', kind: 'server', caption: 'rack 7 after hours.', locked: false, likes: 3011, comments: 51, minutesAgo: 1800 },
  { id: 'p18', handle: 'porchglow', kind: 'night', caption: 'come to the bulb.', locked: true, likes: 1990, comments: 28, minutesAgo: 2200 },
]

export function postById(id: string) {
  return POSTS.find((row) => row.id === id)
}

export function postsFor(handle: string) {
  return POSTS.filter((row) => row.handle === handle)
}

export function feedPosts() {
  return [...POSTS].sort((a, b) => a.minutesAgo - b.minutesAgo)
}

export function searchPosts(q: string) {
  const needle = q.trim().toLowerCase()
  if (!needle) return POSTS
  return POSTS.filter((row) => {
    const who = CREATORS.find((c) => c.handle === row.handle)
    const hay = `${row.caption} ${row.handle} ${who?.name ?? ''} ${sceneLabel(row.kind)}`.toLowerCase()
    return hay.includes(needle)
  })
}

export function postsByScene(kind: SceneKind | 'all') {
  if (kind === 'all') return POSTS
  return POSTS.filter((row) => row.kind === kind)
}

export function timeAgo(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}
