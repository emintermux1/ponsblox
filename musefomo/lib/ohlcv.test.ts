import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SOL_MINT } from "./constants";
import {
  chartWindow,
  clipCandles,
  earlyChartPairs,
  geckoOhlcvUrls,
  mapBirdeyeOhlcv,
  mapDexPaprikaOhlcv,
  mapGeckoOhlcvBody,
} from "./ohlcv";

describe("ohlcv mapping", () => {
  it("maps Gecko ohlcv_list without inventing bars", () => {
    const candles = mapGeckoOhlcvBody({
      data: {
        attributes: {
          ohlcv_list: [
            [1_700_000_000, 10, 12, 9, 11, 100],
            [1_700_000_900, 11, 13, 10, 12, 80],
          ],
        },
      },
    });
    assert.equal(candles.length, 2);
    assert.equal(candles[0].open, 10);
    assert.equal(candles[1].close, 12);
    assert.equal(mapGeckoOhlcvBody(null).length, 0);
    assert.equal(mapGeckoOhlcvBody({ data: { attributes: { ohlcv_list: [] } } }).length, 0);
  });

  it("builds public Gecko and CoinGecko pool URLs for a 96-bar 1D window", () => {
    const urls = geckoOhlcvUrls("58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2", "1D");
    const window = chartWindow("1D");
    assert.equal(window.limit, 96);
    assert.equal(window.path, "minute");
    assert.equal(window.aggregate, 15);
    assert.equal(window.lookbackSec, 24 * 60 * 60);
    assert.equal(urls.length, 2);
    assert.match(urls[0], /geckoterminal.com\/api\/v2\/networks\/solana\/pools\//);
    assert.match(urls[1], /api.coingecko.com\/api\/v3\/onchain\/networks\/solana\/pools\//);
    const rh = geckoOhlcvUrls("0x01348432b0bfabd686043bcfdd523ae40baf3674", "1D");
    assert.match(rh[0], /networks\/robinhood\/pools\//);
    assert.match(urls[0], /ohlcv\/minute/);
    assert.match(urls[0], /aggregate=15/);
    assert.match(urls[0], /limit=96/);
  });

  it("caps 1M to 30 daily bars, not a 180+ day dump", () => {
    const month = chartWindow("1M");
    assert.equal(month.path, "day");
    assert.equal(month.limit, 30);
    assert.ok(month.lookbackSec <= 31 * 24 * 60 * 60);
  });

  it("clips a 220-day dump down to the 1D lookback", () => {
    const start = 1_700_000_000;
    const dump = Array.from({ length: 220 }, (_, index) => ({
      time: start + index * 86_400,
      open: 0.02,
      high: 0.03,
      low: 0.01,
      close: 0.0196,
    }));
    const clipped = clipCandles(dump, "1D");
    assert.ok(clipped.length <= 96);
    assert.ok(clipped.length <= 2);
    assert.equal(clipped.at(-1)?.close, 0.0196);

    const fifteen = Array.from({ length: 120 }, (_, index) => ({
      time: start + index * 900,
      open: 0.02,
      high: 0.03,
      low: 0.01,
      close: 0.0196,
    }));
    assert.equal(clipCandles(fifteen, "1D").length, 96);
  });

  it("maps Dex and Birdeye bars without inventing closes", () => {
    const dex = mapDexPaprikaOhlcv([
      { time_open: "2023-11-14T22:13:20.000Z", open: 0.02, high: 0.03, low: 0.01, close: 0.0196 },
    ]);
    assert.equal(dex.length, 1);
    assert.equal(dex[0]?.close, 0.0196);
    const bird = mapBirdeyeOhlcv({
      data: { items: [{ unixTime: 1_700_000_000, o: 0.02, h: 0.03, l: 0.01, c: 0.0196 }] },
    });
    assert.equal(bird.length, 1);
    assert.equal(bird[0]?.time, 1_700_000_000);
    assert.equal(mapDexPaprikaOhlcv([]).length, 0);
    assert.equal(mapBirdeyeOhlcv({ data: { items: [] } }).length, 0);
  });

  it("candles SOL from known pools without a pair wait", () => {
    const pairs = earlyChartPairs(SOL_MINT);
    assert.equal(pairs.length, 2);
    assert.equal(pairs[0], "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE");
    assert.equal(pairs[1], "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2");
    assert.deepEqual(earlyChartPairs("SomeOtherMint111111111111111111111111111"), []);
    assert.deepEqual(earlyChartPairs("SomeOtherMint111111111111111111111111111", "HintPair111"), ["HintPair111"]);
  });
});
