import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const forge = join(homedir(), '.foundry', 'bin', process.platform === 'win32' ? 'forge.exe' : 'forge')
const viaForge = spawnSync(forge, ['test'], { stdio: 'inherit', cwd: process.cwd() })
if (viaForge.status === 0) process.exit(0)
console.log('forge unavailable here; running the Hardhat suite for the same cases.')
const viaHh = spawnSync(process.execPath, ['./node_modules/hardhat/internal/cli/cli.js', 'test'], {
  stdio: 'inherit',
  cwd: process.cwd(),
})
process.exit(viaHh.status ?? 1)
