import assert from "node:assert/strict";
import { test } from "node:test";

import { mapBirdeyeSearchHits, mapGeckoSearchHits } from "./search";

test("mapGeckoSearchHits keeps Solana names and logos", () => {
  const hits = mapGeckoSearchHits({
    data: [
      {
        attributes: {
          address: "pool1",
          name: "BONK / SOL",
          base_token_price_usd: "0.000012",
          market_cap_usd: "900000000",
          volume_usd: { h24: "12000000" },
          price_change_percentage: { h24: "4.2" },
        },
        relationships: { base_token: { data: { id: "solana_DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" } } },
      },
    ],
    included: [
      {
        id: "solana_DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        type: "token",
        attributes: {
          address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
          symbol: "BONK",
          name: "Bonk",
          image_url: "https://assets.geckoterminal.com/bonk.png",
        },
      },
    ],
  });
  assert.equal(hits[0]?.mint, "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
  assert.equal(hits[0]?.symbol, "BONK");
  assert.equal(hits[0]?.name, "Bonk");
  assert.equal(hits[0]?.imageUrl, "https://assets.geckoterminal.com/bonk.png");
});

test("mapBirdeyeSearchHits keeps Solana names and logos", () => {
  const hits = mapBirdeyeSearchHits({
    success: true,
    data: {
      items: [
        {
          type: "token",
          result: [
            {
              name: "Wrapped SOL",
              symbol: "SOL",
              address: "So11111111111111111111111111111111111111112",
              network: "solana",
              logo_uri: "https://img.birdeye.so/sol.png",
              price: 151.8,
              volume_24h_usd: 1000,
            },
          ],
        },
      ],
    },
  });
  assert.equal(hits[0]?.mint, "So11111111111111111111111111111111111111112");
  assert.equal(hits[0]?.symbol, "SOL");
  assert.equal(hits[0]?.name, "Wrapped SOL");
  assert.equal(hits[0]?.imageUrl, "https://img.birdeye.so/sol.png");
});
