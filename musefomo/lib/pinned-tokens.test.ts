import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MUSE_FOMO_CA,
  MUSE_FOMO_LOGO,
  MUSE_FOMO_NAME,
  MUSE_FOMO_PAIR,
  MUSE_FOMO_SYMBOL,
  homeRailRows,
  isPinnedCa,
  pinDiscoverPayload,
  pinRowsFirst,
  pinnedDiscoverRow,
  pinnedTokenHref,
  resolvePinnedQuery,
} from "./pinned-tokens";
import type { DiscoverPayload, DiscoverTokenRow } from "./types";

function row(partial: Partial<DiscoverTokenRow> & { mint: string }): DiscoverTokenRow {
  return {
    rank: 2,
    symbol: "WETH",
    name: "Wrapped Ether",
    imageUrl: null,
    priceUsd: 1,
    volumeUsd: 1,
    volumeLamports: null,
    marketCap: 1,
    priceChange24h: null,
    holders: null,
    trades: null,
    pairAddress: null,
    chain: "robinhood",
    chainTag: "Robinhood Chain",
    href: "/discover",
    source: "market",
    ...partial,
  };
}

describe("pinned Muse FOMO", () => {
  it("resolves the CA, prefix, and public symbol without inventing a ticker", () => {
    assert.equal(resolvePinnedQuery("9334"), MUSE_FOMO_CA);
    assert.equal(resolvePinnedQuery(MUSE_FOMO_CA.toUpperCase()), MUSE_FOMO_CA);
    assert.equal(resolvePinnedQuery("Muse FOMO"), MUSE_FOMO_CA);
    assert.equal(resolvePinnedQuery("musefomo"), MUSE_FOMO_CA);
    assert.equal(isPinnedCa(MUSE_FOMO_CA), true);
    assert.equal(isPinnedCa("So11111111111111111111111111111111111111112"), false);
  });

  it("keeps the Gecko HTTPS logo and in-app token href", () => {
    const pinned = pinnedDiscoverRow();
    assert.equal(pinned.symbol, MUSE_FOMO_SYMBOL);
    assert.equal(pinned.name, MUSE_FOMO_NAME);
    assert.equal(pinned.imageUrl, MUSE_FOMO_LOGO);
    assert.ok(pinned.imageUrl?.startsWith("https://"));
    assert.ok(!pinned.imageUrl?.includes("/api/img"));
    assert.equal(pinned.chain, "robinhood");
    assert.equal(pinned.chainTag, "Robinhood Chain");
    assert.equal(pinned.href, pinnedTokenHref());
    assert.equal(pinned.pairAddress, MUSE_FOMO_PAIR);
    assert.equal(pinned.priceUsd, null);
  });

  it("pins the CA first on discover and the homepage rail", () => {
    const rows = pinRowsFirst([
      row({ mint: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", rank: 1 }),
      row({ mint: MUSE_FOMO_CA, symbol: "Muse FOMO", priceUsd: 0.000009 }),
    ]);
    assert.equal(rows[0]?.mint, MUSE_FOMO_CA);
    assert.equal(rows[0]?.priceUsd, 0.000009);
    assert.equal(rows[0]?.href, `/token/${MUSE_FOMO_CA}`);
    assert.equal(rows[0]?.rank, 1);

    const rail = homeRailRows([row({ mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF" })]);
    assert.equal(rail[0]?.mint, MUSE_FOMO_CA);
    assert.equal(rail[0]?.chainTag, "Robinhood Chain");
    assert.notEqual(rail[1]?.mint, MUSE_FOMO_CA);

    const payload = pinDiscoverPayload({
      trending: null,
      featured: null,
      robinhood: null,
      robinhoodChain: null,
      pons: null,
      museMostTraded: null,
      museMostHeld: null,
      museActivity: null,
      fomoTrending: null,
      fomoMostHeld: null,
      museBoards: null,
      fomoUnavailable: null,
    } satisfies DiscoverPayload);
    assert.equal(payload.featured?.items[0]?.mint, MUSE_FOMO_CA);
    assert.equal(payload.robinhoodChain?.items[0]?.mint, MUSE_FOMO_CA);
  });
});
