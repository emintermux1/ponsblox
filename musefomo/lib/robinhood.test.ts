import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isQuotedRobinhoodRow, isXStockRow } from "@/lib/robinhood";
import type { DiscoverTokenRow } from "@/lib/types";

function row(partial: Partial<DiscoverTokenRow> & { mint: string }): DiscoverTokenRow {
  return {
    rank: 1,
    symbol: "TSLAx",
    name: "Tesla xStock",
    imageUrl: null,
    priceUsd: 250,
    volumeUsd: 1_000,
    volumeLamports: null,
    marketCap: 1_000_000,
    priceChange24h: 1.2,
    holders: null,
    trades: null,
    pairAddress: "pair",
    source: "market",
    ...partial,
  };
}

describe("robinhood rows", () => {
  it("keeps only live-priced Solana mints", () => {
    assert.equal(
      isQuotedRobinhoodRow(row({ mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB" })),
      true,
    );
    assert.equal(isQuotedRobinhoodRow(row({ mint: "not-a-mint", priceUsd: 1 })), false);
    assert.equal(
      isQuotedRobinhoodRow(row({ mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB", priceUsd: null })),
      false,
    );
  });

  it("keeps named xStocks and drops liquid majors", () => {
    assert.equal(
      isXStockRow(row({ mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB" })),
      true,
    );
    assert.equal(
      isXStockRow(
        row({
          mint: "So11111111111111111111111111111111111111112",
          symbol: "SOL",
          name: "Wrapped SOL",
        }),
      ),
      false,
    );
  });
});
