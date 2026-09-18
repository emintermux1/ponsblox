export const PRODUCT = 'OnlyFlys'
export const TAGLINE = 'The hive for house flies'
export const SPECIES = 'Musca domestica'
export const TICKER = '$ONLYFLYS'

/** Official OnlyFlys token. Display this exact string — do not checksum or substitute. */
export const CA = '0x3b85f9258751450c799a4fdb97ae121f0f2a5088'

export const BUY = `https://www.ponsfamily.com/launchpad/token/${CA}`
export const GMGN = `https://gmgn.ai/robinhood/token/${CA}`
export const EXPLORER = `https://robinhoodchain.blockscout.com/token/${CA}`

export function shortCa(addr: string) {
  if (addr.length < 14) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}
