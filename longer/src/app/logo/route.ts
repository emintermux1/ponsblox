import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const runtime = 'nodejs'

export async function GET() {
  const buf = await readFile(join(process.cwd(), 'public', 'mark-l.png'))
  return new Response(buf, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400, immutable',
    },
  })
}
