import { ApiError } from './github.ts'
import { setMaintainer } from './store.ts'

function env(name: string): string {
  return (process.env[name] || '').trim()
}

export function oauthConfigured(): boolean {
  return Boolean(env('GITHUB_OAUTH_CLIENT_ID') && env('GITHUB_OAUTH_CLIENT_SECRET'))
}

export function authorizeUrl(state: string, redirect: string): string {
  const id = env('GITHUB_OAUTH_CLIENT_ID')
  if (!id) throw new ApiError(503, 'GitHub OAuth is not configured. Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET.')
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirect,
    scope: 'read:user public_repo',
    state,
  })
  return `https://github.com/login/oauth/authorize?${params}`
}

export async function exchangeCode(code: string): Promise<string> {
  const secret = env('GITHUB_OAUTH_CLIENT_SECRET')
  const id = env('GITHUB_OAUTH_CLIENT_ID')
  if (!secret || !id) throw new ApiError(503, 'GitHub OAuth is not configured.')
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: secret, code }),
  })
  const json = await res.json() as { access_token?: string; error_description?: string }
  if (!json.access_token) throw new ApiError(401, json.error_description || 'GitHub OAuth exchange failed')
  return json.access_token
}

export async function verifyRepoControl(token: string, owner: string, name: string, wallet: string) {
  const headers = {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'user-agent': 'GitPad/1.0',
  }
  const [userRes, repoRes] = await Promise.all([
    fetch('https://api.github.com/user', { headers }),
    fetch(`https://api.github.com/repos/${owner}/${name}`, { headers }),
  ])
  if (repoRes.status === 404) throw new ApiError(404, 'Repository not found')
  const user = await userRes.json() as { login?: string; id?: number }
  const repo = await repoRes.json() as {
    id?: number
    full_name?: string
    owner?: { login?: string }
    permissions?: { admin?: boolean; maintain?: boolean; push?: boolean }
    archived?: boolean
  }
  const login = user.login || ''
  const admin = Boolean(repo.permissions?.admin || repo.permissions?.maintain)
  const isOwner = (repo.owner?.login || '').toLowerCase() === login.toLowerCase()
  if (!login || (!admin && !isOwner)) {
    throw new ApiError(403, 'GitHub user is not an owner or maintainer of this repository.')
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) throw new ApiError(400, 'Connect a wallet before claiming.')
  const [own, repoName] = (repo.full_name || `${owner}/${name}`).split('/')
  const row = {
    githubId: Number(user.id || 0),
    login,
    repoGithubId: Number(repo.id || 0),
    owner: own,
    name: repoName,
    wallet,
    treasury: null as string | null,
    verifiedAt: Date.now(),
  }
  setMaintainer(row)
  return row
}
