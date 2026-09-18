export type DataSource = 'github' | 'onchain' | 'market' | 'calculated'

const COPY: Record<DataSource, { label: string; title: string }> = {
  github: { label: 'GitHub', title: 'GitHub API, cached on GitPad.' },
  onchain: { label: 'Onchain', title: 'Pons V2 on Robinhood Chain.' },
  market: { label: 'Market', title: 'Bitquery market indexer.' },
  calculated: { label: 'Trend', title: 'Trend score from velocity, recency, and activity.' },
}

export function SourceLabel({ source }: { source: DataSource }) {
  const row = COPY[source]
  return <span className="src" title={row.title}>{row.label}</span>
}
