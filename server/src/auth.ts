import type { Context, Next } from 'hono'
import { ENV } from './env.ts'

/** Roblox game servers only. The browser companion does not send this. */
export async function requireRoblox(c: Context, next: Next) {
  if (!ENV.robloxSecret) {
    return c.json({ error: 'ROBLOX_SERVER_SECRET is not set on the API' }, 503)
  }
  const got = c.req.header('x-ponsblox-secret') || ''
  if (got !== ENV.robloxSecret) return c.json({ error: 'Unauthorized' }, 401)
  await next()
}
