export const TOKEN_NAME = 'GPU'
export const TICKER = '$GPU'
export const FULL_NAME = 'Gooner Processing Unit'
export const PAIR = '$NVDA'
export const CHAIN = 'Solana'
export const DESK = 'otcdesks.cash'
export const X_HANDLE = '@GPUcoinOTC'
export const X_URL = 'https://x.com/GPUcoinOTC'
export const OTC_HANDLE = '@otc_labs'
export const BUY_URL = 'https://otcdesks.cash/'
export const CA = '5U2K8v86zd64XT6xTzFuSH54wKCejQgugDDPyPE3PLvJ'

export const LINE_AI = 'NVIDIA built the chips powering the AI era.'
export const LINE_US = 'We built the chip powering the gooner era.'
export const MEET = `Meet ${TICKER}, the ${FULL_NAME}.`
export const PROCESSOR = 'The first processor made for traders running on leverage and zero sleep.'
export const PAIR_LINE = `${TICKER} is paired with ${PAIR} via ${OTC_HANDLE}.`
export const TAGLINE = 'Max performance. Minimum intelligence.'
export const ERA = 'The chip powering the gooner era on Solana.'

export const SPECS = [
  { k: 'ARCH', v: 'GOONER' },
  { k: 'PAIR', v: PAIR },
  { k: 'CHAIN', v: 'SOLANA' },
  { k: 'CLOCK', v: '0 SLEEP' },
  { k: 'TDP', v: 'MAX PERF' },
  { k: 'DESK', v: 'OTC LABS' },
] as const

export const FACTS = [
  {
    n: '01',
    title: 'The AI era',
    body: LINE_AI,
  },
  {
    n: '02',
    title: 'The gooner era',
    body: LINE_US,
  },
  {
    n: '03',
    title: 'The processor',
    body: PROCESSOR,
  },
  {
    n: '04',
    title: 'The pair',
    body: PAIR_LINE,
  },
] as const

export const STEPS = [
  { n: '01', title: 'Wallet on Solana', body: 'Connect a Solana wallet. Gas is SOL.' },
  { n: '02', title: 'Open the desk', body: 'Go to otcdesks.cash.' },
  { n: '03', title: 'Find the NVDA pair', body: `${TICKER} opens as an NVIDIA pair.` },
  { n: '04', title: 'Plug in', body: `${TAGLINE} ${ERA}` },
] as const
