import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cacheSet } from "./cache";
import { WIF_MINT } from "./constants";
import { peekHomePaint, peekLastGoodTheses, peekLastGoodTrending } from "./home-paint";
import type { DiscoverTokenRow, FomoScanThesis } from "./types";

function token(partial: Partial<DiscoverTokenRow> & { mint: string }): DiscoverTokenRow {
  return {
    rank: 1,
    symbol: "WIF",
    name: "dogwifhat",
    imageUrl: "https://cdn.dexscreener.com/cms/images/wif.png",
    priceUsd: 0.18,
    volumeUsd: 1_000_000,
    volumeLamports: null,
    marketCap: 180_000_000,
    priceChange24h: 2.4,
    holders: null,
    trades: null,
    pairAddress: null,
    source: "market",
    ...partial,
  };
}

function thesis(partial: Pick<FomoScanThesis, "id" | "authorHandle" | "thesis">): FomoScanThesis {
  return {
    id: partial.id,
    tokenAddress: null,
    tokenNetwork: null,
    tokenSymbol: null,
    authorId: partial.authorHandle,
    authorHandle: partial.authorHandle,
    authorName: partial.authorHandle,
    authorIsDev: null,
    thesis: partial.thesis,
    likeCount: null,
    holdingsUsd: null,
    authorTradeUsd: null,
    pnl: null,
    realizedPnlUsd: null,
    unrealizedPnlUsd: null,
    percentageRealizedPnl: null,
    percentageUnrealizedPnl: null,
    tokenAmount: null,
    closedAt: null,
    fomoCreatedAt: 1,
    updatedAt: null,
  };
}

describe("home first paint cache", () => {
  it("peeks last-good tokens synchronously and ignores pad leftovers", () => {
    cacheSet(
      "meme-rank:v1:48",
      [
        token({ mint: WIF_MINT, symbol: "WIF" }),
        token({ mint: "So11111111111111111111111111111111111111112", symbol: "SOL" }),
        token({ mint: WIF_MINT, symbol: "SNAPPAD" }),
      ],
      60_000,
    );
    const started = Date.now();
    const rows = peekLastGoodTrending();
    assert.ok(Date.now() - started < 20);
    assert.equal(rows.some((row) => row.symbol === "WIF"), true);
    assert.ok(rows.every((row) => row.imageUrl?.startsWith("https://") && !row.imageUrl.includes("/api/img")));
    assert.equal(
      rows.some((row) => (row.symbol ?? "").toUpperCase() === "SOL" || (row.symbol ?? "").toUpperCase() === "SNAPPAD"),
      false,
    );
  });

  it("drops blog/learn word-salad and stays empty-honest without a real thesis", () => {
    cacheSet(
      "feed:cached-theses:v2",
      [
        thesis({
          id: "family:learn:logjam-meme",
          authorHandle: "Logjam",
          thesis: "Crypto trader Logjam breaks down his epic Penguin trade.",
        }),
        thesis({ id: "t1", authorHandle: "chengang_nft", thesis: "cryptodtradingmistakes onchainmarketpsychology" }),
      ],
      60_000,
    );
    assert.equal(peekLastGoodTheses().length, 0);
    const forYou = peekHomePaint("for-you");
    assert.equal(forYou.theses.length, 0);
    const thesisTab = peekHomePaint("thesis");
    assert.equal(thesisTab.theses.length, 0);
  });

  it("unwraps proxied last-good logos to direct https", () => {
    cacheSet(
      "meme-rank:v1:48",
      [
        token({
          mint: WIF_MINT,
          symbol: "WIF",
          imageUrl: `/api/img?url=${encodeURIComponent("https://static.jup.ag/jup/icon.png")}`,
        }),
      ],
      60_000,
    );
    const rows = peekLastGoodTrending();
    assert.equal(rows[0]?.imageUrl, "https://static.jup.ag/jup/icon.png");
  });

  it("never throws when last-good cache is garbage", () => {
    cacheSet("meme-rank:v1:48", "nope" as unknown as DiscoverTokenRow[], 60_000);
    const rows = peekLastGoodTrending();
    assert.ok(rows.length >= 4);
    assert.equal(rows[0]?.symbol, "WIF");
  });

  it("keeps a fresh trader thesis on For You and Thesis", () => {
    cacheSet(
      "feed:cached-theses:v2",
      [{ ...thesis({ id: "t9", authorHandle: "kaiser", thesis: "fade this pump" }), fomoCreatedAt: Date.now() }],
      60_000,
    );
    assert.equal(peekHomePaint("for-you").theses[0]?.id, "t9");
    assert.equal(peekHomePaint("thesis").theses[0]?.id, "t9");
  });

  it("drops 238-day leftovers instead of painting them", () => {
    const now = Date.now();
    cacheSet(
      "feed:cached-theses:v2",
      [
        {
          ...thesis({ id: "ancient", authorHandle: "kaiser", thesis: "fade this pump from last winter" }),
          fomoCreatedAt: now - 238 * 86_400_000,
        },
        {
          ...thesis({ id: "today", authorHandle: "kaiser", thesis: "fade this pump right now" }),
          fomoCreatedAt: now - 6 * 60 * 60 * 1000,
        },
      ],
      60_000,
    );
    const rows = peekLastGoodTheses();
    assert.equal(
      rows.some((row) => row.id === "ancient"),
      false,
    );
    assert.equal(rows[0]?.id, "today");
  });
});

