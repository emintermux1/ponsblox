export const TOKEN_NAME = 'PAGER'
export const TICKER = '$PAGER'
export const CLAIM_HEAD = 'Play Ping Pong against Pager live.'
export const CLAIM =
  'Pager is Neuralink’s iconic MindPong monkey. We built our site around his brain data and use it as the intelligence behind the experience. Now you can literally play Ping Pong against Pager live.'

export const SPECIES = 'Macaca mulatta'
export const SPECIES_COMMON = 'rhesus macaque'
export const SUBJECT = 'Pager'
export const DEMO_NAME = 'Monkey MindPong'
export const DEMO_MONTH = 'April 2021'
export const CHAIN = 'Robinhood Chain'
export const CHAIN_ID = 4663
export const PONS_URL = 'https://pons.family'
export const PONS_APP = 'https://www.ponsfamily.com'
export const PONS_LAUNCHPAD = `${PONS_APP}/launchpad`
export const EXPLORER = 'https://robinhoodchain.blockscout.com'
export const GMGN = 'https://gmgn.ai/robinhood'

export const YT_ID = 'rsCul1sp4hQ'
export const YT_WATCH = `https://www.youtube.com/watch?v=${YT_ID}`
export const YT_EMBED = `https://www.youtube.com/embed/${YT_ID}`
export const NEURALINK_UPDATE = 'https://neuralink.com/updates/pager-plays-mindpong/'

export const CA =
  (import.meta.env.VITE_PAGER_CA as string | undefined)?.trim() ||
  '0x041f1d2de95dec809a33b4900007667e03050145'
export const TX = (import.meta.env.VITE_PAGER_TX as string | undefined)?.trim() ?? ''
export const TOKEN_IMAGE =
  (import.meta.env.VITE_PAGER_IMAGE as string | undefined)?.trim() || '/token.svg'

export function ponsTokenHref() {
  return CA ? `${PONS_LAUNCHPAD}/token/${CA}` : PONS_LAUNCHPAD
}

export function dexHref() {
  return CA ? `${GMGN}/token/${CA}` : GMGN
}

export function explorerHref() {
  return CA ? `${EXPLORER}/token/${CA}` : EXPLORER
}

export function launchTxHref() {
  return TX ? `${EXPLORER}/tx/${TX}` : ''
}

export const BUY = (import.meta.env.VITE_PAGER_BUY as string | undefined)?.trim() || ponsTokenHref()

export type LookPlace = 'launchpad' | 'token' | 'dex' | 'explorer'

export type LookStop = {
  id: LookPlace
  href: string
  brand: string
  nav: string
}

export function lookStops(): LookStop[] {
  if (!CA) {
    return [
      { id: 'launchpad', href: PONS_LAUNCHPAD, brand: 'pons', nav: 'Explore' },
      { id: 'dex', href: GMGN, brand: 'gmgn', nav: 'Trade' },
      { id: 'explorer', href: EXPLORER, brand: 'explorer', nav: 'Scan' },
    ]
  }
  return [
    { id: 'token', href: ponsTokenHref(), brand: 'pons', nav: 'Token' },
    { id: 'dex', href: dexHref(), brand: 'gmgn', nav: 'Trade' },
    { id: 'explorer', href: explorerHref(), brand: 'explorer', nav: 'Contract' },
  ]
}

export function shortCa(addr: string) {
  if (addr.length < 14) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

/** Neuralink’s public N1 Link electrode count, per implant. */
export const N1_ELECTRODES = 1024
/** Bilateral Links as stated on the MindPong update. */
export const LINK_COUNT = 2
/** Spike-count bin published for the Link decoder. */
export const BIN_MS = 25
export const TUNING_BINS = 12
export const AGE_YEARS = 9

export const RULE_TEXT = `the court stays open
while Pager’s paddle
can still meet the ball`

export const RULE_OPENED = '2026-09-11 13:26:00 UTC'

export const SOURCES = [
  {
    n: '01',
    title: 'Pager Plays MindPong',
    kicker: 'Neuralink · April 2021',
    body: 'Neuralink named him. Pager, a macaque, Links in hand and arm motor cortex — one left, one right. Wireless. A decoder turned the implant into paddle velocity. Banana smoothie through a straw.',
    href: NEURALINK_UPDATE,
    label: 'Neuralink update',
  },
  {
    n: '02',
    title: 'Monkey MindPong',
    kicker: 'LIVE · Neuralink · YouTube',
    body: 'The live feed. Nine years old. A Link on each side. Joystick first, then the stick gone, then Pong from the implant. Click it. Pager is on the court.',
    href: YT_WATCH,
    label: 'Open the live feed',
  },
] as const

