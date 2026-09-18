import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadDotEnv(file) {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadDotEnv(resolve(root, '.env'))

const universeId = (process.env.ROBLOX_UNIVERSE_ID || '').trim()
const placeId = (process.env.ROBLOX_PLACE_ID || '').trim()
const apiKey = (process.env.ROBLOX_API_KEY || '').trim()

if (!universeId || !placeId || !apiKey) {
  console.error(
    'Missing ROBLOX_UNIVERSE_ID, ROBLOX_PLACE_ID, or ROBLOX_API_KEY. Open Cloud can only publish over an existing experience.',
  )
  process.exit(1)
}

function findRojo() {
  const candidates = [
    resolve(root, 'tools/rojo/rojo.exe'),
    resolve(root, 'tools/rojo/rojo'),
    resolve(homedir(), '.rojo/bin/rojo'),
  ]
  for (const bin of candidates) {
    if (existsSync(bin)) return bin
  }
  return 'rojo'
}

function buildPlace() {
  const out = resolve(root, 'roblox/Ponsblox.rbxlx')
  const rojo = findRojo()
  const project = resolve(root, 'roblox/default.project.json')
  const result = spawnSync(rojo, ['build', project, '-o', out], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  })
  if (result.status !== 0) {
    throw new Error(`Rojo build failed with exit ${result.status ?? 'unknown'}`)
  }
  if (!existsSync(out)) {
    throw new Error(`Rojo did not write ${out}`)
  }
  return out
}

const placeFile = buildPlace()
const body = readFileSync(placeFile)
const url = `https://apis.roblox.com/universes/v1/${universeId}/places/${placeId}/versions?versionType=Published`

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'Content-Type': 'application/xml',
  },
  body,
})

const text = await response.text()
if (!response.ok) {
  console.error(`Publish failed: ${response.status} ${text}`)
  process.exit(1)
}

let versionNumber = text
try {
  versionNumber = JSON.parse(text).versionNumber ?? text
} catch {
  // Roblox already returned a plain body; keep it.
}

console.log(`Published Ponsblox place ${placeId} as version ${versionNumber}`)
console.log(`https://www.roblox.com/games/${placeId}/Ponsblox`)
