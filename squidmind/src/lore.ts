export const TOKEN_NAME = 'SQUIDMIND'
export const TICKER = '$SQUIDMIND'
export const SPECIES_AXON = 'Loligo pealei'
export const SPECIES_BRAIN = 'Sepioteuthis lessoniana'
export const CHAIN = 'Robinhood Chain'
export const CHAIN_ID = 4663
export const PONS_URL = 'https://pons.family'
export const PONS_APP = 'https://www.ponsfamily.com'
export const PONS_LAUNCHPAD = `${PONS_APP}/launchpad`
export const PONS_EXPLORE = PONS_LAUNCHPAD
export const EXPLORER = 'https://robinhoodchain.blockscout.com'
export const GMGN = 'https://gmgn.ai/robinhood'
export const X_HANDLE = '@opensquidmind'
export const X_URL = 'https://x.com/opensquidmind'

export const CA =
  (import.meta.env.VITE_SQUIDMIND_CA as string | undefined)?.trim() ||
  '0x5736E7E8058F69B94B276D8473aED6f42AAA1C82'
export const TX = (import.meta.env.VITE_SQUIDMIND_TX as string | undefined)?.trim() ?? ''
export const TOKEN_IMAGE =
  (import.meta.env.VITE_SQUIDMIND_IMAGE as string | undefined)?.trim() || '/token.svg'

export function ponsTokenHref() {
  return CA ? `${PONS_LAUNCHPAD}/token/${CA}` : PONS_LAUNCHPAD
}

export function dexHref() {
  return CA ? `${GMGN}/token/${CA}` : PONS_LAUNCHPAD
}

export function explorerHref() {
  return CA ? `${EXPLORER}/token/${CA}` : EXPLORER
}

export function launchTxHref() {
  return TX ? `${EXPLORER}/tx/${TX}` : ''
}

export function ponsLookHref() {
  return ponsTokenHref()
}

export const BUY = (import.meta.env.VITE_SQUIDMIND_BUY as string | undefined)?.trim() || ponsTokenHref()

export type LookPlace = 'launchpad' | 'token' | 'dex' | 'explorer'

export type LookStop = {
  id: LookPlace
  href: string
  brand: string
  nav: string
}

export function lookStops(): LookStop[] {
  if (!CA) {
    return [{ id: 'launchpad', href: PONS_LAUNCHPAD, brand: 'pons', nav: 'Explore' }]
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

export const KNOWN_PATHWAYS = 281
export const NOVEL_PATHWAYS = 145
export const TOTAL_PATHWAYS = KNOWN_PATHWAYS + NOVEL_PATHWAYS
export const AXON_COUNT = 8
export const TRIAL_COUNT = 170
export const SAMPLE_HZ = 125_000
export const NOBEL_YEAR = 1963

export const RULE_TEXT = `if chromatophore motor score > 0.82
for 3 consecutive 700 ms windows
and the selected giant axon has crossed threshold
then the squid signs $SQUIDMIND`

export const RULE_DIGEST = '7c3e9a12b4f80d61'
export const RULE_SEALED = '2026-09-11 07:11:40 UTC'

export const SOURCES = [
  {
    n: '01',
    title: 'Nobel 1963',
    kicker: 'Hodgkin / Huxley / Eccles',
    body: 'The giant axon of the squid is how the nerve impulse was measured. Sodium in, potassium out, the membrane reverses. Every number in the live panel is the Hodgkin–Huxley membrane running those equations.',
    href: 'https://www.nobelprize.org/nobel_prizes/medicine/laureates/1963/speedread.html',
    label: 'Nobel speed read',
  },
  {
    n: '02',
    title: 'SGAMP · 170 trials',
    kicker: 'PhysioNet · 8 axons',
    body: 'Single-unit recordings from eight North Atlantic squid giant axons. Membrane potential and stimulus current, 125 kHz, pulses and noisy polysynaptic currents. The trial you pick is a real record from that set.',
    href: 'https://physionet.org/content/sgamp/1.0.0/raw/',
    label: 'PhysioNet raw',
  },
  {
    n: '03',
    title: 'SGAMP methods',
    kicker: 'Paydarfar / Forger / Clay',
    body: 'Noisy inputs and on–off switching in a neuronal pacemaker. The stimulus classes on this page — pulse and PSC — are the two groups in that database.',
    href: 'https://archive.physionet.org/physiobank/database/sgamp/',
    label: 'PhysioBank entry',
  },
  {
    n: '04',
    title: 'Mesoscale connectome',
    kicker: '281 known · 145 new',
    body: 'High-resolution diffusion MRI of the reef squid brain. 281 of Young’s tracts recovered, 145 previously undescribed pathways added — most of them visual–motor, the roads that end on chromatophore lobes.',
    href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6974791/',
    label: 'Chung, Kurniawan, Marshall 2020',
  },
  {
    n: '05',
    title: 'Chromatophore motor',
    kicker: 'Colour as command',
    body: 'Each chromatophore is a pigment cell ringed by radial muscles. Motor neurons in the CNS set the flicker. Feature patches run faster than background. The skin on this page is that motor read-out.',
    href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3069962/',
    label: 'Suzuki et al. 2011',
  },
] as const

export const STEPS = [
  {
    n: '01',
    title: 'The axon was measured',
    note: '1952 · 1963',
    body: 'Hodgkin and Huxley wrote the membrane. The Nobel is the receipt. The equations on this page are those equations.',
  },
  {
    n: '02',
    title: 'Eight axons, 170 trials',
    note: 'PhysioNet SGAMP',
    body: 'The live stimulus is taken from the public giant-axon archive — pulse or noisy PSC, named aXtY, 125 kHz.',
  },
  {
    n: '03',
    title: 'The brain was tractographed',
    note: '426 pathways',
    body: '281 known connections confirmed, 145 new. Optic lobe to basal lobe to chromatophore motor. The map in the lab is that matrix.',
  },
  {
    n: '04',
    title: 'The skin was wired',
    note: 'chromatophores',
    body: 'Motor neurons open the colour cells. Frequency paints the pattern. The squid does not speak. It changes.',
  },
  {
    n: '05',
    title: 'The rule was sealed',
    note: RULE_SEALED,
    body: 'Score above 0.82 for three consecutive windows, and the selected axon must have crossed threshold. The digest is on the panel.',
  },
  {
    n: '06',
    title: 'The squid signed',
    note: 'Pons · Robinhood',
    body: 'When the membrane and the chromatophore motor cleared the line, the squid’s wallet submitted the mint. $SQUIDMIND is that click.',
  },
] as const
