import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapGeckoCandles, mapGmgnKlineRows } from "./market";

describe("real candle mappers", () => {
  it("maps GeckoTerminal ohlcv_list without inventing bars", () => {
    const candles = mapGeckoCandles({
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
    assert.equal(mapGeckoCandles(null).length, 0);
    assert.equal(mapGeckoCandles({ data: { attributes: { ohlcv_list: [] } } }).length, 0);
  });

  it("drops non-finite GMGN rows", () => {
    const candles = mapGmgnKlineRows({
      data: {
        list: [
          { time: 1_700_000_000, open: 1, high: 2, low: 0.5, close: 1.5 },
          { time: 0, open: 1, high: 2, low: 0.5, close: 1.5 },
          { close: "nope" },
        ],
      },
    });
    assert.equal(candles.length, 1);
    assert.equal(candles[0].close, 1.5);
  });
});
