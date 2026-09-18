import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { coinRowsToBoard, mergeLiveCoinRows } from "./hydrate";
import type { DiscoverTokenRow } from "@/lib/types";

function row(partial: Partial<DiscoverTokenRow> & { mint: string }): DiscoverTokenRow {
  return {
    rank: 0,
    symbol: null,
    name: null,
    imageUrl: null,
    priceUsd: null,
    volumeUsd: null,
    volumeLamports: null,
    marketCap: null,
    priceChange24h: null,
    holders: null,
    trades: null,
    pairAddress: null,
    source: "market",
    ...partial,
  };
}

describe("live coin merge", () => {
  it("dedupes mints and prefers filled fields without inventing prices", () => {
    const merged = mergeLiveCoinRows([
      row({ mint: "Aaa", symbol: "AAA", volumeUsd: 100 }),
      row({ mint: "Aaa", name: "Alpha", priceUsd: 1.25 }),
      row({ mint: "Bbb", symbol: "BBB", volumeUsd: 50 }),
    ]);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].mint, "Aaa");
    assert.equal(merged[0].symbol, "AAA");
    assert.equal(merged[0].name, "Alpha");
    assert.equal(merged[0].priceUsd, 1.25);
    assert.equal(merged[0].rank, 1);
    assert.equal(merged[1].mint, "Bbb");
  });

  it("drops placeholder symbols so a later source can fill the name", () => {
    const merged = mergeLiveCoinRows([
      row({ mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "-", priceUsd: 0.00001 }),
      row({
        mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        symbol: "BONK",
        imageUrl: "https://cdn.dexscreener.com/cms/images/bonk.png",
      }),
    ]);
    assert.equal(merged[0]?.symbol, "BONK");
    assert.equal(merged[0]?.imageUrl, "https://cdn.dexscreener.com/cms/images/bonk.png");
  });

  it("maps rows to ticker entries without inventing handles", () => {
    const board = coinRowsToBoard([row({ mint: "Mint1", symbol: "SOL", rank: 1, priceUsd: 2 })]);
    assert.equal(board[0]?.id, "Mint1");
    assert.equal(board[0]?.handle, "SOL");
    assert.equal(board[0]?.price, 2);
  });
});
