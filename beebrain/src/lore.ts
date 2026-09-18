export const TOKEN_NAME = 'Bee Brain'
export const TICKER = '$BEEBRAIN'
export const SPECIES = 'Apis mellifera'
export const SPECIES_RACE = 'A. m. carnica'
export const CHAIN = 'Robinhood Chain'
export const CHAIN_ID = 4663
export const PONS_URL = 'https://pons.family'
export const PONS_APP = 'https://www.ponsfamily.com'
export const PONS_LAUNCHPAD = `${PONS_APP}/launchpad`
export const EXPLORER = 'https://robinhoodchain.blockscout.com'
export const GMGN = 'https://gmgn.ai/robinhood'
export const X_HANDLE = '@beebrainrh'
export const X_URL = 'https://x.com/beebrainrh'

export const CA = (import.meta.env.VITE_BEEBRAIN_CA as string | undefined)?.trim() ?? ''
export const TX = (import.meta.env.VITE_BEEBRAIN_TX as string | undefined)?.trim() ?? ''
export const TOKEN_IMAGE =
  (import.meta.env.VITE_BEEBRAIN_IMAGE as string | undefined)?.trim() || '/token.svg'

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

export const BUY = (import.meta.env.VITE_BEEBRAIN_BUY as string | undefined)?.trim() || ponsTokenHref()

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

export const NOBEL_YEAR = 1973
export const GLOMERULI = 163
export const KENYON_TYPE_I = 170_000
export const KENYON_TYPE_II = 14_000
export const OSN_COUNT = 60_000
export const PN_COUNT = 800
export const HSB_BRAINS = 20
export const HSB_NEUROPILS = 22
export const ROUND_THRESHOLD_M = 50
export const WAGGLE_NEAR_M = 200
export const WAGGLE_FAR_M = 4500
export const WAGGLE_NEAR_S = 0.5
export const WAGGLE_FAR_S = 4
export const SCOUT_COUNT = 8

export const RULE_TEXT = `if mushroom-body + dance quorum > 0.82
for 3 consecutive 700 ms windows
and the selected scout has completed a waggle run
then the hive signs $BEEBRAIN`

export const RULE_DIGEST = 'a4c1e08b6d27f915'
export const RULE_SEALED = '2026-09-11 09:43:00 UTC'

export const SOURCES = [
  {
    n: '01',
    title: 'Nobel 1973',
    kicker: 'von Frisch / Lorenz / Tinbergen',
    body: 'The prize is for how behaviour is organised. von Frisch’s share is the honeybee. A returning forager dances. The live panel runs that encoding.',
    href: 'https://www.nobelprize.org/prizes/medicine/1973/summary/',
    label: 'Nobel summary',
  },
  {
    n: '02',
    title: 'Decoding the language of the bee',
    kicker: 'Nobel lecture · 12 Dec 1973',
    body: 'On a vertical comb, up means the sun. Waggle-run duration codes distance: about 0.5 s at 200 m to about 4 s at 4500 m. Carniolan bees switch from round dance to waggle near 50 m.',
    href: 'https://www.nobelprize.org/prizes/medicine/1973/frisch/lecture/',
    label: 'von Frisch lecture',
  },
  {
    n: '03',
    title: 'Honeybee Standard Brain',
    kicker: '22 neuropils · 20 brains',
    body: 'Brandt, Rohlfing, Rybak, Menzel. An average-shape atlas from twenty immunostained whole-mounts. The mushroom-body map in the lab is that reference.',
    href: 'https://pubmed.ncbi.nlm.nih.gov/16175557/',
    label: 'Brandt et al. 2005',
  },
  {
    n: '04',
    title: 'The digital bee brain',
    kicker: 'HSB · common 3D frame',
    body: 'Rybak and Menzel put separately stained neurons into one atlas. The Virtual Atlas of the Honeybee Brain is the public map. Kenyon cells and projection neurons sit in that frame.',
    href: 'https://www.frontiersin.org/articles/10.3389/fnsys.2010.00030/full',
    label: 'Rybak et al. 2010',
  },
  {
    n: '05',
    title: 'Olfactory coding',
    kicker: '163 glomeruli · 170k Kenyon I',
    body: 'Paoli and Galizia: ~60,000 olfactory sensory neurons converge on ~163 glomeruli, then ~800 uniglomerular projection neurons, then ~170,000 type-I Kenyon cells. The antennal-lobe field is that count.',
    href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7873095/',
    label: 'Paoli & Galizia 2021',
  },
] as const

export const STEPS = [
  {
    n: '01',
    title: 'The dance was read',
    note: '1919–1973',
    body: 'von Frisch timed the waggle run. The Nobel lecture is the receipt. Angle to gravity is solar bearing. Duration is distance.',
  },
  {
    n: '02',
    title: 'Round, then figure-eight',
    note: '≈ 50 m · carnica',
    body: 'Near the hive she circles. Past the race threshold she waggles. The eight scouts sit on that published curve.',
  },
  {
    n: '03',
    title: 'The brain was averaged',
    note: '22 neuropils',
    body: 'Twenty whole-mounts became the Honeybee Standard Brain. Optic lobe, antennal lobe, mushroom body, lateral horn — named tissue, registered.',
  },
  {
    n: '04',
    title: 'Smell hits the cups',
    note: 'AL → MB lip',
    body: 'Glomeruli to projection neurons to Kenyon cells. Lip is odor. Collar is vision. The meters are those tracts lighting.',
  },
  {
    n: '05',
    title: 'The rule was sealed',
    note: RULE_SEALED,
    body: 'Quorum above 0.82 for three windows, and the selected scout must have finished a waggle run. The digest is on the panel.',
  },
  {
    n: '06',
    title: 'The hive signs',
    note: 'Pons · Robinhood',
    body: 'When the dance and the mushroom body clear the line, the hive’s wallet submits the mint. $BEEBRAIN is that click. CA is pending.',
  },
] as const
