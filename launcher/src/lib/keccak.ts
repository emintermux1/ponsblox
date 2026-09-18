import { keccak256, stringToBytes } from 'viem'

export function slugHash(slug: string): `0x${string}` {
  return keccak256(stringToBytes(slug))
}
