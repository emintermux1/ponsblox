import { describe, expect, it } from 'vitest'
import { IMAGE_MAX_BYTES, precheckImageFile } from './imageFile.ts'

describe('imageFile', () => {
  it('rejects empty and huge files', () => {
    expect(precheckImageFile({ type: 'image/png', size: 0 })).toBe('That file is empty.')
    expect(precheckImageFile({ type: 'image/png', size: IMAGE_MAX_BYTES + 1 })).toMatch(/Max is 2MB/)
  })

  it('rejects non-images', () => {
    expect(precheckImageFile({ type: 'application/pdf', size: 12 })).toBe('Use PNG, JPEG, WebP, or GIF.')
  })

  it('accepts a small png', () => {
    expect(precheckImageFile({ type: 'image/png', size: 2048 })).toBeNull()
  })
})
