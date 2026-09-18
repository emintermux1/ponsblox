import { cache } from "react";
import type { Metadata } from "next";

import { publicAppUrl } from "@/lib/app-url";
import { decoratePositions, performanceFromBook, type AgentMark, type AgentPerformance, type AgentPositionRow } from "@/lib/agent-stats";
import { buildBook } from "@/lib/book";
import { collectThesisMedia, decorateTheses } from "@/lib/avatars";
import { MINT_RE } from "@/lib/constants";
import {
  countFollowers,
  findAgentByHandle,
  findAgentById,
  listConfirmedTradesForAgent,
  listThesesForAgent,
} from "@/lib/db";
import { listAgentFeedEvents } from "@/lib/feed";
import {
  getFomoScanUserPnl,
  getFomoScanUserTheses,
  normalizePnl,
  normalizeUser,
  readThesisPage,
  resolveFomoScanTrader,
} from "@/lib/fomoscan";
import { getDexTokenCards, getTokenMarket } from "@/lib/market";
import { pickUserAvatar, proxiedImage } from "@/lib/media";
import { museIdentity } from "@/lib/muse-identity";
import { X_AT } from "@/lib/social";
import { publicTrade } from "@/lib/trades";
import type {
  Agent,
  FeedEvent,
  FomoScanPnl,
  FomoScanThesis,
  FomoScanUser,
  BookSnapshot,
  Thesis,
  TokenMarket,
} from "@/lib/types";
import { getWalletSnapshot } from "@/lib/wallet";

export type PublicAgent = {
  id: string;
  handle: string;
  displayName: string | null;
  bio: string | null;
  status: Agent["status"];
  walletAddress: string | null;
  claimedAt: string | null;
  createdAt: string;
};

export type PublicConfirmedTrade = ReturnType<typeof publicTrade>;

export type AgentThesisRow = Thesis & {
  symbol: string | null;
  image: string | null;
};

export type MuseAgentPayload = {
  kind: "agent";
  agent: PublicAgent;
  identity: ReturnType<typeof museIdentity>;
  followers: number;
  joinedAt: string | null;
  performance: AgentPerformance;
  book: BookSnapshot;
  positions: AgentPositionRow[];
  trades: PublicConfirmedTrade[];
  theses: AgentThesisRow[];
  activity: FeedEvent[];
};

export type FomoScanPayload = {
  kind: "fomoscan";
  source: "fomoscan";
  trader: FomoScanUser & { source?: "fomoscan" };
  theses: { items: FomoScanThesis[]; source?: "fomoscan" };
  pnl: FomoScanPnl | null;
};

export type MissingAgentPayload = {
  kind: "unavailable";
  handle: string;
  reason: string;
  /** Always not_found — quota/timeout is not a live Fomo profile. */
  code: "not_found";
  /** Fomo 402/429/5xx/timeout: lookup did not confirm a human. */
  fomoLookupPaused?: boolean;
};

export type AgentPagePayload =
  | MuseAgentPayload
  | FomoScanPayload
  | { kind: "token"; market: TokenMarket }
  | MissingAgentPayload;

/** Fomo identity lookup did not confirm a human — never treat as an existing trader. */
export function isFomoIdentityLookupPaused(status: number, code?: string): boolean {
  if (status === 402 || status === 408 || status === 429 || status >= 500) return true;
  const key = (code ?? "").toUpperCase().replace(/-/g, "_");
  switch (key) {
    case "QUOTA_EXCEEDED":
    case "HTTP_402":
    case "HTTP_408":
    case "HTTP_429":
    case "RATE_LIMIT":
    case "RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
    case "NETWORK":
    case "TIMEOUT":
    case "ABORT":
    case "ABORTED":
    case "FOMOSCAN_UNAVAILABLE":
      return true;
    default:
      return false;
  }
}

export function missingMuseAgent(
  handle: string,
  fomo?: { status: number; code: string },
): MissingAgentPayload {
  const paused = fomo ? isFomoIdentityLookupPaused(fomo.status, fomo.code) : false;
  return {
    kind: "unavailable",
    handle,
    code: "not_found",
    reason: "No Muse agent",
    ...(paused ? { fomoLookupPaused: true } : {}),
  };
}

const AGENT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeAgentId(value: string): boolean {
  return AGENT_ID_RE.test(value);
}

export function toPublicAgent(agent: Agent): PublicAgent {
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

function safePathParam(raw: string): string {
  const trimmed = raw.replace(/^@/, "").trim();
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export async function lookupLocalAgent(idOrHandle: string) {
  return findLocalAgent(idOrHandle);
}

async function findLocalAgent(idOrHandle: string) {
  const raw = safePathParam(idOrHandle);
  if (MINT_RE.test(raw)) return null;
  const byId = await findAgentById(raw).catch(() => null);
  if (byId) return byId;
  return findAgentByHandle(raw).catch(() => null);
}

export const loadAgentPage = cache(async (idOrHandle: string): Promise<AgentPagePayload> => {
  try {
    return await loadAgentPageUnsafe(idOrHandle);
  } catch {
    return missingMuseAgent(safePathParam(idOrHandle));
  }
});

async function loadAgentPageUnsafe(idOrHandle: string): Promise<AgentPagePayload> {
  const agent = await findLocalAgent(idOrHandle);
  if (!agent) {
    const handle = safePathParam(idOrHandle);
    if (MINT_RE.test(handle)) {
      const market = await getTokenMarket(handle);
      return { kind: "token", market };
    }
    const trader = await resolveFomoScanTrader(handle);
    if (!trader.ok) {
      return missingMuseAgent(handle, trader);
    }
    const user = normalizeUser(trader.data) ?? trader.data;
    const [theses, pnl] = await Promise.all([
      getFomoScanUserTheses(user.id).then(readThesisPage),
      getFomoScanUserPnl(user.handle),
    ]);
    const media = theses.ok
      ? await collectThesisMedia(theses.data.items)
      : { avatars: new Map<string, string>(), tokens: new Map<string, string>() };
    const items = theses.ok ? decorateTheses(theses.data.items, media.avatars, media.tokens) : [];
    const pnlData = pnl.ok ? normalizePnl(pnl.data) : null;
    const picture = proxiedImage(pickUserAvatar(user) ?? pnlData?.avatarUrl ?? user.profilePicture);
    return {
      kind: "fomoscan",
      source: "fomoscan",
      trader: {
        ...user,
        source: "fomoscan" as const,
        profilePicture: picture,
        banner: proxiedImage(user.banner),
        followers: pnlData?.followers ?? user.followers ?? null,
        name: user.name ?? pnlData?.displayName ?? null,
      },
      pnl: pnlData,
      theses: theses.ok
        ? { ...theses.data, items, source: "fomoscan" as const }
        : { items, source: "fomoscan" as const },
    };
  }

  const [theses, trades, followers, wallet, activity] = await Promise.all([
    listThesesForAgent(agent.id),
    listConfirmedTradesForAgent(agent.id),
    countFollowers(agent.id).catch(() => 0),
    agent.walletAddress
      ? getWalletSnapshot(agent.walletAddress).catch(() => null)
      : Promise.resolve(null),
    listAgentFeedEvents(agent),
  ]);

  const book = await buildBook(trades, agent.id);
  const mintSet = new Set<string>();
  for (const position of book.positions) mintSet.add(position.mint);
  for (const thesis of theses) mintSet.add(thesis.mint);
  for (const trade of trades) mintSet.add(trade.side === "buy" ? trade.outputMint : trade.inputMint);
  for (const token of wallet?.tokens ?? []) mintSet.add(token.mint);
  const cards = await getDexTokenCards([...mintSet]).catch(() => new Map());
  const marks = new Map<string, AgentMark>();
  for (const mint of mintSet) {
    const card = cards.get(mint);
    const held = wallet?.tokens.find((token) => token.mint === mint);
    const bookPos = book.positions.find((row) => row.mint === mint);
    marks.set(mint, {
      symbol: card?.symbol ?? held?.symbol ?? null,
      image: proxiedImage(card?.image ?? held?.imageUrl ?? null),
      priceUsd: bookPos?.markUsd ?? (typeof card?.priceUsd === "string" ? card.priceUsd : null),
      decimals: bookPos?.decimals ?? held?.decimals ?? null,
    });
  }

  return {
    kind: "agent",
    agent: toPublicAgent(agent),
    identity: museIdentity(agent.id),
    followers,
    joinedAt: agent.claimedAt ?? agent.createdAt,
    performance: performanceFromBook(book, trades),
    book,
    positions: decoratePositions(book.positions, wallet, marks),
    trades: trades.map(publicTrade),
    theses: theses.map((thesis) => ({
      ...thesis,
      symbol: marks.get(thesis.mint)?.symbol ?? null,
      image: marks.get(thesis.mint)?.image ?? null,
    })),
    activity,
  };
}

export function agentShareMeta(data: AgentPagePayload): Metadata {
  const appUrl = publicAppUrl();
  switch (data.kind) {
    case "agent": {
      const name = data.agent.displayName ?? data.agent.handle;
      const title = `${name} (@${data.agent.handle}) · Muse`;
      const description =
        data.agent.bio?.trim()
        || `${name} is a Muse agent on MUSE FOMO. Confirmed fills only — no invented tape.`;
      const image = data.identity.src;
      return {
        title,
        description,
        alternates: { canonical: `${appUrl}/agent/${data.agent.id}` },
        openGraph: {
          title,
          description,
          url: `${appUrl}/agent/${data.agent.id}`,
          images: [image],
        },
        twitter: {
          card: "summary_large_image",
          site: X_AT,
          creator: X_AT,
          title,
          description,
          images: [image],
        },
      };
    }
    case "fomoscan": {
      const name = data.trader.name ?? data.trader.handle;
      const title = `${name} (@${data.trader.handle})`;
      const description =
        data.trader.bio?.trim()
        || `Human trader @${data.trader.handle}.`;
      const image = data.trader.profilePicture || "/brand/rocket-cube.jpg";
      const url = `${appUrl}/profile/${encodeURIComponent(data.trader.handle)}`;
      return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: { title, description, url, images: [image] },
        twitter: {
          card: "summary_large_image",
          site: X_AT,
          title,
          description,
          images: [image],
        },
      };
    }
    case "token": {
      const title = `${data.market.symbol ?? "Token"} · market`;
      const description = "That path is a mint, not a Muse agent.";
      return { title, description };
    }
    case "unavailable": {
      return {
        title: "No Muse agent · MUSE FOMO",
        description: "No Muse agent at this path.",
        robots: { index: false },
      };
    }
    default: {
      const _never: never = data;
      return _never;
    }
  }
}
