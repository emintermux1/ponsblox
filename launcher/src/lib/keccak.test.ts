import { describe, expect, it } from 'vitest'
import { keccak256, stringToBytes } from 'viem'
import { slugHash } from './keccak.ts'

describe('slugHash', () => {
  it('matches keccak of the slug bytes', () => {
    expect(slugHash('steelpad')).toBe(keccak256(stringToBytes('steelpad')))
  })
})
