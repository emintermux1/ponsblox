import type { SupportedChain } from './chain.ts'
import type { KitId } from './kits.ts'

export type PadLabels = {
  nav: string
  title: string
  name: string
  namePh: string
  ticker: string
  tickerPh: string
  desc: string
  descPh: string
  image: string
  buy: string
  submit: string
}

export function padLabels(kit: KitId): PadLabels {
  switch (kit) {
    case 'pons':
      return {
        nav: 'Launch',
        title: 'Launch token',
        name: 'Name',
        namePh: 'Token name',
        ticker: 'Ticker',
        tickerPh: 'SYMBOL',
        desc: 'Description',
        descPh: 'A short description of the token',
        image: 'Choose image',
        buy: 'Developer buy',
        submit: 'Launch token',
      }
    case 'pumpfun':
      return {
        nav: 'Home',
        title: 'Create new coin',
        name: 'Coin name',
        namePh: 'Name your coin',
        ticker: 'Ticker',
        tickerPh: 'Add a coin ticker',
        desc: 'Description (optional)',
        descPh: 'Write a short description',
        image: 'Select image',
        buy: 'Buy',
        submit: 'Create coin',
      }
    case 'bags':
      return {
        nav: 'Launch',
        title: 'Launch a coin',
        name: 'Name',
        namePh: 'coin name',
        ticker: 'Ticker',
        tickerPh: 'ticker',
        desc: 'Description',
        descPh: 'Enter a description for the coin',
        image: 'Choose image',
        buy: 'Buy',
        submit: 'Continue',
      }
    case 'app':
      return {
        nav: 'Launch',
        title: "What's your project?",
        name: 'Project name',
        namePh: 'Project name',
        ticker: 'Ticker',
        tickerPh: 'TICKER',
        desc: 'Project description',
        descPh: 'Tell us about your project',
        image: 'Coin image',
        buy: 'Initial buy',
        submit: 'Launch project',
      }
    case 'flap':
      return {
        nav: 'Launch',
        title: 'Create token',
        name: 'Token name',
        namePh: 'Token name',
        ticker: 'Token symbol',
        tickerPh: 'SYMBOL',
        desc: 'Token description',
        descPh: 'Token description',
        image: 'Coin image',
        buy: 'Initial buy',
        submit: 'Create token',
      }
    case 'four':
      return {
        nav: 'Launch',
        title: 'Create token',
        name: 'Token name',
        namePh: 'Your coin name',
        ticker: 'Ticker symbol',
        tickerPh: 'Your coin symbol',
        desc: 'Description',
        descPh: 'A short description of your project',
        image: 'Coin image',
        buy: 'Initial buy',
        submit: 'Create token',
      }
    case 'long':
      return {
        nav: 'Create',
        title: 'Create',
        name: 'Name',
        namePh: 'Name',
        ticker: 'Ticker',
        tickerPh: 'TICKER',
        desc: 'Description',
        descPh: 'Description',
        image: 'Coin image',
        buy: 'Initial buy',
        submit: 'Create',
      }
    case 'custom':
      return {
        nav: 'Create',
        title: 'Create',
        name: 'Name',
        namePh: 'Name',
        ticker: 'Ticker',
        tickerPh: 'TICKER',
        desc: 'Description',
        descPh: 'Description',
        image: 'Coin image',
        buy: 'Initial buy',
        submit: 'Create',
      }
    default: {
      const _n: never = kit
      return _n
    }
  }
}

export function buyLabel(chain: SupportedChain): string {
  switch (chain) {
    case 'robinhood':
      return 'Initial buy (ETH, optional)'
    case 'arc':
      return 'Initial buy (USDC, optional)'
    default: {
      const _n: never = chain
      return _n
    }
  }
}

export function launchBlocked(name: string, ticker: string): string | null {
  const n = name.trim()
  const t = ticker.trim()
  if (!n && !t) return 'Add a name and ticker to launch.'
  if (!n) return 'Add a name to launch.'
  if (!t) return 'Add a ticker to launch.'
  return null
}

export function pinNote(chain: SupportedChain): string {
  switch (chain) {
    case 'robinhood':
      return 'Image is pinned to Pinata. Name, ticker, description, and image URL are written on Pons.'
    case 'arc':
      return 'Image is pinned to Pinata. Only name and ticker are stored on the Arc bonding pad.'
    default: {
      const _n: never = chain
      return _n
    }
  }
}
