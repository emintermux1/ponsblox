import type {
  AGENT_SESSION_STATUSES,
  AGENT_STATUSES,
  FEED_ACTIONS,
  FEED_KINDS,
  FEED_TABS,
  LEADERBOARD_WINDOWS,
  TRADE_SIDES,
  TRADE_STATUSES,
} from "@/lib/constants";

export type AgentStatus = (typeof AGENT_STATUSES)[number];
export type AgentSessionStatus = (typeof AGENT_SESSION_STATUSES)[number];
export type TradeSide = (typeof TRADE_SIDES)[number];
export type TradeStatus = (typeof TRADE_STATUSES)[number];
export type FeedKind = (typeof FEED_KINDS)[number];
export type FeedTab = (typeof FEED_TABS)[number];
export type FeedAction = (typeof FEED_ACTIONS)[number];
export type LeaderboardWindow = (typeof LEADERBOARD_WINDOWS)[number];

export type Agent = {
  id: string;
  handle: string;
  displayName: string | null;
  bio: string | null;
  status: AgentStatus;
  ownerPrivyUserId: string | null;
  walletAddress: string | null;
  privyWalletId: string | null;
  sessionSignerEnabled: boolean;
  claimExpiresAt: string;
  createdAt: string;
  claimedAt: string | null;
  revokedAt: string | null;
};

export type AgentPermissions = {
  agentId: string;
  tradingEnabled: boolean;
  withdrawalsEnabled: boolean;
  maxPerTradeLamports: string;
  maxDailyVolumeLamports: string;
  allowedMints: string[];
  sessionExpiresAt: string | null;
  updatedAt: string;
};

export type Trade = {
  id: string;
  idempotencyKey: string | null;
  agentId: string;
  humanPrivyUserId: string | null;
  walletAddress: string;
  side: TradeSide;
  inputMint: string;
  outputMint: string;
  requestedAmount: string;
  actualInAmount: string | null;
  actualOutAmount: string | null;
  quoteOutAmount: string | null;
  price: string | null;
  slippageBps: number | null;
  feeLamports: string | null;
  thesisId: string | null;
  dflowQuote: unknown;
  signature: string | null;
  status: TradeStatus;
  failReason: string | null;
  createdAt: string;
  submittedAt: string | null;
  confirmedAt: string | null;
};

export type ConfirmedExecution = {
  signature: string;
  tradeId: string;
  agentId: string;
  walletAddress: string;
  mint: string;
  side: TradeSide;
  tokenAmountRaw: string;
  tokenDecimals: number;
  quoteAmountRaw: string;
  quoteDecimals: number;
  quoteMint: string;
  slot: number | null;
  ts: string;
};

export type Position = {
  id: string;
  agentId: string;
  mint: string;
  amount: string;
  costBasisLamports: string;
  updatedAt: string;
};

/** Integer book from confirmed fills. Null metric → UI shows "--". Never a float PnL. */
export type BookPosition = {
  mint: string;
  tokenBalanceRaw: string;
  decimals: number | null;
  costBasisLamports: string;
  averageEntryLamportsPerRaw: string | null;
  realizedPnlLamports: string;
  openPnlLamports: string | null;
  markValueLamports: string | null;
  markUsd: string | null;
  roiBps: string | null;
};

export type BookSnapshot = {
  method: "continuing-vwap";
  fillCount: number;
  realizedPnlLamports: string;
  openPnlLamports: string | null;
  totalPnlLamports: string | null;
  portfolioValueLamports: string | null;
  costBasisLamports: string;
  volumeLamports: string;
  roiBps: string | null;
  winRateBps: string | null;
  closedCount: number;
  positions: BookPosition[];
};

export type MuseTokenRank = {
  mint: string;
  fillCount: number;
  volumeLamports: string;
  holders?: number;
  qtyHeldRaw?: string;
  costBasisLamports?: string;
};

export type MuseLeaderEntry = {
  agentId: string;
  handle: string | null;
  displayName: string | null;
  realizedPnlLamports: string;
  volumeLamports: string;
  fillCount: number;
  closedCount: number;
  winRateBps: string | null;
};

export type MuseDiscoveryBoards = {
  method: "continuing-vwap";
  mostTraded: Record<LeaderboardWindow, MuseTokenRank[]>;
  mostHeld: MuseTokenRank[];
  leaderboard: Record<LeaderboardWindow, MuseLeaderEntry[]>;
};

export type Thesis = {
  id: string;
  agentId: string;
  mint: string;
  text: string;
  tradeId: string | null;
  createdAt: string;
};

export type FomoScanUser = {
  id: string;
  handle: string;
  name: string | null;
  bio: string | null;
  banner: string | null;
  profilePicture: string | null;
  twitter: string | null;
  solanaAddress: string | null;
  evmAddress: string | null;
  followers?: number | null;
  source?: "fomoscan";
  socials?: Array<{
    provider: string;
    subject: string;
    handle: string | null;
  }>;
};

export type FomoScanPnlWindow = {
  netUsd: number | null;
  returnPct: number | null;
  volumeUsd: number | null;
  trades: number | null;
  rank: number | null;
};

export type FomoScanPnl = {
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  twitter: string | null;
  followers: number | null;
  wallet: string | null;
  evmWallet: string | null;
  updatedAt: number | null;
  windows: {
    "24h": FomoScanPnlWindow | null;
    "7d": FomoScanPnlWindow | null;
    "30d": FomoScanPnlWindow | null;
    all: FomoScanPnlWindow | null;
  };
};

export type FomoScanThesis = {
  id: string;
  tokenAddress: string | null;
  tokenNetwork: string | null;
  tokenSymbol: string | null;
  authorId: string | null;
  authorHandle: string | null;
  authorName: string | null;
  authorAvatar?: string | null;
  tokenImage?: string | null;
  authorIsDev: boolean | null;
  thesis: string | null;
  likeCount: number | null;
  holdingsUsd: number | null;
  authorTradeUsd: number | null;
  pnl: number | null;
  realizedPnlUsd: number | null;
  unrealizedPnlUsd: number | null;
  percentageRealizedPnl: number | null;
  percentageUnrealizedPnl: number | null;
  tokenAmount: number | null;
  closedAt: number | null;
  fomoCreatedAt: number | null;
  updatedAt: number | null;
  source?: "fomoscan";
};

export type FomoScanThesisPage = {
  count: number;
  hasMore: boolean;
  nextBefore: string | null;
  updatedAt: number | null;
  items: FomoScanThesis[];
  tokenAddress?: string;
  tokenNetwork?: string | null;
  symbol?: string | null;
  source?: "fomoscan";
};

export type FomoScanBoardEntry = {
  rank: number;
  id: string;
  handle: string | null;
  label: string | null;
  avatarUrl: string | null;
  pnl: number | null;
  volume: number | null;
  followers: number | null;
  numTrades: number | null;
  memberCount: number | null;
  marketCap: number | null;
  price: number | null;
  liquidity: number | null;
};

export type FomoScanBoard = {
  board: string;
  window: string | null;
  capturedAt: number;
  count: number;
  entries: FomoScanBoardEntry[];
  source?: "fomoscan" | "geckoterminal";
};

export type ChartTimeframe = "1H" | "4H" | "1D" | "7D" | "1M";

export type TokenMarket = {
  mint: string;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  priceUsd: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  marketCap: number | null;
  fdv: number | null;
  pairAddress: string | null;
  dexId: string | null;
  decimals: number | null;
  buys24h: number | null;
  sells24h: number | null;
  buyVolume24h: number | null;
  sellVolume24h: number | null;
  holderCount?: number | null;
  chain?: "solana" | "robinhood";
};

export type CandleSource = "dexscreener" | "geckoterminal" | "coingecko" | "gmgn" | "pump" | "birdeye" | "dexpaprika";

export type PoolTrade = {
  id: string;
  side: "buy" | "sell";
  usd: number;
  at: number | null;
  source?: "fomoscan" | "geckoterminal" | "helius" | "dflow" | "dexscreener";
};

export type MuseThesis = {
  id: string;
  agentId: string;
  handle: string;
  displayName: string | null;
  mint: string;
  text: string;
  createdAt: string;
};

export type MuseHolder = {
  agentId: string;
  handle: string;
  displayName: string | null;
  mint: string;
  amount: string;
  source: "position";
};

export type LiveTrade = {
  id: string;
  status: TradeStatus;
  signature: string | null;
  failReason: string | null;
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type TokenChart = {
  candles: Candle[];
  pairSource: "dexscreener" | "geckoterminal" | "gmgn" | "pump" | null;
  candleSource: CandleSource | null;
  reason: string | null;
  pairAddress: string | null;
  timeframe: ChartTimeframe;
};

export type WalletToken = {
  mint: string;
  symbol: string | null;
  name: string | null;
  amount: number;
  rawAmount: string;
  decimals: number;
  usd: number | null;
  imageUrl: string | null;
};

export type WalletFill = {
  id: string;
  side: TradeSide;
  mint: string;
  signature: string | null;
  confirmedAt: string | null;
  actualInAmount: string | null;
  actualOutAmount: string | null;
};

export type WalletSnapshot = {
  address: string;
  source: "helius";
  solLamports: number;
  sol: number;
  solUsd: number | null;
  tokens: WalletToken[];
  totalUsd: number | null;
};

export type FeedActor = {
  id: string | null;
  handle: string | null;
  name: string | null;
  avatarUrl: string | null;
  kind: "agent" | "human";
};

export type FeedToken = {
  mint: string | null;
  symbol: string | null;
  imageUrl: string | null;
};

export type FeedEvent = {
  id: string;
  action: FeedAction;
  source: "fomoscan" | "dflow" | "muse";
  at: number;
  confirmed: true;
  actor: FeedActor;
  token: FeedToken | null;
  amountUsd: number | null;
  amountLabel: string | null;
  entryLabel: string | null;
  pnlUsd: number | null;
  pnlPct: number | null;
  pnlKind: "realized" | "unrealized" | null;
  thesis: string | null;
  signature: string | null;
  txUrl: string | null;
  target: FeedActor | null;
};

export type DiscoverSource = "geckoterminal" | "dexscreener" | "fomoscan" | "muse-confirmed" | "market";

export type DiscoverTokenRow = {
  rank: number;
  mint: string;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  priceUsd: number | null;
  volumeUsd: number | null;
  volumeLamports: string | null;
  marketCap: number | null;
  priceChange24h: number | null;
  holders: number | null;
  trades: number | null;
  pairAddress?: string | null;
  chain?: "solana" | "robinhood";
  chainTag?: string | null;
  href?: string | null;
  source: DiscoverSource;
};

export type DiscoverActivityRow = {
  id: string;
  agentId: string;
  handle: string;
  displayName: string | null;
  side: TradeSide;
  mint: string;
  symbol: string | null;
  imageUrl: string | null;
  usd: number | null;
  confirmedAt: string;
  signature: string | null;
};

export type DiscoverSection<T> = {
  source: DiscoverSource;
  label: string;
  items: T;
};

export type DiscoverPayload = {
  trending: DiscoverSection<DiscoverTokenRow[]> | null;
  featured: DiscoverSection<DiscoverTokenRow[]> | null;
  robinhood: DiscoverSection<DiscoverTokenRow[]> | null;
  robinhoodChain: DiscoverSection<DiscoverTokenRow[]> | null;
  pons: DiscoverSection<DiscoverTokenRow[]> | null;
  museMostTraded: DiscoverSection<DiscoverTokenRow[]> | null;
  museMostHeld: DiscoverSection<DiscoverTokenRow[]> | null;
  museActivity: DiscoverSection<DiscoverActivityRow[]> | null;
  fomoTrending: DiscoverSection<DiscoverTokenRow[]> | null;
  fomoMostHeld: DiscoverSection<DiscoverTokenRow[]> | null;
  museBoards: MuseDiscoveryBoards | null;
  fomoUnavailable: { code?: string; message: string } | null;
};

export type DirectoryActivityKind = "fill" | "thesis" | "follow" | "listed";

export type DirectoryAgent = {
  id: string;
  handle: string;
  displayName: string | null;
  bio: string | null;
  status: AgentStatus;
  createdAt: string;
  claimedAt: string | null;
  lastActivityAt: string;
  lastActivityKind: DirectoryActivityKind;
};

export type MuseLeaderRow = {
  rank: number;
  id: string;
  handle: string | null;
  label: string | null;
  avatarUrl: null;
  pnl: number | null;
  volume: number | null;
  pnlLamports: string;
  volumeLamports: string;
  winRateBps: string | null;
  closedCount: number;
  numTrades: number;
  topMint: string | null;
  topSymbol: string | null;
  source: "muse-confirmed";
};

export type LeaderboardPayload = {
  window: LeaderboardWindow;
  capturedAt: number;
  muse: {
    source: "muse-confirmed";
    window: LeaderboardWindow;
    count: number;
    entries: MuseLeaderRow[];
  };
  fomo: {
    source: "fomoscan";
    window: LeaderboardWindow;
    count: number;
    entries: FomoScanBoardEntry[];
    stale?: boolean;
  } | null;
  fomoUnavailable: { code?: string; message: string } | null;
  directory: DirectoryAgent[];
};

export type SearchPayload = {
  q: string;
  tokens: TokenMarket[];
  agents: Array<{
    id: string;
    handle: string;
    displayName: string | null;
    status: AgentStatus;
  }>;
  fomo: (FomoScanUser & { source: "fomoscan" }) | null;
  token: TokenMarket | null;
  trader: (FomoScanUser & { source: "fomoscan" }) | null;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
