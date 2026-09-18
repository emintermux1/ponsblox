import { describe, expect, it } from 'vitest'
import { clampCreatorTaxBps, logoSrc, pctLabel, pctToBps, X_URL } from './format.ts'

describe('logoSrc', () => {
  it('passes https and rewrites ipfs', () => {
    expect(logoSrc('https://example.com/a.png')).toBe('https://example.com/a.png')
    expect(logoSrc('ipfs://bafytestcidxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(
      'https://gateway.pinata.cloud/ipfs/bafytestcidxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    )
    expect(logoSrc('ipfs://bafytestcidxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 1)).toBe(
      'https://ipfs.io/ipfs/bafytestcidxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    )
    expect(logoSrc('')).toBe('')
    expect(logoSrc('not-a-url')).toBe('')
  })

  it('clamps creator tax to 10%', () => {
    expect(pctToBps(1)).toBe(100)
    expect(pctToBps(10)).toBe(1000)
    expect(clampCreatorTaxBps(10_000)).toBe(1000)
    expect(clampCreatorTaxBps(pctToBps(100))).toBe(1000)
    expect(pctLabel(100)).toBe('1%')
    expect(pctLabel(1000)).toBe('10%')
  })

  it('locks the official GitPad X URL', () => {
    expect(X_URL).toBe('https://x.com/LaunchGitLab')
  })
})
