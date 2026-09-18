import { resolveSnapchatPage } from '../src/server/snapchat.ts'

export default async function handler(req: { query?: { q?: string }; url?: string }, res: {
  status: (n: number) => { json: (v: unknown) => void }
  json: (v: unknown) => void
}) {
  const q = typeof req.query?.q === 'string'
    ? req.query.q
    : new URL(req.url || '/', 'http://localhost').searchParams.get('q') || ''
  const data = await resolveSnapchatPage(q)
  if (!data) {
    res.status(404).json({ error: 'Not a public Snapchat profile or Spotlight we can read.' })
    return
  }
  res.status(200).json(data)
}
