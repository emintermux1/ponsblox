import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outfile = resolve(root, 'api/all.js')
mkdirSync(dirname(outfile), { recursive: true })

await build({
  absWorkingDir: root,
  entryPoints: [resolve(root, 'src/server/vercelHandler.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile,
  logLevel: 'info',
})
