import { describe, expect, it } from 'vitest'
import { KITS } from './kits.ts'
import { buyLabel, launchBlocked, padLabels, pinNote } from './labels.ts'

const FALSE = /\b(solana|sol\b|bnb|base\b|raydium|graduation)\b/i

describe('padLabels', () => {
  it('has English copy for every kit with no false chain or DEX claims', () => {
    for (const kit of KITS) {
      const labels = padLabels(kit.id)
      const blob = Object.values(labels).join(' ')
      expect(blob, kit.id).not.toMatch(FALSE)
      expect(labels.submit.length).toBeGreaterThan(3)
      expect(labels.image.length).toBeGreaterThan(3)
    }
  })

  it('blocks launch until name and ticker exist', () => {
    expect(launchBlocked('', '')).toBe('Add a name and ticker to launch.')
    expect(launchBlocked('Steel', '')).toBe('Add a ticker to launch.')
    expect(launchBlocked('', 'STL')).toBe('Add a name to launch.')
    expect(launchBlocked('Steel', 'STL')).toBeNull()
  })

  it('names the real quote asset', () => {
    expect(buyLabel('robinhood')).toBe('Initial buy (ETH, optional)')
    expect(buyLabel('arc')).toBe('Initial buy (USDC, optional)')
    expect(pinNote('robinhood')).toMatch(/Pons/)
    expect(pinNote('arc')).toMatch(/Arc bonding pad/)
  })
})
