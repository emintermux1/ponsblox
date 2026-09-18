import type { Vote } from './comments.ts'

const KEY = 'redditpad.pairVotes'

function load(): Record<string, Vote> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Vote>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function save(map: Record<string, Vote>) {
  localStorage.setItem(KEY, JSON.stringify(map))
}

export function seedScore(holders: number, volume: number): number {
  return Math.max(1, Math.round(holders / 40 + volume / 8000))
}

export function pairVote(id: string): Vote {
  const v = load()[id]
  return v === 1 || v === -1 ? v : 0
}

export function setPairVote(id: string, dir: Vote): Vote {
  const map = load()
  const next: Vote = map[id] === dir ? 0 : dir
  map[id] = next
  save(map)
  return next
}

export function shownScore(id: string, holders: number, volume: number): number {
  return seedScore(holders, volume) + pairVote(id)
}
