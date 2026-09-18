export type Vote = -1 | 0 | 1

export type Comment = {
  id: string
  author: string
  body: string
  createdAt: number
  score: number
  vote: Vote
}

const KEY = (id: string) => `redditpad.comments.${id}`

function seedComments(id: string): Comment[] {
  const now = Date.now()
  const rows: Record<string, Omit<Comment, 'id' | 'createdAt'>[]> = {
    wsb: [
      { author: 'diamond_hands', body: 'This is the front page with a ticker. Respect the pair lock.', score: 412, vote: 0 },
      { author: 'otc_desk', body: 'Catalog preview. If it launches on Pons it is ETH-backed, not a stock token.', score: 88, vote: 0 },
    ],
    memes: [
      { author: 'op', body: 'r/memes finally has a board that does not feel like a screenshot farm.', score: 190, vote: 0 },
    ],
    crypto: [
      { author: 'mod_note', body: '$RDDT is the product pair. The factory still settles in ETH on Robinhood Chain.', score: 76, vote: 0 },
    ],
  }
  const pick = rows[id] || [
    { author: 'first', body: 'First. Pair looks clean.', score: 12, vote: 0 },
    { author: 'lurker', body: 'Waiting for a real factory receipt before I size it.', score: 7, vote: 0 },
  ]
  return pick.map((c, i) => ({
    ...c,
    id: `${id}-${i}`,
    createdAt: now - (i + 1) * 3_600_000,
  }))
}

export function commentCount(id: string): number {
  return loadComments(id).length
}

export function loadComments(id: string): Comment[] {
  try {
    const raw = localStorage.getItem(KEY(id))
    if (!raw) return seedComments(id)
    const parsed = JSON.parse(raw) as Comment[]
    return Array.isArray(parsed) ? parsed : seedComments(id)
  } catch {
    return seedComments(id)
  }
}

export function saveComments(id: string, rows: Comment[]) {
  localStorage.setItem(KEY(id), JSON.stringify(rows))
}

export function addComment(id: string, author: string, body: string): Comment[] {
  const rows = loadComments(id)
  const next: Comment = {
    id: `${id}-${Date.now()}`,
    author: author || 'anon',
    body: body.trim(),
    createdAt: Date.now(),
    score: 1,
    vote: 1,
  }
  const all = [next, ...rows]
  saveComments(id, all)
  return all
}

export function voteComment(id: string, commentId: string, dir: Vote): Comment[] {
  const rows = loadComments(id).map((c) => {
    if (c.id !== commentId) return c
    const next = dir === c.vote ? 0 : dir
    const delta = next - c.vote
    return { ...c, vote: next as Vote, score: c.score + delta }
  })
  saveComments(id, rows)
  return rows
}
