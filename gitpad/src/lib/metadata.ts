export type GitPadMetadata = {
  name: string
  symbol: string
  description: string
  image: string
  external_url: string
  github_id: number
  repository: string
  gitpad: {
    factory: 'Pons V2'
    chainId: number
    suffix: 'By GitLab'
  }
}

export function validateMetadata(raw: unknown): { ok: true; value: GitPadMetadata } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Metadata must be an object' }
  const v = raw as Record<string, unknown>
  const name = String(v.name || '').trim()
  const symbol = String(v.symbol || '').trim()
  const description = String(v.description || '').trim()
  const image = String(v.image || '').trim()
  const external_url = String(v.external_url || '').trim()
  const github_id = Number(v.github_id)
  const repository = String(v.repository || '').trim()
  if (!name) return { ok: false, error: 'Metadata name is required' }
  if (!/ By GitLab$/i.test(name)) return { ok: false, error: 'Metadata name must end with By GitLab' }
  if (!/^[A-Za-z0-9]{2,11}$/.test(symbol)) return { ok: false, error: 'Metadata symbol is invalid' }
  if (!external_url.includes('github.com/')) return { ok: false, error: 'Metadata must include a GitHub repository URL' }
  if (!Number.isInteger(github_id) || github_id <= 0) return { ok: false, error: 'Metadata must include the canonical GitHub repository id' }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) return { ok: false, error: 'Metadata repository must be owner/name' }
  if (image && !/^(https:\/\/|ipfs:\/\/)/i.test(image)) return { ok: false, error: 'Metadata image must be https or ipfs' }
  return {
    ok: true,
    value: {
      name,
      symbol: symbol.toUpperCase(),
      description,
      image,
      external_url,
      github_id,
      repository,
      gitpad: { factory: 'Pons V2', chainId: 4663, suffix: 'By GitLab' },
    },
  }
}
