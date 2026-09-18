import { describe, expect, it } from 'vitest'
import {
  chainFromPrompt,
  feeBps,
  kitFromPrompt,
  kitInText,
  localBuild,
  localDraft,
  localEnhance,
  nameFrom,
  parseWriteAction,
  slugFrom,
} from './write.ts'

const BAGS_PROMPT = 'Create a Launchpad on Arc testnet like bags fm that you can redirect fees to x usernames.'

describe('localEnhance', () => {
  it('rewrites the request as a fuller spec', () => {
    expect(
      localEnhance('lets create a launchpad on ARC that lets everyone launch coins and redirect fees to any x user'),
    ).toBe(
      'Build X Fees ($XFEES), a launchpad on Arc testnet. Anyone can launch a coin. Fees route to any X user the creator picks. Owner fee 1%, creator tax 0.5%.',
    )
  })

  it('names the copied template and the fee route for the bags.fm prompt', () => {
    expect(localEnhance(BAGS_PROMPT)).toBe(
      'Build X Fees ($XFEES), a launchpad on Arc testnet that copies the bags.fm create flow. Anyone can launch a coin. Fees route to X usernames the creator sets. Owner fee 1%, creator tax 0.5%.',
    )
  })

  it('is stable when pressed twice and keeps given fees', () => {
    const once = localEnhance(BAGS_PROMPT)
    expect(localEnhance(once)).toBe(once)
    expect(localEnhance('pumpfun pad on robinhood called Steel Coin with owner fee 2% and creator tax 1%')).toBe(
      'Build Steel Coin ($STEEL), a launchpad on Robinhood that copies the pump.fun create flow. Anyone can launch a coin. Owner fee 2%, creator tax 1%.',
    )
  })

  it('leaves out chain and template when the text has none', () => {
    expect(localEnhance('a pad for dogs')).toBe(
      'Build Dogs ($DOGS), a launchpad. Anyone can launch a coin. Owner fee 1%, creator tax 0.5%.',
    )
  })

  it('is empty for blank input', () => {
    expect(localEnhance('   ')).toBe('')
  })
})

describe('localBuild', () => {
  it('takes the pad from the prompt, not the first three words', () => {
    const d = localBuild(
      'lets create a launchpad on ARC that lets everyone launch coins and redirect fees to any x user',
      'pons',
      'robinhood',
    )
    expect(d.name).toBe('X Fees')
    expect(d.ticker).toBe('XFEES')
    expect(d.slug).toBe('x-fees')
    expect(d.chain).toBe('arc')
    expect(d.kit).toBe('pons')
  })

  it('reads the bags.fm kit and Arc from the prompt', () => {
    const d = localBuild(BAGS_PROMPT, 'pons', 'robinhood')
    expect(d.name).toBe('X Fees')
    expect(d.kit).toBe('bags')
    expect(d.chain).toBe('arc')
    expect(d.ownerFeeBps).toBe(100)
    expect(d.creatorFeeBps).toBe(50)
  })

  it('keeps a named kit and chain from the text', () => {
    const d = localBuild('pumpfun pad on robinhood called Steel Coin', 'custom', 'arc')
    expect(d.name).toBe('Steel Coin')
    expect(d.ticker).toBe('STEEL')
    expect(d.kit).toBe('pumpfun')
    expect(d.chain).toBe('robinhood')
  })

  it('builds from an enhanced spec', () => {
    const d = localBuild(localEnhance('pumpfun pad on robinhood called Steel Coin with owner fee 2%'), 'pons', 'arc')
    expect(d.name).toBe('Steel Coin')
    expect(d.kit).toBe('pumpfun')
    expect(d.chain).toBe('robinhood')
    expect(d.ownerFeeBps).toBe(200)
    expect(d.creatorFeeBps).toBe(50)
  })

  it('is empty for blank input', () => {
    expect(localDraft('   ')).toEqual({ name: '', ticker: '', description: '' })
  })
})

describe('nameFrom', () => {
  it('skips create-a-launchpad filler', () => {
    expect(nameFrom('lets create a launchpad')).toBe('Pad')
  })

  it('does not use kit words like bags fm as the name', () => {
    expect(nameFrom(BAGS_PROMPT)).toBe('X Fees')
    expect(nameFrom('launchpad like bags fm on Arc testnet for dogs')).toBe('Dogs')
    expect(nameFrom('Build Steel Coin ($STEEL), a launchpad on Robinhood.')).toBe('Steel Coin')
  })
})

describe('slugFrom', () => {
  it('makes a live slug', () => {
    expect(slugFrom('X Fees')).toBe('x-fees')
    expect(slugFrom('app')).toBe('app-pad')
  })
})

describe('feeBps', () => {
  it('reads bps, percents and caps at 1000', () => {
    expect(feeBps(100, 1)).toBe(100)
    expect(feeBps(0.5, 1)).toBe(50)
    expect(feeBps('1%', 1)).toBe(100)
    expect(feeBps('250', 1)).toBe(250)
    expect(feeBps(5000, 1)).toBe(1000)
    expect(feeBps(undefined, 7)).toBe(7)
    expect(feeBps('nope', 7)).toBe(7)
  })
})

describe('prompt picks', () => {
  it('reads chain and kit from the text', () => {
    expect(chainFromPrompt('on ARC please', 'robinhood')).toBe('arc')
    expect(kitFromPrompt('copy believe', 'pons')).toBe('app')
    expect(kitInText('no kit here')).toBeNull()
    expect(parseWriteAction('enhance')).toBe('enhance')
    expect(parseWriteAction('nope')).toBe('build')
  })
})
