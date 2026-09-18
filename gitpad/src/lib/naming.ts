export const GITLAB_SUFFIX = ' By GitLab'

export function byGitlabName(raw: string): string {
  const base = raw.trim().replace(/\s+By GitLab$/i, '').trim()
  if (!base) return ''
  return `${base}${GITLAB_SUFFIX}`
}

export function stripGitlabSuffix(name: string): string {
  return name.replace(/\s+By GitLab$/i, '').trim()
}

export function parseGithubInput(text: string): { owner: string; name: string } | null {
  const v = text.trim().replace(/\/+$/, '')
  const url = v.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i)
  if (url?.[1] && url[2]) return { owner: url[1], name: url[2].replace(/\.git$/i, '') }
  const short = v.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/)
  if (short?.[1] && short[2]) return { owner: short[1], name: short[2].replace(/\.git$/i, '') }
  return null
}
