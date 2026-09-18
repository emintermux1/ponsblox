import { describe, expect, it } from 'vitest'
import { validateMetadata } from './metadata.ts'
import { validateSplits } from './gitpad.ts'
import { feeBrief, feePermissionFor, hasFeeStep, tokenFromLaunchReceipt } from './pons/factory.ts'
import { classifyError, classifyLaunchFail } from './errors.ts'
import type { TokenRecord } from './pons/types.ts'
import type { Address } from 'viem'

describe('metadata', () => {
  it('rejects missing github id and missing suffix', () => {
    expect(validateMetadata({ name: 'React', symbol: 'REACT' }).ok).toBe(false)
    expect(validateMetadata({
      name: 'React By GitLab',
      symbol: 'REACT',
      description: 'x',
      image: 'https://example.com/a.png',
      external_url: 'https://github.com/facebook/react',
      github_id: 10270250,
      repository: 'facebook/react',
    }).ok).toBe(true)
  })
})

describe('fee splits', () => {
  it('requires 10000 bps, no zero, no duplicates', () => {
    const a = '0x1111111111111111111111111111111111111111' as Address
    const b = '0x2222222222222222222222222222222222222222' as Address
    expect(validateSplits([{ to: a, bps: 6000, role: 'HOLDERS' }])).toMatch(/100%/)
    expect(validateSplits([
      { to: a, bps: 5000, role: 'HOLDERS' },
      { to: a, bps: 5000, role: 'CREATOR' },
    ])).toMatch(/Duplicate/)
    expect(validateSplits([
      { to: a, bps: 6000, role: 'HOLDERS' },
      { to: b, bps: 4000, role: 'CREATOR' },
    ])).toBeNull()
  })
})

describe('fee permission', () => {
  const token = {
    token: '0x3333333333333333333333333333333333333333',
    creatorFeeRecipient: '0x4444444444444444444444444444444444444444',
  } as TokenRecord

  it('asks a stranger to connect the creator wallet', () => {
    const p = feePermissionFor({
      token,
      wallet: '0x5555555555555555555555555555555555555555',
      feeRouter: '0x6666666666666666666666666666666666666666',
    })
    expect(p.supported).toBe(false)
    expect(p.kind).toBe('need_creator')
    if (p.kind === 'need_creator') expect(p.creator).toBe(token.creatorFeeRecipient)
  })

  it('asks for the creator wallet when none is connected', () => {
    const p = feePermissionFor({
      token,
      feeRouter: '0x6666666666666666666666666666666666666666',
    })
    expect(p.kind).toBe('need_creator')
  })

  it('allows the current recipient to transfer', () => {
    const p = feePermissionFor({
      token,
      wallet: token.creatorFeeRecipient,
      feeRouter: '0x6666666666666666666666666666666666666666',
    })
    expect(p.kind).toBe('transfer_recipient')
    expect(hasFeeStep(p)).toBe(true)
    expect(feeBrief(p)).toMatch(/Creator connected/)
  })
})

describe('launch receipt', () => {
  it('does not invent a token from empty logs', () => {
    expect(tokenFromLaunchReceipt([])).toBeNull()
  })
})

describe('errors', () => {
  it('maps wallet reject and missing repo', () => {
    expect(classifyError('User rejected the request').code).toBe('WALLET_REJECTED')
    expect(classifyError('Paste owner/name or a GitHub URL').code).toBe('BAD_REPO')
  })
})

describe('launch fail', () => {
  it('classifies signature, simulation, delay, and indexer misses', () => {
    expect(classifyLaunchFail('User rejected the request').retry).toBe('deploy')
    expect(classifyLaunchFail('Simulation failed. The launch would revert.').code).toBe('SIMULATION_FAILED')
    expect(classifyLaunchFail('RPC timed out while waiting for the receipt').code).toBe('CONFIRMATION_DELAYED')
    expect(classifyLaunchFail('Receipt confirmed but TokenLaunched was not in the logs. Not marking LIVE.').retry).toBe('resume')
    expect(classifyLaunchFail('IPFS upload failed.').retry).toBe('token')
  })
})
