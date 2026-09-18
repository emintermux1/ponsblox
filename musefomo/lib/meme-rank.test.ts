import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BONK_MINT, WIF_MINT } from "./constants";
import {
  isPadTrendSymbol,
  isPricedSolanaMeme,
  rankLiveMemes,
  type MemeSeed,
  type QualityIndex,
} from "./meme-rank";
import type { DiscoverTokenRow } from "./types";

function seed(partial: Partial<MemeSeed> & { mint: string }): MemeSeed {
  return {
    rank: 0,
    symbol: "AAA",
    name: "Aaa",
    imageUrl: "https://cdn.dexscreener.com/cms/images/a.png",
    priceUsd: 1,
    volumeUsd: 10_000,
    volumeLamports: null,
    marketCap: 1_000_000,
    priceChange24h: 2,
    holders: null,
    trades: null,
    pairAddress: null,
    source: "market",
    ...partial,
  };
}

const emptyQuality: QualityIndex = { mints: new Set(), symbols: new Set(), logos: new Map() };

describe("meme rank", () => {
  it("drops pad leftovers and majors", () => {
    assert.equal(isPadTrendSymbol("SNAPPAD"), true);
    assert.equal(isPadTrendSymbol("GITPAD"), true);
    assert.equal(isPadTrendSymbol("LONGER"), true);
    assert.equal(isPadTrendSymbol("BONK"), false);
    const pad: DiscoverTokenRow = seed({ mint: WIF_MINT, symbol: "SNAPPAD" });
    assert.equal(isPricedSolanaMeme(pad), false);
  });

  it("keeps unique symbols, prefers volume and quality lists, and caps unlisted pump", () => {
    const quality: QualityIndex = {
      mints: new Set([BONK_MINT]),
      symbols: new Set(["WIF"]),
      logos: new Map([[BONK_MINT, "https://cdn.dexscreener.com/cms/images/bonk.png"]]),
    };
    const ranked = rankLiveMemes(
      [
        seed({ mint: "PumpMint111111111111111111111111111111111", symbol: "PAID", volumeUsd: 9_000_000, via: "pump" }),
        seed({ mint: "PumpMint222222222222222222222222222222222", symbol: "STONK", volumeUsd: 8_000_000, via: "pump" }),
        seed({ mint: "PumpMint333333333333333333333333333333333", symbol: "WANG", volumeUsd: 7_000_000, via: "pump" }),
        seed({ mint: "PumpMint444444444444444444444444444444444", symbol: "PUMP", volumeUsd: 6_000_000, via: "pump" }),
        seed({ mint: "PumpMint555555555555555555555555555555555", symbol: "USELESS", volumeUsd: 5_000_000, via: "pump" }),
        seed({ mint: "PumpMint666666666666666666666666666666666", symbol: "LOOP", volumeUsd: 4_000_000, via: "pump" }),
        seed({ mint: "PumpMint777777777777777777777777777777777", symbol: "JUNK", volumeUsd: 3_000_000, via: "pump" }),
        seed({ mint: BONK_MINT, symbol: "BONK", volumeUsd: 400_000, via: "gecko", liquidityUsd: 2_000_000 }),
        seed({ mint: WIF_MINT, symbol: "WIF", volumeUsd: 350_000, via: "jupiter", liquidityUsd: 1_500_000 }),
        seed({ mint: "GeckoMint11111111111111111111111111111111", symbol: "PENGU", volumeUsd: 200_000, via: "gecko" }),
        seed({ mint: "DexMint1111111111111111111111111111111111", symbol: "PENGU", volumeUsd: 50_000, via: "dex" }),
        seed({ mint: "DeadMint111111111111111111111111111111111", symbol: "DEAD", volumeUsd: 0, priceUsd: 1, via: "pump" }),
      ],
      quality,
      24,
    );
    const symbols = ranked.map((row) => row.symbol);
    assert.ok(symbols.includes("BONK"));
    assert.ok(symbols.includes("WIF"));
    assert.ok(symbols.includes("PENGU"));
    assert.equal(symbols.filter((symbol) => symbol === "PENGU").length, 1);
    assert.ok(!symbols.includes("DEAD"));
    assert.ok(!symbols.includes("SNAPPAD"));
    const unlistedPump = ranked.filter((row) =>
      ["PAID", "STONK", "WANG", "PUMP", "USELESS", "LOOP", "JUNK"].includes(row.symbol ?? ""),
    );
    assert.ok(unlistedPump.length <= 6);
    assert.ok(ranked[0]?.symbol === "BONK" || ranked[0]?.symbol === "WIF" || ranked[0]?.symbol === "PENGU");
    assert.equal(ranked[0]?.imageUrl?.startsWith("https://"), true);
  });
});
