import { after } from "next/server";

import { cachePeek, cacheSet } from "@/lib/cache";
import { FEED_TABS, HOUR_MS, SOL_MINT } from "@/lib/constants";
import {
  listAgentsForOwner,
  listFollowingIds,
  listFollowingIdsForAgents,
  listHydratedConfirmedTrades,
  listRecentFollows,
  listRecentTheses,
  listThesesForAgent,
} from "@/lib/db";
import { forYouAgents } from "@/lib/directory";
import { refreshTrendingPublic } from "@/lib/discovery";
import {
  eventFromAgentThesis,
  eventFromConfirmedTrade,
  eventFromFollow,
  eventsFromTheses,
  isBlogLearnEvent,
  sortFeedEvents,
} from "@/lib/feed-event";
import { peekLastGoodTheses, peekLastGoodTrending } from "@/lib/home-paint";
import { looksLikeEvm, looksLikeMint } from "@/lib/format";
import { getDexTokenCards, getSolUsd } from "@/lib/market";
import { asHttpsLogo } from "@/lib/token-logo";
import { assertNever } from "@/lib/never";
import { isRealTraderThesis, pickHomeEvents, pickHomeTheses } from "@/lib/thesis-guard";
import { dedupeTheses } from "@/lib/thesis-sources";
import type {
  DirectoryAgent,
  DiscoverTokenRow,
  FeedEvent,
  FeedTab,
  FomoScanThesis,
  FomoScanThesisPage,
} from "@/lib/types";

export const HOME_FEED_CACHE_VER = "v9";
const FEED_GET_MS = 250;
const PAD_SYMBOLS = new Set(["LONGER", "SNAPPAD", "GITPAD", "WIKIPAD", "ROBLOXPAD", "SKINPAD", "REDDITPAD", "PONS", "USDC", "USDT"]);

export type FeedUnavailable = {
  code: string;
  message: string;
};

export type FeedSourceCounts = {
  muse: number;
  cache: number;
  fomoscan: number;
  public: number;
};

export type HomeFeedResult = {
  tab: FeedTab;
  events: FeedEvent[];
  theses: FomoScanThesis[];
  count: number;
  thesisCount: number;
  source: { fomoscan: boolean; local: boolean; cache: boolean; public: boolean };
  sources: FeedSourceCounts;
  fomoscan: (FomoScanThesisPage & { stale?: boolean }) | { items: FomoScanThesis[] };
  agentTheses: FomoScanThesis[];
  agents: DirectoryAgent[];
  directory: DirectoryAgent[];
  trending: DiscoverTokenRow[];
  following: {
    authenticated: boolean;
    followeeIds: string[];
    emptyReason: "need_muse" | "none" | "quiet" | null;
  };
  unavailable: { fomoscan: FeedUnavailable | null };
};

export function parseFeedTab(value: string | null): FeedTab {
  const tab = FEED_TABS.find((item) => item === value);
  return tab ?? "for-you";
}

export async function resolveFolloweeIds(input: {
  agentId?: string | null;
  privyUserId?: string | null;
}): Promise<{ authenticated: boolean; followeeIds: string[] }> {
  if (input.agentId) {
    return { authenticated: true, followeeIds: await listFollowingIds(input.agentId) };
  }
  if (input.privyUserId) {
    const owned = await listAgentsForOwner(input.privyUserId).catch(() => []);
    const ids = owned.map((agent) => agent.id);
    return { authenticated: true, followeeIds: await listFollowingIdsForAgents(ids) };
  }
  return { authenticated: false, followeeIds: [] };
}

async function tokenCards(mints: string[]) {
  const unique = [...new Set(mints.filter((mint) => mint && mint !== SOL_MINT))];
  if (!unique.length) return new Map<string, { symbol: string | null; image: string | null }>();
  return getDexTokenCards(unique).catch(() => new Map());
}

export async function buildHomeFeed(input: {
  tab: FeedTab;
  before?: string;
  followeeIds: string[];
  authenticated: boolean;
}): Promise<HomeFeedResult> {
  switch (input.tab) {
    case "following":
      return buildFollowingFeed(input);
    case "for-you":
      return assembleFast(input.tab);
    case "thesis":
      return assembleFast(input.tab);
    default:
      return assertNever(input.tab, "feed.tab");
  }
}

async function buildFollowingFeed(input: {
  followeeIds: string[];
  authenticated: boolean;
}): Promise<HomeFeedResult> {
  const empty = emptyCompat();
  if (!input.authenticated) {
    return withCounts({
      tab: "following",
      events: [],
      ...empty,
      following: { authenticated: false, followeeIds: [], emptyReason: "need_muse" },
    });
  }
  if (!input.followeeIds.length) {
    return withCounts({
      tab: "following",
      events: [],
      ...empty,
      following: { authenticated: true, followeeIds: [], emptyReason: "none" },
    });
  }
  const events = await collectLocalEvents(input.followeeIds).catch(() => []);
  return withCounts({
    tab: "following",
    events,
    ...empty,
    source: { fomoscan: false, local: events.length > 0, cache: false, public: false },
    sources: { muse: events.length, cache: 0, fomoscan: 0, public: 0 },
    following: {
      authenticated: true,
      followeeIds: input.followeeIds,
      emptyReason: events.length ? null : "quiet",
    },
  });
}

function scheduleHomeRefresh() {
  try {
    after(() => {
      void refreshTrendingPublic();
    });
  } catch {
    // Never start market fetches on the request path.
  }
}

function assembleFast(tab: "for-you" | "thesis"): HomeFeedResult {
  const trending = peekLastGoodTrending();
  const theses = peekLastGoodTheses();
  const events = pickHomeEvents(eventsFromTheses(theses).filter((event) => !isBlogLearnEvent(event)));
  return withCounts({
    tab,
    events,
    ...emptyCompat(),
    theses,
    trending,
    source: { fomoscan: false, local: false, cache: theses.length > 0 || trending.length > 0, public: false },
    sources: { muse: 0, cache: theses.length + trending.length, fomoscan: 0, public: 0 },
  });
}

async function collectLocalEvents(agentIds?: string[]): Promise<FeedEvent[]> {
  const [trades, theses, follows, solUsd] = await Promise.all([
    listHydratedConfirmedTrades(40, agentIds, FEED_GET_MS).catch(() => []),
    listRecentTheses(40).catch(() => []),
    listRecentFollows(30, agentIds, FEED_GET_MS).catch(() => []),
    getSolUsd().catch(() => null),
  ]);
  const scopedTheses = agentIds ? theses.filter((row) => agentIds.includes(row.agentId)) : theses;
  const thesisOnTrade = new Set(trades.map((trade) => trade.thesisId).filter((id): id is string => Boolean(id)));
  const mints = [
    ...trades.map((trade) => (trade.side === "buy" ? trade.outputMint : trade.inputMint)),
    ...scopedTheses.map((row) => row.mint),
  ];
  const cards = await withTimeout(tokenCards(mints), FEED_GET_MS, new Map());
  const tradeEvents = trades
    .map((trade) => {
      const mint = trade.side === "buy" ? trade.outputMint : trade.inputMint;
      const card = cards.get(mint);
      return eventFromConfirmedTrade({
        id: trade.id,
        side: trade.side,
        status: trade.status,
        confirmedAt: trade.confirmedAt,
        signature: trade.signature,
        agentId: trade.agentId,
        handle: trade.handle,
        displayName: trade.displayName,
        inputMint: trade.inputMint,
        outputMint: trade.outputMint,
        actualInAmount: trade.actualInAmount,
        actualOutAmount: trade.actualOutAmount,
        requestedAmount: trade.requestedAmount,
        thesisText: trade.thesisText,
        tokenSymbol: card?.symbol ?? null,
        tokenImage: asHttpsLogo(card?.image),
        solUsd,
      });
    })
    .filter((event): event is FeedEvent => Boolean(event));
  const thesisEvents = scopedTheses
    .filter((row) => !thesisOnTrade.has(row.id))
    .map((row) => {
      const card = cards.get(row.mint);
      return eventFromAgentThesis({
        id: row.id,
        mint: row.mint,
        text: row.text,
        createdAt: row.createdAt,
        agentId: row.agentId,
        handle: row.handle,
        displayName: row.displayName,
        tokenSymbol: card?.symbol ?? null,
        tokenImage: asHttpsLogo(card?.image),
      });
    })
    .filter((event): event is FeedEvent => Boolean(event));
  const followEvents = follows
    .map((row) => eventFromFollow(row))
    .filter((event): event is FeedEvent => Boolean(event));
  return sortFeedEvents([...tradeEvents, ...thesisEvents, ...followEvents]);
}

export async function listAgentFeedEvents(agent: {
  id: string;
  handle: string;
  displayName: string | null;
}): Promise<FeedEvent[]> {
  const [trades, theses, follows, solUsd] = await Promise.all([
    listHydratedConfirmedTrades(50, [agent.id]).catch(() => []),
    listThesesForAgent(agent.id, 40).catch(() => []),
    listRecentFollows(30, [agent.id]).catch(() => []),
    getSolUsd().catch(() => null),
  ]);
  const thesisOnTrade = new Set(trades.map((trade) => trade.thesisId).filter((id): id is string => Boolean(id)));
  const mints = [
    ...trades.map((trade) => (trade.side === "buy" ? trade.outputMint : trade.inputMint)),
    ...theses.map((row) => row.mint),
  ];
  const cards = await withTimeout(tokenCards(mints), FEED_GET_MS, new Map());
  const tradeEvents = trades
    .map((trade) => {
      const mint = trade.side === "buy" ? trade.outputMint : trade.inputMint;
      const card = cards.get(mint);
      return eventFromConfirmedTrade({
        id: trade.id,
        side: trade.side,
        status: trade.status,
        confirmedAt: trade.confirmedAt,
        signature: trade.signature,
        agentId: trade.agentId,
        handle: trade.handle,
        displayName: trade.displayName,
        inputMint: trade.inputMint,
        outputMint: trade.outputMint,
        actualInAmount: trade.actualInAmount,
        actualOutAmount: trade.actualOutAmount,
        requestedAmount: trade.requestedAmount,
        thesisText: trade.thesisText,
        tokenSymbol: card?.symbol ?? null,
        tokenImage: asHttpsLogo(card?.image),
        solUsd,
      });
    })
    .filter((event): event is FeedEvent => Boolean(event));
  const thesisEvents = theses
    .filter((row) => !thesisOnTrade.has(row.id))
    .map((row) => {
      const card = cards.get(row.mint);
      return eventFromAgentThesis({
        id: row.id,
        mint: row.mint,
        text: row.text,
        createdAt: row.createdAt,
        agentId: agent.id,
        handle: agent.handle,
        displayName: agent.displayName,
        tokenSymbol: card?.symbol ?? null,
        tokenImage: asHttpsLogo(card?.image),
      });
    })
    .filter((event): event is FeedEvent => Boolean(event));
  const followEvents = follows
    .map((row) => eventFromFollow(row))
    .filter((event): event is FeedEvent => Boolean(event));
  return sortFeedEvents([...tradeEvents, ...thesisEvents, ...followEvents]);
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

export function emptyHomeFeed(tab: FeedTab): HomeFeedResult {
  return withCounts({
    tab,
    events: [],
    ...emptyCompat(),
    following: {
      authenticated: false,
      followeeIds: [],
      emptyReason: tab === "following" ? "need_muse" : null,
    },
  });
}

function persistableFeed(row: HomeFeedResult): boolean {
  return (
    row.events.some((event) => !isBlogLearnEvent(event)) ||
    (row.theses?.some(isRealTraderThesis) ?? false) ||
    (row.trending ?? []).some(isSolanaMeme)
  );
}

function publicFeed(row: HomeFeedResult): HomeFeedResult {
  const events = pickHomeEvents((row.events ?? []).filter((event) => !isBlogLearnEvent(event)));
  const theses = pickHomeTheses(dedupeTheses(row.theses ?? []));
  return withCounts({
    ...row,
    events,
    theses,
    fomoscan: { items: theses },
    agentTheses: (row.agentTheses ?? []).filter((item) => (item.thesis ?? "").trim()),
    trending: (row.trending ?? []).filter(isSolanaMeme),
    agents: forYouAgents(),
    directory: forYouAgents(),
  });
}

function fomoItems(row: HomeFeedResult): FomoScanThesis[] {
  return "items" in row.fomoscan ? row.fomoscan.items : [];
}

function withCounts(
  row: Omit<HomeFeedResult, "count" | "thesisCount" | "theses"> &
    Partial<Pick<HomeFeedResult, "count" | "thesisCount" | "theses">>,
): HomeFeedResult {
  const theses = row.theses ?? fomoItems(row as HomeFeedResult);
  const thesisEvents = (row.events ?? []).filter((event) => event.action === "thesis" || Boolean(event.thesis));
  const thesisCount = Math.max(theses.length, thesisEvents.length);
  const count = (row.events?.length ?? 0) + (row.trending?.length ?? 0);
  return { ...row, theses, count, thesisCount };
}

export async function cachedThesisPage(): Promise<{ items: FomoScanThesis[]; count: number; thesisCount: number }> {
  const feed = await cachedHomeFeed({
    tab: "thesis",
    followeeIds: [],
    authenticated: false,
  });
  return { items: feed.theses, count: feed.thesisCount, thesisCount: feed.thesisCount };
}

export async function cachedHomeFeed(input: {
  tab: FeedTab;
  before?: string;
  followeeIds: string[];
  authenticated: boolean;
}): Promise<HomeFeedResult> {
  try {
    const memKey =
      input.tab === "following"
        ? `home-feed:${input.tab}:${input.followeeIds.join(",")}:${input.before ?? ""}`
        : `home-feed:${HOME_FEED_CACHE_VER}:${input.tab}:${input.before ?? ""}`;

    if (input.tab === "following") {
      return withCounts(await buildFollowingFeed(input));
    }

    scheduleHomeRefresh();

    const overlayTrend = (row: HomeFeedResult): HomeFeedResult => {
      const ranked = peekLastGoodTrending();
      return publicFeed({
        ...row,
        trending: ranked.length ? ranked : (row.trending ?? []).filter(isSolanaMeme),
      });
    };

    const mem = cachePeek<HomeFeedResult>(memKey);
    if (mem?.value) {
      const hit = overlayTrend(mem.value);
      cacheSet(memKey, hit, HOUR_MS);
      return hit;
    }

    const next = overlayTrend(assembleFast(input.tab === "thesis" ? "thesis" : "for-you"));
    if (persistableFeed(next)) cacheSet(memKey, next, HOUR_MS);
    return next;
  } catch {
    const trending = peekLastGoodTrending();
    return withCounts({
      tab: input.tab,
      events: [],
      ...emptyCompat(),
      trending,
      source: { fomoscan: false, local: false, cache: trending.length > 0, public: false },
      sources: { muse: 0, cache: trending.length, fomoscan: 0, public: 0 },
    });
  }
}

function emptyCompat(): Pick<
  HomeFeedResult,
  | "theses"
  | "count"
  | "thesisCount"
  | "source"
  | "sources"
  | "fomoscan"
  | "agentTheses"
  | "agents"
  | "directory"
  | "trending"
  | "unavailable"
  | "following"
> {
  return {
    theses: [],
    count: 0,
    thesisCount: 0,
    source: { fomoscan: false, local: false, cache: false, public: false },
    sources: { muse: 0, cache: 0, fomoscan: 0, public: 0 },
    fomoscan: { items: [] as FomoScanThesis[] },
    agentTheses: [],
    agents: forYouAgents(),
    directory: forYouAgents(),
    trending: [],
    following: { authenticated: false, followeeIds: [], emptyReason: null },
    unavailable: { fomoscan: null },
  };
}

function isSolanaMeme(row: DiscoverTokenRow): boolean {
  const symbol = (row.symbol ?? "").replace(/^\$/, "").toUpperCase();
  if (PAD_SYMBOLS.has(symbol) || row.chain === "robinhood" || looksLikeEvm(row.mint)) return false;
  return looksLikeMint(row.mint);
}
