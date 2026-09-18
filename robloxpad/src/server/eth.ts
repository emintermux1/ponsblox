let cached: { n: number; at: number } | null = null

export async function fetchEthUsd(): Promise<number | null> {
  if (cached && Date.now() - cached.at < 60_000) return cached.n
  try {
    const res = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot')
    const json = await res.json() as { data?: { amount?: string } }
    const n = Number(json.data?.amount)
    if (Number.isFinite(n)) {
      cached = { n, at: Date.now() }
      return n
    }
  } catch {
    /* optional quote for token USD display */
  }
  return cached?.n ?? null
}
