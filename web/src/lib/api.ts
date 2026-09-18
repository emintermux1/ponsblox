export type TokenRow = {
  token: string
  curve: string
  name: string
  symbol: string
  logo: string
  description: string
  graduated: boolean
  phase: number
  creatorTaxBps: number
  priceRblx: string | null
  capRblx: string | null
  sellableTokens: string
}

export type FactoryStatus = {
  approved: boolean
  launchEnabled: boolean
  launchFeeEth: string
  graduationRblx: string
  maxCreatorTaxBps: number
  pairToken: string
  pairSymbol: string
}

export type IntentView = {
  code: string
  kind: 'launch' | 'trade'
  status: 'pending' | 'signed' | 'expired'
  summary: string
  signUrl: string
  expiresAt: number
  token: string | null
  txHash: string | null
  call: {
    to: string
    data: `0x${string}`
    value: string
    approveToken?: string | null
    approveSpender?: string | null
    approveAmount?: string
    functionName?: string
  }
  error?: string
}

export type Candle = { time: number; open: string; high: string; low: string; close: string; volume: string }

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { signal: AbortSignal.timeout(12_000) })
  const body = await res.json() as T & { error?: string }
  if (!res.ok) throw new Error(body.error || res.statusText)
  return body
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json() as T & { error?: string }
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}

export const api = {
  status: () => get<FactoryStatus>('/v1/status'),
  feed: () => get<{ tokens: TokenRow[] }>('/v1/feed'),
  token: (a: string) => get<TokenRow & { gmgnUrl: string }>(`/v1/token/${a}`),
  kline: (a: string, res = '5m') => get<{ candles: Candle[]; spark: { t: number; c: number }[]; gmgn: boolean }>(`/v1/kline/${a}?res=${res}`),
  quote: (token: string, side: 'buy' | 'sell', amount: string, recipient: string) =>
    get<{ tokensOutHuman: string; quoteHuman: string; tokensOut: string; quoteOut: string }>(
      `/v1/quote?token=${token}&side=${side}&amount=${encodeURIComponent(amount)}&recipient=${recipient}`,
    ),
  intent: (code: string) => get<IntentView>(`/v1/intents/${code}`),
  launchIntent: (body: Record<string, unknown>) => post<IntentView>('/v1/intents/launch', body),
  tradeIntent: (body: Record<string, unknown>) => post<IntentView>('/v1/intents/trade', body),
  confirm: (code: string, hash: string) => post<IntentView>(`/v1/intents/${code}/confirm`, { hash }),
  watch: (address: string) => post<TokenRow>('/v1/watch', { address }),
  link: (robloxUserId: string, address: string) => post<{ linked: boolean }>('/v1/link', { robloxUserId, address }),
  getLink: (robloxUserId: string) => get<{ linked: boolean; address: string | null }>(`/v1/link/${robloxUserId}`),
}
