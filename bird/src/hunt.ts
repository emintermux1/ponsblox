export type Costume = 'classic' | 'gold' | 'night' | 'rewards'

export type QuestId = 'play' | 'worms' | 'crop' | 'nest' | 'ms'

export type Quest = {
  id: QuestId
  label: string
  pts: number
  target: number
}

export type HuntSave = {
  points: number
  claimed: number
  best: number
  costume: Costume
  day: string
  done: QuestId[]
  unlocked: Costume[]
  medals: string[]
  streak: number
}

const KEY = 'penis-bird-hunt-v3'

export const QUESTS: Quest[] = [
  { id: 'play', label: 'Daily flight', pts: 10, target: 1 },
  { id: 'ms', label: 'Collect 20 Microsoft', pts: 40, target: 20 },
  { id: 'worms', label: 'Collect 8 worms', pts: 20, target: 8 },
  { id: 'crop', label: 'Fill crop capacity', pts: 25, target: 1 },
  { id: 'nest', label: 'Reach a nest', pts: 50, target: 1 },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function empty(): HuntSave {
  return {
    points: 0,
    claimed: 0,
    best: 0,
    costume: 'classic',
    day: today(),
    done: [],
    unlocked: ['classic'],
    medals: [],
    streak: 1,
  }
}

export function loadHunt(): HuntSave {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const data = JSON.parse(raw) as HuntSave
    if (typeof data.claimed !== 'number') data.claimed = 0
    if (data.day !== today()) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const y = yesterday.toISOString().slice(0, 10)
      data.streak = data.day === y ? (data.streak || 1) + 1 : 1
      data.day = today()
      data.done = []
    }
    return data
  } catch {
    return empty()
  }
}

export function saveHunt(data: HuntSave) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function awardQuest(data: HuntSave, id: QuestId, value: number): number {
  const quest = QUESTS.find((q) => q.id === id)
  if (!quest || data.done.includes(id) || value < quest.target) return 0
  data.done.push(id)
  data.points += quest.pts
  return quest.pts
}

export function unlockFromRun(data: HuntSave, score: number, worms: number, nests: number, level: number) {
  if (worms >= 20 && !data.unlocked.includes('gold')) data.unlocked.push('gold')
  if (level >= 4 && !data.unlocked.includes('night')) data.unlocked.push('night')
  if (nests >= 2 && !data.unlocked.includes('rewards')) data.unlocked.push('rewards')
  data.best = Math.max(data.best, score)
}

export function stampMedal(data: HuntSave, name: string) {
  if (!data.medals.includes(name)) data.medals.push(name)
}

export function addPoints(data: HuntSave, n: number) {
  if (n <= 0) return
  data.points += n
}

export function claimPoints(data: HuntSave): number {
  const n = data.points
  if (n <= 0) return 0
  data.claimed += n
  data.points = 0
  return n
}
