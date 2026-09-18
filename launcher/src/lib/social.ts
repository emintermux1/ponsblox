export const SITE_URL = 'https://launcher.family'
export const X_HANDLE = 'launcherfamily'
export const X_URL = 'https://x.com/launcherfamily'
export const X_AT = '@launcherfamily'

export function tweetIntent(text: string, url?: string): string {
  const next = new URL('https://twitter.com/intent/tweet')
  next.searchParams.set('text', text)
  if (url) next.searchParams.set('url', url)
  next.searchParams.set('via', X_HANDLE)
  return next.toString()
}
