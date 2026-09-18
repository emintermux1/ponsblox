import { byGitlabName } from './naming.ts'

export type ShareLayout = 'launch' | 'trending' | 'minimal' | 'daily' | 'square' | 'og'

export type ShareFormat = 'x' | 'square' | 'og'

export function layoutForFormat(format: ShareFormat): ShareLayout {
  switch (format) {
    case 'x': return 'launch'
    case 'square': return 'square'
    case 'og': return 'og'
    default: {
      const _e: never = format
      return _e
    }
  }
}

export function shareOgSrc(input: {
  layout: ShareLayout
  title: string
  ticker?: string
  repo?: string
  stars?: string
  contract?: string
  rank?: string
}): string {
  const qs = new URLSearchParams({
    layout: input.layout,
    title: input.title,
    ticker: input.ticker || '',
    repo: input.repo || '',
    stars: input.stars || '',
    contract: input.contract || '',
  })
  if (input.rank) qs.set('rank', input.rank)
  return `/api/og?${qs}`
}

export function defaultLaunchPost(input: {
  displayName: string
  symbol: string
  owner: string
  repo: string
  token: string
  stars?: number | null
}): string {
  const name = byGitlabName(input.displayName)
  const base = input.displayName.replace(/\s+By GitLab$/i, '').trim() || name
  const stars = input.stars != null
    ? `\n${input.stars.toLocaleString('en-US')} GitHub stars.`
    : ''
  return [
    `${base} is now live on GitPad.`,
    `${name} $${input.symbol.toUpperCase()}`,
    `Paired with: ${input.owner}/${input.repo}.${stars}`,
    `CA: ${input.token}`,
  ].join('\n')
}
