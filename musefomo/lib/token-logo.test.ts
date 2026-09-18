import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyTokenLook,
  asHttpsLogo,
  canonicalImageUrl,
  cleanTokenLabel,
  geckoIncludedLooks,
  jupiterRowsToDiscover,
  logoCandidates,
  mapJupiterMints,
  pickLogoUri,
} from "./token-logo";
import type { DiscoverTokenRow } from "@/lib/types";

describe("token logos", () => {
  it("rewrites ipfs and http image URLs to https", () => {
    assert.equal(
      canonicalImageUrl("ipfs://QmZ7L8yd5j36oXXydUiYFiFsRHbi3EdgC4RuFwvM7dcqge"),
      "https://ipfs.io/ipfs/QmZ7L8yd5j36oXXydUiYFiFsRHbi3EdgC4RuFwvM7dcqge",
    );
    assert.equal(
      canonicalImageUrl("http://cdn.dexscreener.com/cms/images/bonk.png"),
      "https://cdn.dexscreener.com/cms/images/bonk.png",
    );
    assert.equal(canonicalImageUrl("https://static.datapi.jup.ag/images/asset-icon/stonk.webp"), "https://static.datapi.jup.ag/images/asset-icon/stonk.webp");
    assert.equal(canonicalImageUrl("-"), null);
    assert.equal(
      asHttpsLogo("https://musefomo.family/api/img?url=https%3A%2F%2Fstatic.jup.ag%2Fjup%2Ficon.png"),
      "https://static.jup.ag/jup/icon.png",
    );
    assert.equal(
      asHttpsLogo("/_next/image?url=https%3A%2F%2Fcdn.dexscreener.com%2Fcms%2Fimages%2Fbonk.png&w=64&q=75"),
      "https://cdn.dexscreener.com/cms/images/bonk.png",
    );
    assert.equal(asHttpsLogo("/api/img?url=https%3A%2F%2Fimg.birdeye.so%2Fsol.png"), "https://img.birdeye.so/sol.png");
    assert.equal(asHttpsLogo("/logo.png"), null);
    assert.equal(asHttpsLogo("ipfs://QmZ7L8yd5j36oXXydUiYFiFsRHbi3EdgC4RuFwvM7dcqge")?.startsWith("https://"), true);
  });

  it("picks Jupiter/Dex/Birdeye logoURI fields and builds direct CDN fallbacks", () => {
    assert.equal(
      pickLogoUri(null, "https://img.birdeye.so/sol.png", "https://static.jup.ag/jup/icon.png"),
      "https://img.birdeye.so/sol.png",
    );
    const mint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
    const candidates = logoCandidates(`/api/img?url=${encodeURIComponent(`https://static.jup.ag/jup/icon.png`)}`, mint);
    assert.equal(candidates[0], "https://static.jup.ag/jup/icon.png");
    assert.ok(candidates.includes(`https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`));
    assert.ok(candidates.includes(`https://img.birdeye.so/${mint}.png`));
    assert.ok(!candidates.some((url) => url.includes("/api/img") || url.includes("/_next/image")));
  });

  it("drops placeholder and mint-stub labels", () => {
    const mint = "2eMoMqs1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    assert.equal(cleanTokenLabel("-"), null);
    assert.equal(cleanTokenLabel("—"), null);
    assert.equal(cleanTokenLabel("2eMoMqs1", mint), null);
    assert.equal(cleanTokenLabel("BONK"), "BONK");
    assert.equal(cleanTokenLabel("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"), null);
  });

  it("maps Jupiter lite trending fields including icon", () => {
    const rows = mapJupiterMints([
      {
        id: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        name: "Bonk",
        symbol: "Bonk",
        icon: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
        logoURI: "https://img.birdeye.so/bonk.png",
        usdPrice: 0.00001,
        mcap: 100,
      },
    ]);
    assert.equal(rows[0]?.symbol, "Bonk");
    assert.equal(rows[0]?.imageUrl, "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I");
    assert.equal(
      mapJupiterMints([{ id: "So11111111111111111111111111111111111111112", logoURI: "https://img.birdeye.so/sol.png" }])[0]
        ?.imageUrl,
      "https://img.birdeye.so/sol.png",
    );
    const discover = jupiterRowsToDiscover(rows);
    assert.equal(discover[0]?.imageUrl, rows[0]?.imageUrl);
  });

  it("reads Gecko included token images", () => {
    const looks = geckoIncludedLooks({
      included: [
        {
          id: "solana_DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
          type: "token",
          attributes: {
            address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
            symbol: "BONK",
            name: "Bonk",
            image_url: "https://assets.geckoterminal.com/bonk",
          },
        },
      ],
    });
    assert.equal(looks.get("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")?.imageUrl, "https://assets.geckoterminal.com/bonk");
    assert.equal(looks.get("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")?.symbol, "BONK");
  });

  it("fills a mint-stub row from a resolved look without inventing a logo", () => {
    const mint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
    const row: DiscoverTokenRow = {
      rank: 1,
      mint,
      symbol: mint.slice(0, 8),
      name: null,
      imageUrl: null,
      priceUsd: 1,
      volumeUsd: null,
      volumeLamports: null,
      marketCap: null,
      priceChange24h: null,
      holders: null,
      trades: null,
      source: "market",
    };
    const next = applyTokenLook(row, {
      symbol: "Bonk",
      name: "Bonk",
      imageUrl: "https://cdn.dexscreener.com/cms/images/bonk.png",
    });
    assert.equal(next.symbol, "Bonk");
    assert.equal(next.imageUrl, "https://cdn.dexscreener.com/cms/images/bonk.png");
    assert.equal(applyTokenLook(row, { symbol: null, name: null, imageUrl: null }).imageUrl, null);
  });
});
