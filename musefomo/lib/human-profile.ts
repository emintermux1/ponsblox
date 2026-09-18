import { cache } from "react";
import type { Metadata } from "next";

import { publicAppUrl } from "@/lib/app-url";
import { collectThesisMedia, decorateTheses } from "@/lib/avatars";
import { cachePeek } from "@/lib/cache";
import { LEADERBOARD_WINDOWS } from "@/lib/constants";
import {
  bookFromTheses,
  findBoardTrader,
  mergeStats,
  parseEquitySeries,
  statsFromBoardEntry,
  statsFromPnl,
  statsHaveValues,
  thesesForAuthor,
  userFromBoardEntry,
  userFromHarvestItems,
  type HumanBookRow,
  type HumanEquityPoint,
  type HumanProfileSource,
  type HumanProfileStats,
} from "@/lib/human-map";
import { pickUserAvatar, proxiedImage } from "@/lib/media";
import { stripHandle } from "@/lib/profile-href";
import {
  fetchPublicFamilyProfile,
  harvestBoardTrader,
  harvestPublicSocial,
  peekPublicHarvest,
} from "@/lib/providers/public-social";
import {
  readFomoTheses,
  readFomoTrader,
  readFomoTraderFromBoards,
  writeFomoTrader,
} from "@/lib/providers/store";
import { X_AT } from "@/lib/social";
import type {
  FomoScanBoardEntry,
  FomoScanPnl,
  FomoScanThesis,
  FomoScanUser,
  LeaderboardPayload,
  LeaderboardWindow,
} from "@/lib/types";

export type HumanProfilePayload = {
  kind: "human";
  source: HumanProfileSource;
  trader: FomoScanUser;
  stats: HumanProfileStats | null;
  pnl: FomoScanPnl | null;
  equity: HumanEquityPoint[] | null;
  theses: FomoScanThesis[];
  positions: HumanBookRow[] | null;
  swaps: HumanBookRow[] | null;
};

export const loadHumanProfile = cache(async (rawHandle: string): Promise<HumanProfilePayload | null> => {
  const handle = stripHandle(rawHandle);
  if (!handle) return null;

  let source: HumanProfileSource | null = null;
  let trader: FomoScanUser | null = null;
  let publicEquity: HumanEquityPoint[] | null = null;

  const [cached, boardHit] = await Promise.all([readFomoTrader(handle), readFomoTraderFromBoards(handle)]);
  if (cached) {
    trader = cached;
    source = "cache";
  }
  let board = boardHit;
  if (!trader && board) {
    trader = userFromBoardEntry(board.entry);
    source = "cache";
  }

  let harvestTheses: FomoScanThesis[] = [];
  if (!trader || !board) {
    const fromHarvest = await resolveHarvestedTrader(handle);
    if (fromHarvest) {
      harvestTheses = fromHarvest.items;
      if (!board && fromHarvest.entry) board = { entry: fromHarvest.entry, window: fromHarvest.window };
      if (!trader && fromHarvest.entry) {
        trader = userFromBoardEntry(fromHarvest.entry);
        source = "cache";
      }
    }
  }

  if (!trader) {
    const pub = await fetchPublicFamilyProfile(handle);
    if (pub?.user) {
      trader = pub.user;
      source = "fomo-public";
      publicEquity = pub.equity;
    }
  }
  if (!trader && harvestTheses.length) {
    trader = userFromHarvestItems(handle, harvestTheses);
    if (trader) source = "cache";
  }
  if (!trader || !source) return null;

  void writeFomoTrader(trader);

  const pnl = null as FomoScanPnl | null;
  let theses = await readFomoTheses({ author: trader.handle, limit: 40 });
  if (!theses.length && trader.id !== trader.handle) {
    theses = await readFomoTheses({ author: trader.id, limit: 40 });
  }
  if (!theses.length && harvestTheses.length) {
    theses = thesesForAuthor(harvestTheses, trader);
  }

  const media = theses.length
    ? await collectThesisMedia(theses)
    : { avatars: new Map<string, string>(), tokens: new Map<string, string>() };
  const items = theses.length ? decorateTheses(theses, media.avatars, media.tokens) : [];
  const book = bookFromTheses(items);
  const boardStats = board ? statsFromBoardEntry(board.entry, board.window) : null;
  const pnlStats = pnl ? statsFromPnl(pnl) : null;
  const stats = mergeStats(pnlStats, boardStats);
  const picture = proxiedImage(pickUserAvatar(trader) ?? pnl?.avatarUrl ?? trader.profilePicture);
  const followers = pnl?.followers ?? trader.followers ?? board?.entry.followers ?? null;

  return {
    kind: "human",
    source,
    trader: {
      ...trader,
      name: trader.name ?? pnl?.displayName ?? board?.entry.label ?? null,
      profilePicture: picture,
      banner: proxiedImage(trader.banner),
      followers,
    },
    stats: statsHaveValues(stats) ? stats : null,
    pnl,
    equity: publicEquity ?? parseEquitySeries(null),
    theses: items,
    positions: book.positions.length ? book.positions : null,
    swaps: book.swaps.length ? book.swaps : null,
  };
});

export function humanShareMeta(data: HumanProfilePayload): Metadata {
  const appUrl = publicAppUrl();
  const name = data.trader.name ?? data.trader.handle;
  const title = `${name} (@${data.trader.handle})`;
  const description = data.trader.bio?.trim() || `Trader @${data.trader.handle}.`;
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

async function resolveHarvestedTrader(handle: string): Promise<{
  entry: FomoScanBoardEntry | null;
  window: LeaderboardWindow;
  items: FomoScanThesis[];
} | null> {
  const memory = traderFromLeaderboardMemory(handle);
  if (memory) return { ...memory, items: [] };
  const peeked = harvestBoardTrader(handle, peekPublicHarvest());
  if (peeked) return peeked;
  const harvested = await harvestPublicSocial().catch(() => null);
  const fromBoard = harvestBoardTrader(handle, harvested);
  if (fromBoard) return fromBoard;
  if (!harvested?.items.length) return null;
  if (!userFromHarvestItems(handle, harvested.items)) return null;
  return { entry: null, window: "24h", items: harvested.items };
}

function traderFromLeaderboardMemory(handle: string) {
  const boards: Partial<Record<LeaderboardWindow, { entries: FomoScanBoardEntry[] }>> = {};
  for (const window of LEADERBOARD_WINDOWS) {
    const peek = cachePeek<LeaderboardPayload>(`leaderboard:muse+fomo:${window}`);
    const entries = peek?.value.fomo?.entries;
    if (entries?.length) boards[window] = { entries };
  }
  return findBoardTrader(boards, handle);
}
