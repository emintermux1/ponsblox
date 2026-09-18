import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SOL_MINT, WIF_MINT } from "./constants";
import { knownMint, overlayKnownMarket, resolveMintRef } from "./known-mints";
import { MUSE_FOMO_CA, MUSE_FOMO_LOGO, MUSE_FOMO_SYMBOL } from "./pinned-tokens";

describe("known mints", () => {
  it("resolves WIF alias and official symbol", () => {
    assert.equal(resolveMintRef("wif"), WIF_MINT);
    const known = knownMint(WIF_MINT);
    assert.equal(known?.symbol, "WIF");
    assert.equal(known?.name, "dogwifhat");
  });

  it("overlays missing symbol without inventing a price", () => {
    const next = overlayKnownMarket({
      mint: SOL_MINT,
      symbol: null,
      name: null,
      imageUrl: null,
      priceUsd: null,
      priceChange24h: null,
      volume24h: null,
      liquidityUsd: null,
      marketCap: null,
      fdv: null,
      pairAddress: null,
      dexId: null,
      decimals: null,
      buys24h: null,
      sells24h: null,
      buyVolume24h: null,
      sellVolume24h: null,
    });
    assert.equal(next.symbol, "SOL");
    assert.equal(next.priceUsd, null);
  });

  it("replaces a mint-shaped symbol with the official ticker", () => {
    const next = overlayKnownMarket({
      mint: WIF_MINT,
      symbol: WIF_MINT,
      name: WIF_MINT,
      imageUrl: null,
      priceUsd: 0.4,
      priceChange24h: null,
      volume24h: null,
      liquidityUsd: null,
      marketCap: null,
      fdv: null,
      pairAddress: null,
      dexId: null,
      decimals: null,
      buys24h: null,
      sells24h: null,
      buyVolume24h: null,
      sellVolume24h: null,
    });
    assert.equal(next.symbol, "WIF");
    assert.equal(next.name, "dogwifhat");
    assert.equal(next.priceUsd, 0.4);
  });

  it("unwraps /api/img logos to https and never keeps the proxy path", () => {
    const next = overlayKnownMarket({
      mint: SOL_MINT,
      symbol: "SOL",
      name: "Solana",
      imageUrl: `/api/img?url=${encodeURIComponent("https://img.birdeye.so/sol.png")}`,
      priceUsd: null,
      priceChange24h: null,
      volume24h: null,
      liquidityUsd: null,
      marketCap: null,
      fdv: null,
      pairAddress: null,
      dexId: null,
      decimals: null,
      buys24h: null,
      sells24h: null,
      buyVolume24h: null,
      sellVolume24h: null,
    });
    assert.equal(next.imageUrl, "https://img.birdeye.so/sol.png");
    assert.ok(!next.imageUrl?.includes("/api/img"));
    assert.ok(next.imageUrl?.startsWith("https://"));
  });

  it("resolves the pinned Robinhood CA without a Solana Dex logo", () => {
    assert.equal(resolveMintRef("muse fomo"), MUSE_FOMO_CA);
    const known = knownMint(MUSE_FOMO_CA.toUpperCase());
    assert.equal(known?.symbol, MUSE_FOMO_SYMBOL);
    assert.equal(known?.imageUrl, MUSE_FOMO_LOGO);
    const next = overlayKnownMarket({
      mint: MUSE_FOMO_CA,
      symbol: null,
      name: null,
      imageUrl: null,
      priceUsd: null,
      priceChange24h: null,
      volume24h: null,
      liquidityUsd: null,
      marketCap: null,
      fdv: null,
      pairAddress: null,
      dexId: null,
      decimals: null,
      buys24h: null,
      sells24h: null,
      buyVolume24h: null,
      sellVolume24h: null,
    });
    assert.equal(next.symbol, MUSE_FOMO_SYMBOL);
    assert.equal(next.imageUrl, MUSE_FOMO_LOGO);
    assert.ok(!next.imageUrl?.includes("/api/img"));
    assert.ok(!next.imageUrl?.includes("solana/0x"));
    assert.equal(next.priceUsd, null);
  });
});
