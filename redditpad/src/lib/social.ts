export const SITE_URL = 'https://redditpad.family'
export const X_HANDLE = 'redditpad'
export const X_URL = 'https://x.com/redditpad'
export const X_AT = '@redditpad'

export function pairShareUrl(ticker: string, origin = typeof window === 'undefined' ? SITE_URL : window.location.origin): string {
  return `${origin}/p/${encodeURIComponent(ticker.toLowerCase())}`
}

export function tweetIntent(text: string, url: string): string {
  const next = new URL('https://twitter.com/intent/tweet')
  next.searchParams.set('text', text)
  next.searchParams.set('url', url)
  next.searchParams.set('via', X_HANDLE)
  return next.toString()
}

export function sharePairIntent(name: string, ticker: string, origin?: string): string {
  const url = pairShareUrl(ticker, origin)
  return tweetIntent(`${name} $${ticker} / $RDDT on RedditPad`, url)
}
