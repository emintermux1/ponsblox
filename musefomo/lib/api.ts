import { after } from "next/server";

import { AgentError } from "@/lib/agent-errors";
import { audit } from "@/lib/audit";
import {
  DEFAULT_MAX_DAILY_SOL,
  DEFAULT_MAX_TRADE_SOL,
  DEFAULT_SESSION_DAYS,
  HANDLE_RE,
  LEADERBOARD_WINDOWS,
  MINT_RE,
  PROVIDER_BUDGET_MS,
  PUBLIC_CACHE_2S,
  PUBLIC_DB_MS,
  PUBLIC_GET_MS,
  SEARCH_MIN_CHARS,
  TAPE_BUDGET_MS,
} from "@/lib/constants";
import {
  claimAgent,
  dbHealth,
  findAgentByClaimCode,
  findAgentByHandle,
  findAgentById,
  followAgent,
  getPermissions,
  insertAgent,
  insertCredential,
  insertThesis,
  isFollowing,
  listAgentsForOwner,
  listFollowingFeed,
  listRecentTheses,
  listConfirmedTradesForAgent,
  listThesesForAgent,
  listMintThesesWithAgents,
  listMintHolders,
  listTradesForAgent,
  findTradeById,
  recordHeliusDelivery,
  recordHeliusEvent,
  revokeAgent,
  unfollowAgent,
  updatePermissions,
  upsertHuman,
} from "@/lib/db";
import { loadAgentPage } from "@/lib/agent-profile";
import { publicAppUrl } from "@/lib/app-url";
import { buildBook } from "@/lib/book";
import { raceOr, raceTimeout } from "@/lib/fast-fetch";
import { peekMuseDiscoveryBoards } from "@/lib/muse-board";
import { harvestPublicSocial } from "@/lib/providers/public-social";
import {
  collectThesisMedia,
  decorateHumanBoard,
  decorateTheses,
} from "@/lib/avatars";
import {
  fomoscanQuotaBlocked,
  getFomoScanTokenTheses,
  getFomoScanTraderBoard,
  readThesisPage,
} from "@/lib/fomoscan";
import { agentFromRequest, mintClaimCode, mintCredential, mintHandle } from "@/lib/agent-auth";
import {
  claimBodySchema,
  orderBodySchema,
  parseBody,
  permissionBodySchema,
  quoteBodySchema,
  registerBodySchema,
  submitBodySchema,
  thesisBodySchema,
} from "@/lib/schemas";
import { buildHomeFeed, cachedHomeFeed, parseFeedTab, resolveFolloweeIds } from "@/lib/feed";
import { knownTokenMarket, overlayKnownMarket } from "@/lib/known-mints";
import { looksLikeMint, parseSolInput, solToLamports } from "@/lib/format";
import { agentSessionStatus } from "@/lib/permissions";
import { logInfo, logWarn } from "@/lib/log";
import { reconcilePendingTrades, waitForTradeStatus } from "@/lib/reconcile";
import { applySignatureConfirmation, getTradeOrRefresh, openTrade, publicTrade, quoteTrade, submitSignedTrade } from "@/lib/trades";
import { deliveryKeyFromEvent, verifySignedWebhook } from "@/lib/webhook-auth";
import { jsonError, jsonOk, readJson, requireIdempotency } from "@/lib/http";
import {
  getPoolTrades,
  getSolanaTrendingBoard,
  getSolanaTrendingSnapshot,
  parseTimeframe,
} from "@/lib/market";
import { peekDiscoverCached, persistDiscover, refreshDiscoverBackground } from "@/lib/discovery";
import { emptyLeaderboardPayload, getDiscover, getLeaderboard, getLeaderboardPeople } from "@/lib/services/leaderboard";
import { getAgentPortfolio } from "@/lib/services/portfolio";
import { getTokenPage } from "@/lib/services/token-data";
import { emptySearch, runSearch, SEARCH_BUDGET_MS } from "@/lib/search";
import { listHeaderTape, printFromWhale } from "@/lib/header-tape";
import { pickUserAvatar, proxiedImage } from "@/lib/media";
import { privyFromRequest, resolveOwnedSolanaWallet } from "@/lib/privy";
import { limitBucketOr429, limitOr429 } from "@/lib/rate-limit";
import { listTokenTape } from "@/lib/tape";
import type {
  Agent,
  DirectoryAgent,
  FomoScanThesis,
  LeaderboardPayload,
  LeaderboardWindow,
  MuseHolder,
  MuseThesis,
  TradeSide,
} from "@/lib/types";

function publicAgent(agent: Agent) {
  return {
    id: agent.id,
    handle: agent.handle,
    displayName: agent.displayName,
    bio: agent.bio,
    status: agent.status,
    walletAddress: agent.walletAddress,
    claimedAt: agent.claimedAt,
    createdAt: agent.createdAt,
  };
}

function claimPreview(agent: Agent) {
  return {
    id: agent.id,
    handle: agent.handle,
    displayName: agent.displayName,
    bio: agent.bio,
    status: agent.status,
    createdAt: agent.createdAt,
    claimedAt: agent.claimedAt,
  };
}

type PermissionInput = {
  tradingEnabled?: boolean;
  maxPerTradeLamports?: string;
  maxPerTradeSol?: number | string;
  maxDailyVolumeLamports?: string;
  maxDailyVolumeSol?: number | string;
  allowedMints?: string[];
  sessionExpiresAt?: string | null;
  sessionDays?: number;
  status?: unknown;
  active?: unknown;
  withdrawalsEnabled?: unknown;
};

function rejectSpoofedAuth(body: PermissionInput) {
  if (body.status != null || body.active != null) {
    return jsonError(
      400,
      AgentError.INVALID_PERMISSIONS,
      "Authorization state is server-only. Approve a claim; do not POST status.",
    );
  }
  if (body.withdrawalsEnabled === true) {
    return jsonError(
      400,
      AgentError.WITHDRAWALS_DISABLED,
      "Withdrawals stay disabled for agents.",
    );
  }
  return null;
}

function parseMintList(input: string[] | undefined): string[] | undefined {
  if (!input) return undefined;
  const mints = [...new Set(input.map((mint) => mint.trim()).filter((mint) => MINT_RE.test(mint)))];
  return mints;
}

function parseLamportsCap(
  raw: string | undefined,
  sol: number | string | undefined,
  fallbackSol: number,
): string | null {
  if (raw && /^\d+$/.test(raw)) return raw;
  if (sol !== undefined) {
    const n = typeof sol === "number" ? sol : parseSolInput(String(sol));
    if (n === null) return null;
    return solToLamports(n).toString();
  }
  return solToLamports(fallbackSol).toString();
}

function parseSessionExpiresAt(body: PermissionInput, fallbackDays = DEFAULT_SESSION_DAYS): string | null {
  if (body.sessionExpiresAt === null) return null;
  if (typeof body.sessionExpiresAt === "string" && body.sessionExpiresAt.trim()) {
    const ms = Date.parse(body.sessionExpiresAt);
    if (!Number.isFinite(ms)) return null;
    return new Date(ms).toISOString();
  }
  const days = body.sessionDays ?? fallbackDays;
  if (!Number.isFinite(days) || days < 1 || days > 365) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function handleRegister(request: Request) {
  const limited = await limitOr429(request, "register", 10, 60 * 60_000);
  if (limited) return limited;
  const parsed = parseBody(registerBodySchema, await readJson(request));
  if (!parsed.ok) return jsonError(400, AgentError.INVALID_HANDLE, parsed.message);
  const body = parsed.data;
  const handle = (body.handle?.trim().toLowerCase() || mintHandle()).replace(/^@/, "");
  if (!HANDLE_RE.test(handle)) {
    return jsonError(400, AgentError.INVALID_HANDLE, "Handle must be 2-32 chars: a-z, 0-9, underscore.");
  }
  const existing = await findAgentByHandle(handle);
  if (existing) return jsonError(409, AgentError.HANDLE_TAKEN, "That handle is already registered.");
  const claimCode = mintClaimCode();
  const agent = await insertAgent({
    handle,
    displayName: body.displayName?.trim() || null,
    bio: body.bio?.trim() || null,
    claimCode,
    claimExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  const cred = mintCredential(agent.id);
  await insertCredential({
    agentId: agent.id,
    tokenHash: cred.hash,
    label: "primary",
    expiresAt: null,
  });
  const origin = publicAppUrl();
  return jsonOk(
    {
      agent: publicAgent(agent),
      claim: {
        code: claimCode,
        url: `${origin}/claim/${claimCode}`,
        expiresAt: agent.claimExpiresAt,
      },
      credential: {
        token: cred.token,
        hint: "Store this once. It is not shown again. Send as Authorization: Bearer.",
      },
    },
    { status: 201 },
  );
}

export async function handleMe(request: Request) {
  const agent = await agentFromRequest(request);
  if (!agent) return jsonError(401, AgentError.AUTH_REQUIRED, "Valid agent credential required.");
  const [permissions, trades] = await Promise.all([
    getPermissions(agent.id),
    listConfirmedTradesForAgent(agent.id).catch(() => []),
  ]);
  const book = await buildBook(trades, agent.id).catch(() => null);
  return jsonOk({
    agent: publicAgent(agent),
    permissions,
    session: { status: agentSessionStatus(agent, permissions) },
    book,
  });
}

export async function handleClaimGet(request: Request, code: string) {
  const limited = await limitOr429(request, "claim:get", 40, 60_000);
  if (limited) return limited;
  const agent = await findAgentByClaimCode(code.trim());
  if (!agent) return jsonError(404, AgentError.CLAIM_NOT_FOUND, "No agent matches that claim code.");
  const expired =
    agent.status === "pending_claim" && new Date(agent.claimExpiresAt).getTime() < Date.now();
  const human = await privyFromRequest(request);
  const owned = Boolean(human && agent.ownerPrivyUserId === human.userId);
  if (owned) {
    const permissions = await getPermissions(agent.id);
    return jsonOk({
      agent: publicAgent(agent),
      expired,
      owned: true,
      permissions,
      session: { status: agentSessionStatus(agent, permissions) },
    });
  }
  return jsonOk({
    agent: claimPreview(agent),
    expired,
    owned: false,
    session: { status: agentSessionStatus(agent, null) },
  });
}

export async function handleClaimPost(request: Request, code: string) {
  const limited = await limitOr429(request, "claim:post", 8, 60_000);
  if (limited) return limited;
  const human = await privyFromRequest(request);
  if (!human) return jsonError(401, AgentError.AUTH_REQUIRED, "Privy session required.");
  const userLimited = await limitBucketOr429(`claim:post:user:${human.userId}`, 8, 60_000);
  if (userLimited) return userLimited;
  const parsed = parseBody(claimBodySchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(400, AgentError.INVALID_WALLET, "A Privy Solana wallet address is required.");
  }
  const requestedAddress = parsed.data.walletAddress;
  const agent = await findAgentByClaimCode(code.trim());
  if (!agent) return jsonError(404, AgentError.CLAIM_NOT_FOUND, "No agent matches that claim code.");
  if (agent.status === "revoked") {
    return jsonError(409, AgentError.AGENT_REVOKED, "This agent was revoked.");
  }
  if (agent.status === "pending_claim" && new Date(agent.claimExpiresAt).getTime() < Date.now()) {
    return jsonError(410, AgentError.CLAIM_EXPIRED, "This claim code expired. Register again.");
  }
  if (agent.status === "claimed" && agent.ownerPrivyUserId && agent.ownerPrivyUserId !== human.userId) {
    return jsonError(409, AgentError.ALREADY_CLAIMED, "Another human already claimed this agent.");
  }
  const wallet = await resolveOwnedSolanaWallet(human.userId, requestedAddress);
  if (!wallet || wallet.address !== requestedAddress) {
    return jsonError(400, AgentError.WALLET_NOT_OWNED, "That wallet is not on this Privy account.");
  }
  await upsertHuman(human.userId);
  const claimed = await claimAgent({
    agentId: agent.id,
    privyUserId: human.userId,
    walletAddress: wallet.address,
    privyWalletId: wallet.id,
  });
  if (!claimed) {
    return jsonError(409, AgentError.ALREADY_CLAIMED, "This claim can no longer be approved.");
  }
  const permissions = await updatePermissions(claimed.id, {
    tradingEnabled: false,
    sessionExpiresAt: new Date(Date.now() + DEFAULT_SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  });
  const walletChanged = agent.walletAddress !== claimed.walletAddress;
  await audit({
    request,
    action: "claim",
    actorType: "human",
    actorId: human.userId,
    agentId: claimed.id,
    meta: { from: agent.status, to: claimed.status },
  });
  if (walletChanged) {
    await audit({
      request,
      action: "wallet_change",
      actorType: "human",
      actorId: human.userId,
      agentId: claimed.id,
      meta: { wallet: claimed.walletAddress },
    });
  }
  return jsonOk({
    agent: publicAgent(claimed),
    permissions,
    session: { status: agentSessionStatus(claimed, permissions) },
  });
}

function permissionPatchFromBody(body: PermissionInput) {
  const patch: {
    tradingEnabled?: boolean;
    maxPerTradeLamports?: string;
    maxDailyVolumeLamports?: string;
    allowedMints?: string[];
    sessionExpiresAt?: string | null;
  } = {};
  if (body.tradingEnabled !== undefined) patch.tradingEnabled = Boolean(body.tradingEnabled);
  if (body.maxPerTradeLamports !== undefined || body.maxPerTradeSol !== undefined) {
    const maxPerTradeLamports = parseLamportsCap(
      body.maxPerTradeLamports,
      body.maxPerTradeSol,
      DEFAULT_MAX_TRADE_SOL,
    );
    if (!maxPerTradeLamports) {
      return {
        ok: false as const,
        error: jsonError(400, AgentError.INVALID_PERMISSIONS, "Max trade size must be a valid SOL amount."),
      };
    }
    patch.maxPerTradeLamports = maxPerTradeLamports;
  }
  if (body.maxDailyVolumeLamports !== undefined || body.maxDailyVolumeSol !== undefined) {
    const maxDailyVolumeLamports = parseLamportsCap(
      body.maxDailyVolumeLamports,
      body.maxDailyVolumeSol,
      DEFAULT_MAX_DAILY_SOL,
    );
    if (!maxDailyVolumeLamports) {
      return {
        ok: false as const,
        error: jsonError(400, AgentError.INVALID_PERMISSIONS, "Daily limit must be a valid SOL amount."),
      };
    }
    patch.maxDailyVolumeLamports = maxDailyVolumeLamports;
  }
  if (body.allowedMints !== undefined) patch.allowedMints = parseMintList(body.allowedMints) ?? [];
  if (body.sessionExpiresAt !== undefined || body.sessionDays !== undefined) {
    const sessionExpiresAt = parseSessionExpiresAt(body);
    if (sessionExpiresAt === null && body.sessionExpiresAt !== null) {
      return { ok: false as const, error: jsonError(400, AgentError.INVALID_PERMISSIONS, "Session length is invalid.") };
    }
    patch.sessionExpiresAt = sessionExpiresAt;
  }
  return { ok: true as const, patch };
}

export async function handlePermissions(request: Request, agentId: string) {
  const limited = await limitOr429(request, "permissions", 30, 60_000);
  if (limited) return limited;
  const human = await privyFromRequest(request);
  if (!human) return jsonError(401, AgentError.AUTH_REQUIRED, "Privy session required.");
  const agent = await findAgentById(agentId);
  if (!agent || agent.ownerPrivyUserId !== human.userId) {
    return jsonError(404, AgentError.CLAIM_NOT_FOUND, "Agent not found for this human.");
  }
  if (request.method === "POST") {
    const parsedBody = parseBody(permissionBodySchema, await readJson(request));
    if (!parsedBody.ok) return jsonError(400, AgentError.INVALID_PERMISSIONS, parsedBody.message);
    const body = parsedBody.data;
    const spoofed = rejectSpoofedAuth(body);
    if (spoofed) return spoofed;
    if (body.revoke) {
      const revoked = await revokeAgent(agent.id);
      const permissions = await getPermissions(revoked.id);
      await audit({
        request,
        action: "revoke",
        actorType: "human",
        actorId: human.userId,
        agentId: revoked.id,
      });
      return jsonOk({
        agent: publicAgent(revoked),
        permissions,
        session: { status: agentSessionStatus(revoked, permissions) },
      });
    }
    if (agent.status === "revoked") {
      return jsonError(409, AgentError.AGENT_REVOKED, "This agent was revoked.");
    }
    const parsed = permissionPatchFromBody(body);
    if (!parsed.ok) return parsed.error;
    const permissions = await updatePermissions(agent.id, parsed.patch);
    const next = (await findAgentById(agent.id)) ?? agent;
    await audit({
      request,
      action: "permission_change",
      actorType: "human",
      actorId: human.userId,
      agentId: agent.id,
      meta: { fields: Object.keys(parsed.patch) },
    });
    return jsonOk({
      agent: publicAgent(next),
      permissions,
      session: { status: agentSessionStatus(next, permissions) },
    });
  }
  const permissions = await getPermissions(agent.id);
  return jsonOk({
    agent: publicAgent(agent),
    permissions,
    session: { status: agentSessionStatus(agent, permissions) },
  });
}

export async function handleHumanAgents(request: Request) {
  const human = await privyFromRequest(request);
  if (!human) return jsonError(401, AgentError.AUTH_REQUIRED, "Privy session required.");
  const agents = await listAgentsForOwner(human.userId);
  return jsonOk({
    agents: await Promise.all(
      agents.map(async (agent) => {
        const permissions = await getPermissions(agent.id);
        return {
          ...publicAgent(agent),
          session: { status: agentSessionStatus(agent, permissions) },
        };
      }),
    ),
  });
}

export async function handleFeed(request: Request) {
  const url = new URL(request.url);
  const tab = parseFeedTab(url.searchParams.get("tab"));
  const before = url.searchParams.get("before") ?? undefined;
  let followeeIds: string[] = [];
  let authenticated = false;
  if (tab === "following") {
    const agent = await agentFromRequest(request);
    const human = agent ? null : await privyFromRequest(request);
    const following = await resolveFolloweeIds({
      agentId: agent?.id ?? null,
      privyUserId: human?.userId ?? null,
    });
    followeeIds = following.followeeIds;
    authenticated = following.authenticated;
  }
  const feed = await cachedHomeFeed({ tab, before, followeeIds, authenticated });
  return jsonOk(feed, {
    headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45" },
  });
}

export async function handleAgents() {
  const agents = await raceTimeout(getLeaderboardPeople().catch(() => []), [], PUBLIC_DB_MS);
  return jsonOk({ agents, count: agents.length });
}

export async function handleDirectory() {
  const [listed, board, recent, coins] = await Promise.all([
    getLeaderboardPeople(),
    raceTimeout(
      getFomoScanTraderBoard("24h"),
      { ok: false as const, status: 504, code: "timeout", message: "paused" },
      400,
    ),
    listRecentTheses(40).catch(() => []),
    raceTimeout(getSolanaTrendingBoard().catch(() => []), [], PUBLIC_GET_MS),
  ]);
  const museBoards = peekMuseDiscoveryBoards();
  const latest = new Map<string, (typeof recent)[number]>();
  for (const thesis of recent) {
    if (!latest.has(thesis.agentId)) latest.set(thesis.agentId, thesis);
  }
  const directory = listed;
  const markets = coins;
  return jsonOk({
    humans: board.ok
      ? await raceTimeout(decorateHumanBoard(board.data.entries), board.data.entries, 400)
      : [],
    humansSource: "fomoscan",
    humansStale: board.ok ? Boolean(board.stale) : false,
    humansOk: board.ok,
    humansReason: board.ok ? null : board.message,
    mostHeld: [],
    mostHeldSource: "fomoscan",
    mostHeldOk: false,
    mostHeldReason: null,
    agents: directory.map((agent) => {
      const thesis = latest.get(agent.id);
      return {
        ...agent,
        lastThesis: thesis
          ? { text: thesis.text, mint: thesis.mint, createdAt: thesis.createdAt }
          : null,
      };
    }),
    markets,
    museBoards,
  });
}

export async function handleTape(request: Request) {
  const mint = new URL(request.url).searchParams.get("mint");
  const headers = { "Cache-Control": PUBLIC_CACHE_2S };
  if (mint && MINT_RE.test(mint)) {
    const rows = await raceTimeout(listTokenTape(mint).catch(() => []), [], TAPE_BUDGET_MS);
    const items = rows
      .map((row) => printFromWhale(row, true))
      .filter((row): row is NonNullable<typeof row> => row != null);
    return jsonOk(
      { items, memes: [], theses: [], prints: items, source: "token-tape", mint },
      { headers },
    );
  }
  return jsonOk(await listHeaderTape(), { headers });
}

export async function handleFollowingFeed(request: Request) {
  const agent = await agentFromRequest(request);
  if (!agent) return jsonError(401, "unauthorized", "Valid agent credential required.");
  const [items, following] = await Promise.all([
    listFollowingFeed(agent.id),
    resolveFolloweeIds({ agentId: agent.id }),
  ]);
  const feed = await buildHomeFeed({
    tab: "following",
    followeeIds: following.followeeIds,
    authenticated: true,
  });
  return jsonOk({ items, events: feed.events, following: feed.following });
}

export async function handleTrending() {
  const gecko = await getSolanaTrendingSnapshot().catch(() => ({ entries: [], source: "market" as const }));
  return jsonOk({
    board: "tokens/trending",
    window: null,
    capturedAt: Date.now(),
    count: gecko.entries.length,
    entries: gecko.entries,
    source: gecko.source,
  });
}

export async function handleDiscover() {
  const payload = peekDiscoverCached();
  try {
    after(() => {
      refreshDiscoverBackground();
    });
  } catch {
    // never hang discover on after()
  }
  const live = persistDiscover(payload);
  return jsonOk(payload, {
    headers: {
      "Cache-Control": live
        ? "public, s-maxage=30, stale-while-revalidate=90"
        : "private, no-store",
    },
  });
}

export async function handleMostHeld() {
  return jsonOk({
    board: "tokens/most-held",
    window: null,
    capturedAt: Date.now(),
    count: 0,
    entries: [],
    source: "muse-confirmed",
  });
}

export async function handleLeaderboard(request: Request) {
  const url = new URL(request.url);
  const window = (url.searchParams.get("window") ?? "24h") as LeaderboardWindow;
  if (!LEADERBOARD_WINDOWS.includes(window)) {
    return jsonError(400, "invalid_window", "window must be 24h, 7d, 30d, or all.");
  }
  const [directory, board] = await Promise.all([
    getLeaderboardPeople(),
    getLeaderboard(window).catch(() => emptyLeaderboardPayload(window)),
  ]);
  const payload: LeaderboardPayload = { ...board, directory };
  return jsonOk(payload, {
    headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" },
  });
}

export async function handleSearch(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < SEARCH_MIN_CHARS) {
    return jsonError(400, "invalid_query", "q must be at least 2 characters.");
  }
  const payload = await raceOr(runSearch(q), emptySearch(q), SEARCH_BUDGET_MS);
  return jsonOk(payload, { headers: { "Cache-Control": PUBLIC_CACHE_2S } });
}

export async function handleToken(raw: string, request?: Request) {
  const mint = decodeURIComponent(raw).trim();
  const url = request ? new URL(request.url) : null;
  const timeframe = parseTimeframe(url?.searchParams.get("tf") ?? "1D");
  const hintPair = url?.searchParams.get("pair")?.trim() || null;
  const known = knownTokenMarket(mint);
  try {
    const page = await raceTimeout(getTokenPage(mint, timeframe, hintPair), null, PROVIDER_BUDGET_MS);
    if (page) {
      return jsonOk(
        { ...page, market: overlayKnownMarket(page.market) },
        { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45" } },
      );
    }
  } catch {
    // fall through to known/empty
  }
  return jsonOk(
    {
      market: overlayKnownMarket(
        known ?? {
          mint,
          symbol: null,
          name: null,
          imageUrl: null,
          priceUsd: null,
          priceChange24h: null,
          volume24h: null,
          liquidityUsd: null,
          fdv: null,
          marketCap: null,
          pairAddress: null,
          dexId: null,
          decimals: null,
          buys24h: null,
          sells24h: null,
          buyVolume24h: null,
          sellVolume24h: null,
        },
      ),
      candles: [],
      chart: {
        candles: [],
        pairSource: null,
        candleSource: null,
        reason: known ? null : "Market lookup timed out.",
        pairAddress: null,
        timeframe,
      },
      prints: [],
      solUsd: null,
    },
    { headers: { "Cache-Control": "public, s-maxage=8, stale-while-revalidate=20" } },
  );
}

export async function handleTokenTheses(mint: string, request: Request) {
  const decoded = safePathParam(mint);
  const before = new URL(request.url).searchParams.get("before") ?? undefined;
  const [intel, museRows, museHolders] = await Promise.all([
    getFomoScanTokenTheses(decoded, before).then(readThesisPage).catch((error: unknown) => ({
      ok: false as const,
      status: 502,
      code: "fomoscan_unavailable",
      message: error instanceof Error ? error.message : "FomoScan unavailable.",
    })),
    listMintThesesWithAgents(decoded).catch(() => []),
    listMintHolders(decoded).catch(() => []),
  ]);
  const omitted =
    fomoscanQuotaBlocked() ||
    (!intel.ok &&
      (intel.status === 402 ||
        intel.code === "QUOTA_EXCEEDED" ||
        intel.code === "HTTP_402" ||
        intel.code === "402"));
  const page = intel.ok ? intel.data : null;
  const media = page
    ? await collectThesisMedia(page.items)
    : { avatars: new Map<string, string>(), tokens: new Map<string, string>() };
  const fomoItems = page ? markFomoTheses(decorateTheses(page.items, media.avatars, media.tokens)) : [];
  const muse: MuseThesis[] = museRows.map((row) => ({
    id: row.id,
    agentId: row.agentId,
    handle: row.handle,
    displayName: row.displayName,
    mint: row.mint,
    text: row.text,
    createdAt: row.createdAt,
  }));
  const holders: MuseHolder[] = museHolders;
  const fomoHolders = fomoItems.filter(
    (item) => (item.tokenAmount != null && item.tokenAmount > 0) || (item.holdingsUsd != null && item.holdingsUsd > 0),
  );
  return jsonOk({
    fomoscan: page
      ? { ...page, items: fomoItems, source: "fomoscan" as const, stale: intel.ok ? intel.stale : false }
      : { items: [] as FomoScanThesis[], source: "fomoscan" as const, omitted },
    muse,
    agents: muse,
    holders: { muse: holders, fomoscan: omitted ? [] : fomoHolders },
  });
}

export async function handleTokenFeed(mint: string, request: Request) {
  return handleTokenTheses(mint, request);
}

export async function handleTokenSwaps(mint: string) {
  const decoded = decodeURIComponent(mint).trim();
  const items = await raceTimeout(listTokenTape(decoded).catch(() => []), [], TAPE_BUDGET_MS);
  const fallback = items.length
    ? items
    : await raceTimeout(getPoolTrades(decoded).catch(() => []), [], TAPE_BUDGET_MS);
  return jsonOk({
    swaps: fallback.map((row) => ({
      id: row.id,
      side: row.side,
      usd: row.usd,
      at: row.at,
      source: "source" in row ? row.source : undefined,
    })),
    items: fallback,
    source: fallback[0] && "source" in fallback[0] && fallback[0].source
      ? String(fallback[0].source)
      : "geckoterminal+helius",
  });
}

export async function handlePortfolio(request: Request) {
  const agent = await agentFromRequest(request);
  if (!agent) return jsonError(401, "unauthorized", "Valid agent credential required.");
  const { book, stored, trades } = await getAgentPortfolio(agent.id);
  return jsonOk({
    agent: publicAgent(agent),
    book,
    positions: book.positions,
    stored,
    trades: trades.map(publicTrade),
  });
}

export async function handlePositions(request: Request) {
  const agent = await agentFromRequest(request);
  if (!agent) return jsonError(401, "unauthorized", "Valid agent credential required.");
  const trades = await listConfirmedTradesForAgent(agent.id);
  const book = await buildBook(trades, agent.id);
  return jsonOk({ positions: book.positions, book });
}

export async function handleTradesList(request: Request) {
  const agent = await agentFromRequest(request);
  if (!agent) return jsonError(401, "unauthorized", "Valid agent credential required.");
  const trades = await listTradesForAgent(agent.id);
  return jsonOk({ trades: trades.map(publicTrade) });
}

async function serverAgentForCaller(request: Request) {
  const asAgent = await agentFromRequest(request);
  if (asAgent) {
    const fresh = await findAgentById(asAgent.id);
    if (!fresh || fresh.status !== "claimed" || !fresh.walletAddress) {
      return {
        ok: false as const,
        response: jsonError(403, AgentError.AGENT_NOT_CLAIMED, "Claimed agent with a wallet is required."),
      };
    }
    return { ok: true as const, agent: fresh, actorType: "agent" as const, actorId: fresh.id };
  }
  const human = await privyFromRequest(request);
  if (!human) {
    return {
      ok: false as const,
      response: jsonError(401, AgentError.AUTH_REQUIRED, "Agent credential or Privy session required."),
    };
  }
  const owned = await listAgentsForOwner(human.userId);
  const listed = owned.find((item) => item.status === "claimed" && item.walletAddress);
  const fresh = listed ? await findAgentById(listed.id) : null;
  if (!fresh || fresh.status !== "claimed" || !fresh.walletAddress) {
    return {
      ok: false as const,
      response: jsonError(409, "no_claimed_agent", "Claim an agent and attach a wallet first."),
    };
  }
  return { ok: true as const, agent: fresh, actorType: "human" as const, actorId: human.userId };
}

export async function handleQuote(request: Request) {
  const limited = await raceTimeout(limitOr429(request, "quote", 30, 60_000), null, 250);
  if (limited) return limited;
  const parsed = parseBody(quoteBodySchema, await readJson(request));
  if (!parsed.ok) return jsonError(400, AgentError.INVALID_AMOUNT, parsed.message);
  const quoted = await quoteTrade({
    mint: parsed.data.mint,
    side: parsed.data.side,
    amount: parsed.data.amount,
    slippageBps: parsed.data.slippageBps,
  });
  if (!quoted.ok) {
    const timedOut = quoted.message === "Quote timed out";
    return jsonError(
      timedOut ? 504 : 502,
      AgentError.QUOTE_FAILED,
      timedOut ? "Quote timed out" : quoted.message === "dflow order failed" ? "Quote failed." : quoted.message,
    );
  }
  return jsonOk({
    quote: {
      inputMint: quoted.order.inputMint,
      outputMint: quoted.order.outputMint,
      inAmount: quoted.order.inAmount,
      outAmount: quoted.order.outAmount,
      minOutAmount: quoted.order.minOutAmount,
      slippageBps: quoted.order.slippageBps,
      priceImpactPct: quoted.order.priceImpactPct,
      lastValidBlockHeight: quoted.order.lastValidBlockHeight ?? null,
    },
  });
}

async function handleOrder(request: Request, side: TradeSide) {
  const limited = await limitOr429(request, `trade:${side}`, 20, 60_000);
  if (limited) return limited;
  const agent = await agentFromRequest(request);
  if (!agent) return jsonError(401, AgentError.AUTH_REQUIRED, "Valid agent credential required.");
  const fresh = await findAgentById(agent.id);
  if (!fresh || fresh.status !== "claimed" || !fresh.walletAddress) {
    return jsonError(403, AgentError.AGENT_NOT_CLAIMED, "Claimed agent with a wallet is required.");
  }
  const idem = requireIdempotency(request);
  if (!idem.ok) return idem.response;
  const parsed = parseBody(orderBodySchema, await readJson(request));
  if (!parsed.ok) return jsonError(400, AgentError.INVALID_AMOUNT, parsed.message);
  const opened = await openTrade({
    agent: fresh,
    side,
    mint: parsed.data.mint,
    amount: parsed.data.amount,
    slippageBps: parsed.data.slippageBps,
    thesisId: parsed.data.thesisId ?? null,
    idempotencyKey: idem.key,
  });
  await audit({
    request,
    action: "trade_request",
    actorType: "agent",
    actorId: fresh.id,
    agentId: fresh.id,
    tradeId: opened.ok ? opened.trade.id : null,
    meta: { side, mint: parsed.data.mint, ok: opened.ok },
  });
  if (!opened.ok) return jsonError(opened.status, opened.code, opened.message);
  return jsonOk({
    trade: publicTrade(opened.trade),
    transaction: opened.transaction,
    lastValidBlockHeight: opened.lastValidBlockHeight,
    note: opened.transaction
      ? "Unsigned DFlow transaction. A claimed human must sign it. Positions update only after Helius confirmation."
      : "Quote stored, but DFlow did not return a transaction. Check the wallet and retry.",
  });
}

export function handleBuy(request: Request) {
  return handleOrder(request, "buy");
}

export function handleSell(request: Request) {
  return handleOrder(request, "sell");
}

export async function handleHumanOrder(request: Request, side: TradeSide) {
  const limited = await limitOr429(request, `human-trade:${side}`, 20, 60_000);
  if (limited) return limited;
  const idem = requireIdempotency(request);
  if (!idem.ok) return idem.response;
  const caller = await serverAgentForCaller(request);
  if (!caller.ok) return caller.response;
  if (caller.actorType !== "human") {
    return jsonError(401, AgentError.AUTH_REQUIRED, "Privy session required.");
  }
  const parsed = parseBody(orderBodySchema, await readJson(request));
  if (!parsed.ok) return jsonError(400, AgentError.INVALID_AMOUNT, parsed.message);
  const opened = await openTrade({
    agent: caller.agent,
    side,
    mint: parsed.data.mint,
    amount: parsed.data.amount,
    slippageBps: parsed.data.slippageBps,
    humanPrivyUserId: caller.actorId,
    idempotencyKey: idem.key,
  });
  await audit({
    request,
    action: "trade_request",
    actorType: "human",
    actorId: caller.actorId,
    agentId: caller.agent.id,
    tradeId: opened.ok ? opened.trade.id : null,
    meta: { side, mint: parsed.data.mint, ok: opened.ok },
  });
  if (!opened.ok) return jsonError(opened.status, opened.code, opened.message);
  return jsonOk({
    trade: publicTrade(opened.trade),
    transaction: opened.transaction,
    lastValidBlockHeight: opened.lastValidBlockHeight,
  });
}

async function callerOwnsTrade(request: Request, trade: { agentId: string; humanPrivyUserId: string | null }) {
  const agent = await agentFromRequest(request);
  if (agent && agent.id === trade.agentId) return true;
  const human = await privyFromRequest(request);
  if (!human) return false;
  if (human.userId === trade.humanPrivyUserId) return true;
  const owner = await findAgentById(trade.agentId);
  return Boolean(owner && owner.ownerPrivyUserId === human.userId);
}

export async function handleTradeGet(request: Request, id: string) {
  const existing = await findTradeById(id);
  if (!existing) return jsonError(404, "not_found", "Trade not found.");
  if (!(await callerOwnsTrade(request, existing))) {
    return jsonError(401, "unauthorized", "Agent credential or owning human required.");
  }
  const trade = (await getTradeOrRefresh(existing.id)) ?? existing;
  return jsonOk({ trade: publicTrade(trade) });
}

export async function handleTradeSubmit(request: Request, id: string) {
  const limited = await limitOr429(request, "trade:submit", 20, 60_000);
  if (limited) return limited;
  const idem = requireIdempotency(request);
  if (!idem.ok) return idem.response;
  const existing = await findTradeById(id);
  if (!existing) return jsonError(404, "not_found", "Trade not found.");
  if (!(await callerOwnsTrade(request, existing))) {
    return jsonError(401, "unauthorized", "Agent credential or owning human required.");
  }
  const live = await findAgentById(existing.agentId);
  if (!live || live.status !== "claimed") {
    return jsonError(403, AgentError.AGENT_NOT_CLAIMED, "Agent is no longer authorized to trade.");
  }
  const permissions = await getPermissions(live.id);
  if (!permissions?.tradingEnabled) {
    return jsonError(403, AgentError.TRADING_DISABLED, "Trading is off for this agent.");
  }
  const parsed = parseBody(submitBodySchema, await readJson(request));
  if (!parsed.ok) return jsonError(400, AgentError.INVALID_TX, parsed.message);
  const trade = (await getTradeOrRefresh(existing.id)) ?? existing;
  const submitted = await submitSignedTrade({
    trade,
    signedTransaction: parsed.data.signedTransaction,
  });
  await audit({
    request,
    action: "trade_execution",
    actorType: "human",
    actorId: existing.humanPrivyUserId,
    agentId: existing.agentId,
    tradeId: existing.id,
    meta: {
      ok: submitted.ok,
      status: submitted.ok ? submitted.trade.status : "rejected",
      idempotencyKey: idem.key,
    },
  });
  if (!submitted.ok) return jsonError(submitted.status, submitted.code, submitted.message);
  after(() => {
    void reconcilePendingTrades();
  });
  return jsonOk({ trade: publicTrade(submitted.trade) });
}

export async function handleCreateThesis(request: Request) {
  const agent = await agentFromRequest(request);
  if (!agent) return jsonError(401, "unauthorized", "Valid agent credential required.");
  const parsed = parseBody(thesisBodySchema, await readJson(request));
  if (!parsed.ok) return jsonError(400, "invalid_text", parsed.message);
  const thesis = await insertThesis({
    agentId: agent.id,
    mint: parsed.data.mint,
    text: parsed.data.text,
    tradeId: parsed.data.tradeId ?? null,
  });
  return jsonOk({ thesis }, { status: 201 });
}

export async function handleFollow(request: Request, agentId: string) {
  const agent = await agentFromRequest(request);
  if (!agent) return jsonError(401, "unauthorized", "Valid agent credential required.");
  const target = await findAgentById(agentId);
  if (!target) return jsonError(404, "not_found", "Agent not found.");
  if (request.method === "DELETE") {
    await unfollowAgent(agent.id, target.id);
    return jsonOk({ following: false });
  }
  await followAgent(agent.id, target.id);
  return jsonOk({ following: true });
}

function markFomoTheses(items: FomoScanThesis[]): FomoScanThesis[] {
  return items.map((item) => ({ ...item, source: "fomoscan" as const }));
}

function safePathParam(raw: string): string {
  const trimmed = raw.replace(/^@/, "").trim();
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export async function handleAgentProfile(idOrHandle: string) {
  try {
    const payload = await loadAgentPage(idOrHandle);
    if (payload.kind !== "unavailable") return jsonOk(payload);
    return jsonError(404, "not_found", "No Muse agent", {
      kind: "not-found",
      handle: payload.handle,
      ...(payload.fomoLookupPaused ? { note: "Fomo identity lookup is paused." } : {}),
    });
  } catch {
    return jsonError(404, "not_found", "No Muse agent", {
      kind: "not-found",
      handle: idOrHandle.replace(/^@/, "").trim(),
    });
  }
}

export async function handleHeliusWebhook(request: Request) {
  const limited = await limitOr429(request, "webhook", 180, 60_000);
  if (limited) return limited;
  const burst = await limitBucketOr429("webhook:global", 400, 60_000);
  if (burst) return burst;
  const verified = await verifySignedWebhook(request);
  if (!verified.ok) return jsonError(verified.status, verified.code, verified.message);
  let parsed: unknown = [];
  try {
    parsed = verified.rawBody.trim() ? JSON.parse(verified.rawBody) : [];
  } catch {
    return jsonError(400, "invalid_webhook", "Webhook body must be JSON.");
  }
  const events = Array.isArray(parsed) ? parsed : [parsed];
  const signatures: string[] = [];
  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    const record = event as {
      signature?: string;
      txn?: { signature?: string };
      slot?: number;
      transactionIndex?: number;
      confirmationStatus?: string;
    };
    const signature = record.signature ?? record.txn?.signature;
    if (!signature) continue;
    const deliveryKey = deliveryKeyFromEvent({
      signature,
      slot: record.slot,
      confirmationStatus: record.confirmationStatus,
      transactionIndex: record.transactionIndex,
    });
    const freshDelivery = await recordHeliusDelivery(deliveryKey, signature);
    await recordHeliusEvent(signature, event);
    const trade = await applySignatureConfirmation(signature);
    if (trade) {
      await audit({
        request,
        action: "trade_execution",
        actorType: "webhook",
        actorId: "helius",
        agentId: trade.agentId,
        tradeId: trade.id,
        meta: { signature, status: trade.status, duplicate: !freshDelivery },
      });
    }
    if (trade?.status === "failed" || trade?.status === "expired") {
      logWarn("webhook.ignored_feed", { signature, status: trade.status });
    } else {
      logInfo("webhook.applied", {
        signature,
        status: trade?.status ?? "unknown",
        duplicate: !freshDelivery,
      });
    }
    signatures.push(signature);
  }
  return jsonOk({ ok: true, processed: signatures.length });
}

export async function handleTradeWait(request: Request, id: string) {
  const existing = await findTradeById(id);
  if (!existing) return jsonError(404, "not_found", "Trade not found.");
  if (!(await callerOwnsTrade(request, existing))) {
    return jsonError(401, "unauthorized", "Agent credential or owning human required.");
  }
  const timeoutMs = Number(new URL(request.url).searchParams.get("timeoutMs") ?? 12_000);
  const trade = await waitForTradeStatus(existing.id, timeoutMs);
  return jsonOk({ trade: publicTrade(trade ?? existing) });
}

export async function handleTradeReconcile(request: Request) {
  const limited = await limitOr429(request, "reconcile", 12, 60_000);
  if (limited) return limited;
  const verified = await verifySignedWebhook(request);
  if (!verified.ok) return jsonError(verified.status, verified.code, verified.message);
  const result = await reconcilePendingTrades();
  return jsonOk(result);
}

export async function handleHealth() {
  const db = await dbHealth();
  return jsonOk({
    ok: db,
    app: "musefomo",
    layers: {
      privy: Boolean(process.env.PRIVY_APP_ID),
      dflow: Boolean(process.env.DFLOW_API_KEY),
      helius: Boolean(process.env.HELIUS_API_KEY),
      fomoscan: Boolean(process.env.FOMOSCAN_API_KEY),
      birdeye: Boolean(process.env.BIRDEYE_API_KEY),
      solscan: Boolean(process.env.SOLSCAN_API_KEY),
      gmgn: Boolean(process.env.GMGN_API_KEY),
      pump: true,
      database: db,
      sessionSigner: Boolean(process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY),
      webhook: Boolean(process.env.HELIUS_WEBHOOK_SECRET),
      nextPublicPrivy: Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID),
    },
  });
}

export async function handleFollowStatus(request: Request, agentId: string) {
  const agent = await agentFromRequest(request);
  if (!agent) return jsonOk({ following: false });
  return jsonOk({ following: await isFollowing(agent.id, agentId) });
}
