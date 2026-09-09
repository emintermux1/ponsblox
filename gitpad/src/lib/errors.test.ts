import { describe, expect, it } from 'vitest'
import { classifyError } from './errors.ts'

describe('classifyError', () => {
  it('maps product failures without leaking RPC codes', () => {
    expect(classifyError('User rejected the request').code).toBe('WALLET_REJECTED')
    expect(classifyError('RPC error -32000 simulation would revert').message).toBe('Transaction simulation failed.')
    expect(classifyError('GitHub rate limit 429').code).toBe('RATE_LIMITED')
    expect(classifyError('This repository is private or blocked.').code).toBe('REPO_PRIVATE')
    expect(classifyError('Repository not found').code).toBe('REPO_NOT_FOUND')
    expect(classifyError('Not a Pons V2 launch').message).toBe('Not a Pons V2 launch.')
    expect(classifyError('Not an RBLX-pair Pons launch').message).toBe('Not a Pons V2 launch.')
    expect(classifyError('CID was returned but could not be retrieved from the gateway.')).toMatchObject({
      code: 'IPFS_FAILED',
      message: 'CID was returned but could not be retrieved from the gateway.',
    })
    expect(classifyError('Failed to fetch')).toMatchObject({
      code: 'GITHUB_UNAVAILABLE',
      message: 'GitPad API is unreachable.',
    })
    expect(classifyError('GitPad API is unreachable.')).toMatchObject({
      code: 'GITHUB_UNAVAILABLE',
      message: 'GitPad API is unreachable.',
    })
  })
})
