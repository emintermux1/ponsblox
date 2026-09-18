import { describe, expect, it } from 'vitest'
import {
  BUILD_STEPS,
  createPacer,
  failAt,
  isBuilding,
  phaseSpec,
  phaseStep,
  stepLabel,
  stepState,
  type BuildPhase,
} from './buildPhase.ts'
import type { PadBuild } from './write.ts'

const spec: PadBuild = {
  name: 'Coin Desk',
  ticker: 'DESK',
  description: 'A pad',
  slug: 'coin-desk',
  chain: 'arc',
  kit: 'bags',
  ownerFeeBps: 100,
  creatorFeeBps: 50,
  curveId: 1,
}

describe('buildPhase', () => {
  it('orders steps and maps phases onto them', () => {
    expect(BUILD_STEPS).toEqual(['reading', 'naming', 'template', 'fees', 'wallet', 'confirming', 'live'])
    expect(phaseStep({ kind: 'idle' })).toBeNull()
    expect(phaseStep({ kind: 'reading' })).toBe('reading')
    expect(phaseStep({ kind: 'wallet', spec })).toBe('wallet')
    expect(phaseStep({ kind: 'failed', at: 'confirming', spec, error: 'x' })).toBe('confirming')
  })

  it('marks done, active, todo, failed', () => {
    const wallet: BuildPhase = { kind: 'wallet', spec }
    expect(stepState('reading', wallet)).toBe('done')
    expect(stepState('fees', wallet)).toBe('done')
    expect(stepState('wallet', wallet)).toBe('active')
    expect(stepState('confirming', wallet)).toBe('todo')
    expect(stepState('live', wallet)).toBe('todo')

    const failed: BuildPhase = { kind: 'failed', at: 'wallet', spec, error: 'No wallet found.' }
    expect(stepState('fees', failed)).toBe('done')
    expect(stepState('wallet', failed)).toBe('failed')
    expect(stepState('confirming', failed)).toBe('todo')

    const live: BuildPhase = { kind: 'live', spec, hash: '0x1', owner: '0x2' }
    expect(stepState('live', live)).toBe('done')
    expect(stepState('reading', { kind: 'idle' })).toBe('todo')
  })

  it('labels steps in English with the chain name', () => {
    expect(stepLabel('reading', null)).toBe('Reading your prompt')
    expect(stepLabel('confirming', 'arc')).toBe('Confirming on Arc testnet')
    expect(stepLabel('confirming', 'robinhood')).toBe('Confirming on Robinhood')
    expect(stepLabel('live', 'arc')).toBe('Live')
  })

  it('fails at the current step and keeps the spec', () => {
    const failed = failAt({ kind: 'wallet', spec }, 'Wallet rejected the transaction.')
    expect(failed).toEqual({ kind: 'failed', at: 'wallet', spec, error: 'Wallet rejected the transaction.' })
    expect(failAt({ kind: 'reading' }, 'boom')).toEqual({ kind: 'failed', at: 'reading', spec: null, error: 'boom' })
    expect(failAt({ kind: 'idle' }, 'boom').kind).toBe('failed')
  })

  it('knows when work is in flight', () => {
    expect(isBuilding({ kind: 'idle' })).toBe(false)
    expect(isBuilding({ kind: 'reading' })).toBe(true)
    expect(isBuilding({ kind: 'confirming', spec, hash: '0x1' })).toBe(true)
    expect(isBuilding({ kind: 'live', spec, hash: '0x1', owner: '0x2' })).toBe(false)
    expect(isBuilding({ kind: 'pending', spec, hash: '0x1' })).toBe(false)
    expect(isBuilding({ kind: 'failed', at: 'wallet', spec, error: 'x' })).toBe(false)
    expect(phaseSpec({ kind: 'reading' })).toBeNull()
    expect(phaseSpec({ kind: 'fees', spec })).toBe(spec)
  })

  it('holds each step for the minimum dwell', async () => {
    let now = 0
    const waits: number[] = []
    const shown: string[] = []
    const pacer = createPacer(
      (p) => shown.push(p.kind),
      1100,
      () => now,
      async (ms) => {
        waits.push(ms)
        now += ms
      },
    )
    await pacer.to({ kind: 'reading' })
    expect(waits).toEqual([])
    now += 300
    await pacer.to({ kind: 'naming', spec })
    expect(waits).toEqual([800])
    now += 2000
    await pacer.to({ kind: 'template', spec })
    expect(waits).toEqual([800])
    pacer.now({ kind: 'failed', at: 'template', spec, error: 'x' })
    expect(pacer.current().kind).toBe('failed')
    expect(shown).toEqual(['reading', 'naming', 'template', 'failed'])
  })

  it('flips Confirming to Live without waiting out the dwell', async () => {
    let now = 0
    const waits: number[] = []
    const pacer = createPacer(
      () => undefined,
      1100,
      () => now,
      async (ms) => {
        waits.push(ms)
        now += ms
      },
    )
    pacer.now({ kind: 'confirming', spec, hash: '0x1' })
    now += 50
    await pacer.to({ kind: 'live', spec, hash: '0x1', owner: '0x2' })
    expect(waits).toEqual([])
    expect(pacer.current().kind).toBe('live')
    expect(stepState('confirming', { kind: 'pending', spec, hash: '0x1' })).toBe('pending')
    expect(phaseStep({ kind: 'pending', spec, hash: '0x1' })).toBe('confirming')
    const failed = failAt({ kind: 'confirming', spec, hash: '0x1' }, 'Create pad reverted.')
    expect(failed).toEqual({
      kind: 'failed',
      at: 'confirming',
      spec,
      error: 'Create pad reverted.',
      hash: '0x1',
    })
  })
})
