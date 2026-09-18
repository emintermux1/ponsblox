export const TOKEN_NAME = 'FlyHub'
export const TICKER = '$FLYHUB'
export const SPECIES = 'Musca domestica'
export const SPECIES_MODEL = 'Drosophila melanogaster'
export const CHAIN = 'Robinhood Chain'
export const CHAIN_ID = 4663
export const PONS_URL = 'https://pons.family'
export const PONS_APP = 'https://www.ponsfamily.com'
export const PONS_LAUNCHPAD = `${PONS_APP}/launchpad`
export const EXPLORER = 'https://robinhoodchain.blockscout.com'
export const GMGN = 'https://gmgn.ai/robinhood'
export const X_HANDLE = '@openflyhub'
export const X_URL = 'https://x.com/openflyhub'

export const CA = ''
export const TX = ''
export const TOKEN_IMAGE =
  (import.meta.env.VITE_FLYHUB_IMAGE as string | undefined)?.trim() || '/logo.png'

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

export const BUY = (import.meta.env.VITE_FLYHUB_BUY as string | undefined)?.trim() || ponsTokenHref()

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

/** Scheffer et al. 2020 hemibrain reconstructed neurons. */
export const HEMIBRAIN_NEURONS = 21_662
/** ~20 million synapses in the published hemibrain volume. */
export const HEMIBRAIN_SYNAPSES = 20_000_000
/** Adult Drosophila brain neuron order of magnitude. */
export const FLY_BRAIN_NEURONS = 100_000
export const NOBEL_YEAR = 2017
/** Musca domestica ommatidia per compound eye, typical range. */
export const MUSCA_OMMATIDIA = 3400
/** Drosophila ommatidia per eye. */
export const DROS_OMMATIDIA = 750
/** House-fly clutch: 75–150 eggs per oviposition bout. */
export const CLUTCH_MIN = 75
export const CLUTCH_MAX = 150
export const BATCHES_LIFETIME = 6
export const HABITAT_COUNT = 8
export const SCORE_LINE = 0.82

export const RULE_TEXT = `if swarm density + clutch rate + optic drive > 0.82
for 3 consecutive 700 ms windows
and the selected site has dropped a clutch
then the fly signs $FLYHUB`

export const RULE_DIGEST = 'c91b2e74a0d58f13'
export const RULE_SEALED = '2026-09-11 12:36:00 UTC'

export const SOURCES = [
  {
    n: '01',
    title: 'Nobel 2017',
    kicker: 'Hall / Rosbash / Young',
    body: 'The clock is a gene loop in a fly. period transcribes, TIM binds, the protein eats its own message. Every night the board resets. The live panel’s optic drive rides that circadian paper, not a vibe.',
    href: 'https://www.nobelprize.org/prizes/medicine/2017/press-release/',
    label: 'Nobel press',
  },
  {
    n: '02',
    title: 'period mutants',
    kicker: 'Konopka & Benzer · 1971',
    body: 'Three alleles of one locus: short day, long day, arrhythmic. Drosophila eclosion and locomotor clocks broke in a single gene. That is the receipt the 2017 prize cashed.',
    href: 'https://www.pnas.org/doi/10.1073/pnas.68.9.2112',
    label: 'PNAS 1971',
  },
  {
    n: '03',
    title: 'Janelia hemibrain',
    kicker: '21,662 neurons · ~20M synapses',
    body: 'Scheffer et al. reconstructed a female Drosophila hemibrain at synaptic resolution. Named neuropils, typed cells, the connectome the lab map sits on. Not a house-fly volume — the published fly brain.',
    href: 'https://elifesciences.org/articles/57443',
    label: 'Scheffer 2020',
  },
  {
    n: '04',
    title: 'Virtual Fly Brain',
    kicker: 'named neuropils · public atlas',
    body: 'Lamina, medulla, lobula, lobula plate, mushroom body, antennal lobe — the same names the hemibrain uses. The meters are those tissues lighting, not made-up lobes.',
    href: 'https://www.virtualflybrain.org/',
    label: 'VFB atlas',
  },
  {
    n: '05',
    title: 'Musca clutch',
    kicker: '75–150 eggs · 5–6 batches',
    body: 'House flies oviposit in wet organic mess. A bout drops on the order of a hundred eggs. Hatch in hours, larva boom in days, adults in a week. Spread is biology. The trays count that.',
    href: 'https://www.cdc.gov/flies/about/index.html',
    label: 'CDC house flies',
  },
] as const

export const STEPS = [
  {
    n: '01',
    title: 'The clock was a fly gene',
    note: '1971 · 2017',
    body: 'Konopka found period. Hall, Rosbash, Young boxed the loop. Nobel 2017 is the stamp. The fly already ran a server.',
  },
  {
    n: '02',
    title: 'The brain was sliced',
    note: '21,662 cells',
    body: 'Janelia’s hemibrain is a real volume. Optic neuropil is the porn of this site: compound eye in, motor out.',
  },
  {
    n: '03',
    title: 'She dumps a clutch',
    note: '75–150 eggs',
    body: 'Musca does not ask. Wet protein, a hundred eggs, another batch in days. The observatory watches that multiply.',
  },
  {
    n: '04',
    title: 'Larva eat the site',
    note: 'hours → days',
    body: 'Maggots turn a dump into biomass. Pupae harden. Adults walk out already horny for the next tray.',
  },
  {
    n: '05',
    title: 'The rule was sealed',
    note: RULE_SEALED,
    body: 'Swarm + clutch + optic above 0.82 for three windows, and the selected site must have oviposited. Digest on the panel.',
  },
  {
    n: '06',
    title: 'The fly signs',
    note: 'Pons · Robinhood',
    body: 'When the bloom clears the line, the fly’s wallet submits the mint. $FLYHUB is that click. CA next.',
  },
] as const
