export const SITE_URL = 'https://longer.family'
export const X_HANDLE = '@longerfamily'
export const X_URL = 'https://x.com/longerfamily'
export const LONGER_TICKER = '$LONGER'
export const LONGER_SYMBOL = 'LONGER'

/** Official LONGER token on Pons V2, Robinhood Chain 4663. Exact CA — do not checksum or substitute. */
export const LONGER_OFFICIAL_TOKEN = '0x600e8d89a412a0739f21139b340fde91e475edcc'

export const DEFAULT_TOKEN_ART = `${SITE_URL}/logo`

export const PONS_LAUNCHPAD_TOKEN = (ca: string) =>
  `https://www.ponsfamily.com/launchpad/token/${ca}`

export const GMGN_TOKEN = (ca: string) => `https://gmgn.ai/robinhood/token/${ca}`

export const LONGER_BUY_URL = PONS_LAUNCHPAD_TOKEN(LONGER_OFFICIAL_TOKEN)
export const LONGER_GMGN_URL = GMGN_TOKEN(LONGER_OFFICIAL_TOKEN)
export const LONGER_EXPLORER_URL = `https://robinhoodchain.blockscout.com/token/${LONGER_OFFICIAL_TOKEN}`

export function isOfficialToken(address: string): boolean {
  return address.toLowerCase() === LONGER_OFFICIAL_TOKEN.toLowerCase()
}

export function isPublicImage(value: string): boolean {
  const v = value.trim()
  if (!v || v.startsWith('blob:') || v.startsWith('data:')) return false
  return /^(https:\/\/|ipfs:\/\/)/i.test(v)
}

export function publicTokenImage(value: string): string {
  const v = value.trim()
  return isPublicImage(v) ? v : DEFAULT_TOKEN_ART
}

export function shareIntentUrl(text: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`
}
