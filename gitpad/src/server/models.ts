export type TokenKind = 'canonical' | 'community' | 'unverified'

export type Repository = {
  githubId: number
  owner: string
  name: string
  fullName: string
  htmlUrl: string
  description: string
  language: string | null
  archived: boolean
  fork: boolean
  mirror: boolean
  parentFullName: string | null
  renamedFrom: string | null
  lastSeenAt: number
}

export type RepositorySnapshot = {
  githubId: number
  at: number
  stars: number
  forks: number
  watchers: number
  openIssues: number
  contributors: number
  commitsWeek: number
  stars7d: number | null
}

export type TokenRow = {
  address: string
  githubId: number
  owner: string
  name: string
  symbol: string
  displayName: string
  kind: TokenKind
  deployer: string
  deployedAt: number
  txHash?: string
  metadataURI?: string
  ipfsCid?: string
}

export type Deployment = {
  txHash: string
  token: string
  status: 'pending' | 'success' | 'reverted' | 'failed'
  error?: string
  at: number
}

export type GitHubOwner = {
  login: string
  githubId: number
  avatarUrl: string
}

export type VerifiedMaintainer = {
  githubId: number
  login: string
  repoGithubId: number
  owner: string
  name: string
  wallet: string
  treasury: string | null
  verifiedAt: number
}

export type FeeRouteRow = {
  token: string
  recipients: { to: string; bps: number; role: string }[]
  updatedAt: number
}

export type FeeDistribution = {
  token: string
  tx: string
  to: string
  role: string
  amount: string
  at: number
}

export type WatchItem = {
  wallet: string
  kind: 'repo' | 'token'
  owner?: string
  name?: string
  githubId?: number
  token?: string
  alerts: { trending: boolean; launch: boolean }
  at: number
}

export type MarketSnapshot = {
  token: string
  at: number
  priceRblx: string | null
  capRblx: string | null
  quoteReserve: string
  graduated: boolean
}

export type ActivityKind =
  | 'token_launched'
  | 'repo_claimed'
  | 'trending_detected'
  | 'fee_distributed'
  | 'rank_moved'
  | 'star_growth'
  | 'release_published'

export type ActivityEvent = {
  id: string
  kind: ActivityKind
  at: number
  title: string
  body: string
  owner?: string
  name?: string
  token?: string
  href?: string
}

export type StoreShape = {
  repositories: Repository[]
  snapshots: RepositorySnapshot[]
  tokens: TokenRow[]
  deployments: Deployment[]
  owners: GitHubOwner[]
  maintainers: VerifiedMaintainer[]
  feeRoutes: FeeRouteRow[]
  feeDistributions: FeeDistribution[]
  watchlist: WatchItem[]
  markets: MarketSnapshot[]
  activity: ActivityEvent[]
  health: {
    githubRemaining: number | null
    githubReset: number | null
    lastGithubAt: number | null
    lastIpfsError: string | null
    lastIpfsAt: number | null
    lastPonsError: string | null
  }
  indexer: {
    lastBlock: number
    processed: Record<string, true>
  }
  funnel: Record<string, number>
}

export function emptyStore(): StoreShape {
  return {
    repositories: [],
    snapshots: [],
    tokens: [],
    deployments: [],
    owners: [],
    maintainers: [],
    feeRoutes: [],
    feeDistributions: [],
    watchlist: [],
    markets: [],
    activity: [],
    health: {
      githubRemaining: null,
      githubReset: null,
      lastGithubAt: null,
      lastIpfsError: null,
      lastIpfsAt: null,
      lastPonsError: null,
    },
    indexer: { lastBlock: 0, processed: {} },
    funnel: {},
  }
}
