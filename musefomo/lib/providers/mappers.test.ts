import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapBirdeyeOverview, mapBirdeyePrice, mapBirdeyeTrending } from "./birdeye";
import { mapGmgnKline, mapGmgnTokenInfo, mapGmgnTrending } from "./gmgn";
import { mapPumpCoin, mapPumpTrending } from "./pump";
import { mapSolscanMeta, mapSolscanTrending } from "./solscan";

describe("provider mappers", () => {
  it("maps official Birdeye overview fields without inventing a price", () => {
    const row = mapBirdeyeOverview(
      {
        success: true,
        data: {
          address: "So11111111111111111111111111111111111111112",
          symbol: "SOL",
          name: "Wrapped SOL",
          logoURI: "https://example.com/sol.png",
          price: 185.82,
          marketCap: 100,
          liquidity: 50,
          v24hUSD: 10,
          priceChange24hPercent: 0.57,
          holder: 12,
        },
      },
      "So11111111111111111111111111111111111111112",
    );
    assert.equal(row?.symbol, "SOL");
    assert.equal(row?.priceUsd, 185.82);
    assert.equal(row?.source, "birdeye");
    assert.equal(mapBirdeyeOverview({ success: true, data: {} }, "x"), null);
  });

  it("maps official Birdeye price value", () => {
    assert.equal(mapBirdeyePrice({ success: true, data: { value: 142.5 } }), 142.5);
    assert.equal(mapBirdeyePrice({ success: true, data: {} }), null);
  });

  it("maps official Birdeye trending tokens", () => {
    const rows = mapBirdeyeTrending({
      success: true,
      data: {
        tokens: [{ address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", volume24hUSD: 1 }],
      },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.symbol, "BONK");
    assert.equal(mapBirdeyeTrending({ data: { tokens: [] } }).length, 0);
  });

  it("maps official Solscan token meta", () => {
    const row = mapSolscanMeta(
      {
        success: true,
        data: {
          address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
          name: "Jupiter",
          symbol: "JUP",
          icon: "https://example.com/jup.png",
          price: 0.42,
          market_cap: 99,
          holder: 10,
          price_change_24h: -2.7,
          total_dex_vol_24h: 14,
        },
      },
      "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    );
    assert.equal(row?.symbol, "JUP");
    assert.equal(row?.volume24h, 14);
    assert.equal(mapSolscanMeta({ success: true, data: {} }, "x"), null);
  });

  it("maps official GMGN token info without inventing a price", () => {
    const row = mapGmgnTokenInfo(
      {
        data: {
          address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
          symbol: "BONK",
          name: "Bonk",
          logo: "https://example.com/bonk.png",
          liquidity: 12,
          circulating_supply: 100,
          holder_count: 9,
          price: { price: "0.02", volume_24h: "40", price_24h: "0.01" },
        },
      },
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    );
    assert.equal(row?.symbol, "BONK");
    assert.equal(row?.priceUsd, 0.02);
    assert.equal(row?.volume24h, 40);
    assert.equal(row?.marketCap, 2);
    assert.equal(row?.source, "gmgn");
    assert.equal(mapGmgnTokenInfo({ data: {} }, "x"), null);
  });

  it("maps official GMGN rank list", () => {
    const rows = mapGmgnTrending({
      data: { rank: [{ address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", volume: 8 }] },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.symbol, "BONK");
    assert.equal(mapGmgnTrending({ data: { rank: [] } }).length, 0);
  });

  it("maps official GMGN kline milliseconds without inventing bars", () => {
    const candles = mapGmgnKline({
      data: { list: [{ time: 1_700_000_000_000, open: "10", high: "12", low: "9", close: "11" }] },
    });
    assert.equal(candles.length, 1);
    assert.equal(candles[0]?.time, 1_700_000_000);
    assert.equal(candles[0]?.close, 11);
    assert.equal(mapGmgnKline({ data: { list: [] } }).length, 0);
  });

  it("maps official Pump coin meta without inventing a price", () => {
    const row = mapPumpCoin(
      {
        mint: "CL4KcMhPpEeNmR7rK7RHsLSTqshoYpasSxHHhduamfe6",
        symbol: "OCO",
        name: "Owners",
        image_uri: "https://example.com/oco.png",
        usd_market_cap: 99,
      },
      "CL4KcMhPpEeNmR7rK7RHsLSTqshoYpasSxHHhduamfe6",
    );
    assert.equal(row?.symbol, "OCO");
    assert.equal(row?.marketCap, 99);
    assert.equal(row?.source, "pump");
    assert.equal(mapPumpCoin({ mint: "x" }, "x"), null);
  });

  it("maps official Pump coin lists", () => {
    const rows = mapPumpTrending([
      { mint: "CL4KcMhPpEeNmR7rK7RHsLSTqshoYpasSxHHhduamfe6", symbol: "OCO", usd_market_cap: 1 },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.symbol, "OCO");
    assert.equal(mapPumpTrending([]).length, 0);
  });

  it("maps official Solscan trending list", () => {
    const rows = mapSolscanTrending({
      success: true,
      data: [{ address: "CL4KcMhPpEeNmR7rK7RHsLSTqshoYpasSxHHhduamfe6", symbol: "OCO", name: "Owners", decimals: 9 }],
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.symbol, "OCO");
  });
});
