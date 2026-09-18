import { cachePeek } from "@/lib/cache";
import { BONK_MINT, JUP_MINT, TRUMP_MINT, WIF_MINT } from "@/lib/constants";
import { looksLikeEvm, looksLikeMint } from "@/lib/format";
import { dexLogo } from "@/lib/known-mints";
import { pickHomeTheses } from "@/lib/thesis-guard";
import { asHttpsLogo } from "@/lib/token-logo";
import type { DiscoverTokenRow, FeedTab, FomoScanThesis } from "@/lib/types";

export const LAST_GOOD_TREND_KEY = "meme-rank:v1:48";

const PAD_SYMBOLS = new Set([
  "LONGER",
  "SNAPPAD",
  "GITPAD",
  "WIKIPAD",
  "ROBLOXPAD",
  "SKINPAD",
  "REDDITPAD",
  "PONS",
  "USDC",
  "USDT",
  "SOL",
  "WSOL",
]);

const THESIS_LIST_KEYS = [
  "feed:public-family-theses:v2",
  "feed:cached-theses",
  "feed:cached-theses:v2",
] as const;

const HOME_FEED_THESIS_KEYS = ["home-feed:v9:thesis:", "home-feed:v9:for-you:"] as const;

export function isHomeSolanaMeme(row: DiscoverTokenRow): boolean {
  const symbol = (row.symbol ?? "").replace(/^\$/, "").toUpperCase();
  if (PAD_SYMBOLS.has(symbol) || row.chain === "robinhood" || looksLikeEvm(row.mint)) return false;
  return looksLikeMint(row.mint);
}

function seedRow(rank: number, mint: string, symbol: string, name: string): DiscoverTokenRow {
  return {
    rank,
    mint,
    symbol,
    name,
    imageUrl: dexLogo(mint),
    priceUsd: null,
    volumeUsd: null,
    volumeLamports: null,
    marketCap: null,
    priceChange24h: null,
    holders: null,
    trades: null,
    pairAddress: null,
    source: "market",
  };
}

/** Always-on rail so homepage never paints a black void on a cold isolate. */
export function seedHomeMemes(): DiscoverTokenRow[] {
  return [
    seedRow(1, WIF_MINT, "WIF", "dogwifhat"),
    seedRow(2, BONK_MINT, "BONK", "Bonk"),
    seedRow(3, TRUMP_MINT, "TRUMP", "OFFICIAL TRUMP"),
    seedRow(4, JUP_MINT, "JUP", "Jupiter"),
  ];
}

export function peekLastGoodTrending(): DiscoverTokenRow[] {
  try {
    const raw = cachePeek<DiscoverTokenRow[]>(LAST_GOOD_TREND_KEY)?.value;
    const rows = Array.isArray(raw)
      ? raw
          .filter(isHomeSolanaMeme)
          .slice(0, 48)
          .map((row) => ({ ...row, imageUrl: asHttpsLogo(row.imageUrl) ?? dexLogo(row.mint) }))
      : [];
    return rows.length ? rows : seedHomeMemes();
  } catch {
    return seedHomeMemes();
  }
}

function pushRealTheses(out: FomoScanThesis[], seen: Set<string>, items: FomoScanThesis[]) {
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
}

/** Last-good real tags only. Never harvest, FomoScan, blog/learn, or people DB. */
export function peekLastGoodTheses(): FomoScanThesis[] {
  try {
    const seen = new Set<string>();
    const out: FomoScanThesis[] = [];
    for (const key of THESIS_LIST_KEYS) {
      pushRealTheses(out, seen, cachePeek<FomoScanThesis[]>(key)?.value ?? []);
    }
    pushRealTheses(out, seen, cachePeek<{ items?: FomoScanThesis[] }>("home:theses:v1:")?.value.items ?? []);
    for (const key of HOME_FEED_THESIS_KEYS) {
      pushRealTheses(out, seen, cachePeek<{ theses?: FomoScanThesis[] }>(key)?.value.theses ?? []);
    }
    return pickHomeTheses(out);
  } catch {
    return [];
  }
}

export function peekHomePaint(tab: FeedTab): {
  tokens: DiscoverTokenRow[];
  theses: FomoScanThesis[];
} {
  return {
    tokens: peekLastGoodTrending(),
    theses: tab === "following" ? [] : peekLastGoodTheses(),
  };
}
