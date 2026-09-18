import { describe, expect, it } from 'vitest'
import { precheckImageFile } from './imageFile.ts'

describe('image precheck', () => {
  it('accepts a png under 2MB', () => {
    expect(precheckImageFile({ type: 'image/png', size: 120_000, name: 'mark.png' })).toBeNull()
  })

  it('rejects a pdf and an oversized file', () => {
    expect(precheckImageFile({ type: 'application/pdf', size: 1000, name: 'x.pdf' })).toMatch(/PNG/)
    expect(precheckImageFile({ type: 'image/png', size: 3_000_000, name: 'big.png' })).toMatch(/2MB/)
  })
})
