export const CA = '0x7d527484d51969e25a44cd3bf3471b675bbd2e5f'
export const BUY_URL = `https://gmgn.ai/robinhood/token/${CA}`

export function shortCa() {
  return `${CA.slice(0, 6)}…${CA.slice(-4)}`
}
