import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { getAddress } from 'viem'
import {
  ARC_EXPLORER,
  ARC_TESTNET_CHAIN_ID,
  GMGN_URL,
  LAUNCHER_TOKEN_ARC,
  LAUNCHER_TOKEN_ARC_SHORT,
  LAUNCHER_TOKEN_ARC_URL,
  PONS_TOKEN_URL,
  ROBINHOOD_CHAIN_ID,
  chainFromNumeric,
  chainLabel,
  explorerAddress,
  explorerApiTx,
  factoryFor,
  numericChainId,
  quoteAsset,
  registryFor,
  shortAddress,
} from './chain.ts'

const UI_SOURCES = [
  'chain.ts',
  '../components/Nav.tsx',
  '../components/Footer.tsx',
  '../components/OfficialCa.tsx',
  '../components/XLink.tsx',
  '../pages/Docs.tsx',
  '../pages/Tenant.tsx',
  '../lib/copy.ts',
  '../lib/social.ts',
] as const

describe('chain', () => {
  it('keeps official ids and quote assets', () => {
    expect(numericChainId('robinhood')).toBe(ROBINHOOD_CHAIN_ID)
    expect(numericChainId('arc')).toBe(ARC_TESTNET_CHAIN_ID)
    expect(chainLabel('arc')).toBe('Arc testnet')
    expect(quoteAsset('robinhood')).toBe('ETH')
    expect(quoteAsset('arc')).toBe('USDC')
    expect(chainFromNumeric(ARC_TESTNET_CHAIN_ID)).toBe('arc')
    expect(chainFromNumeric(ROBINHOOD_CHAIN_ID)).toBe('robinhood')
  })

  it('uses the live Robinhood factory', () => {
    expect(factoryFor('robinhood')).toBe('0x97a23452EB9FaB5D0e886335B3D7E098D906F3c9')
    expect(registryFor('robinhood')).toBe('0xc801579C373832BAB4F2cB9c90d3582E3927938E')
    expect(factoryFor('arc')).toBe('0x7800BBDb5253f6fC4BCbe7B88C8745a62eD6cCcb')
    expect(registryFor('arc')).toBe('0x5d5AA1024f8fAff21A837BfC1c69f571e52367Df')
    expect(explorerApiTx('arc', '0xabc')).toBe('https://testnet.arcscan.app/api/v2/transactions/0xabc')
  })

  it('builds Pons and GMGN links for a launched token', () => {
    const sample = '0x0000000000000000000000000000000000000001'
    expect(PONS_TOKEN_URL(sample)).toBe(
      `https://www.ponsfamily.com/launchpad/token/${sample}`,
    )
    expect(GMGN_URL(sample)).toBe(`https://gmgn.ai/robinhood/token/${sample}`)
  })

  it('publishes the live Arc LAUNCHER token CA', () => {
    const raw = '0x6068d35dadd947cab962b2f3fa7020c263b70e3b'
    expect(LAUNCHER_TOKEN_ARC).toBe(getAddress(raw))
    expect(LAUNCHER_TOKEN_ARC_SHORT).toBe(shortAddress(LAUNCHER_TOKEN_ARC))
    expect(LAUNCHER_TOKEN_ARC_URL).toBe(`${ARC_EXPLORER}/address/${LAUNCHER_TOKEN_ARC}`)
    expect(explorerAddress('arc', LAUNCHER_TOKEN_ARC)).toBe(LAUNCHER_TOKEN_ARC_URL)
    expect(LAUNCHER_TOKEN_ARC_URL).toBe(
      `https://testnet.arcscan.app/address/${LAUNCHER_TOKEN_ARC}`,
    )
  })

  it('shows the Arc CA on product chrome, not tenant pads', () => {
    const root = dirname(fileURLToPath(import.meta.url))
    const chain = readFileSync(join(root, 'chain.ts'), 'utf8')
    expect(chain).toContain("getAddress('0x6068d35dadd947cab962b2f3fa7020c263b70e3b')")
    expect(chain.toLowerCase()).toContain('0x6068d35dadd947cab962b2f3fa7020c263b70e3b')
    for (const rel of ['../components/OfficialCa.tsx', '../components/Nav.tsx', '../components/Footer.tsx', '../pages/Docs.tsx']) {
      const text = readFileSync(join(root, rel), 'utf8')
      expect(text, rel).toMatch(/OfficialCa|LAUNCHER_TOKEN_ARC/)
    }
    const tenant = readFileSync(join(root, '../pages/Tenant.tsx'), 'utf8')
    expect(tenant).not.toContain('OfficialCa')
    expect(tenant).not.toContain('LAUNCHER_TOKEN_ARC')
  })

  it('does not republish the removed Robinhood CA', () => {
    const root = dirname(fileURLToPath(import.meta.url))
    const removed = 'f754e6868491e05132bba4e95338848e48d21edd'
    for (const rel of UI_SOURCES) {
      const text = readFileSync(join(root, rel), 'utf8').toLowerCase()
      expect(text, rel).not.toContain(removed)
    }
  })
})
