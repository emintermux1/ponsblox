import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatChartPrice,
  formatChartTime,
  normalizeChartBars,
  ohlcvBarsFromPayload,
} from "./chart-bars";

describe("chart bar mapping", () => {
  it("maps gecko tuples and candle objects without inventing bars", () => {
    const bars = normalizeChartBars([
      [1_700_000_900, 11, 13, 10, 12, 80],
      [1_700_000_000, 10, 12, 9, 11, 100],
    ]);
    assert.equal(bars.length, 2);
    assert.equal(bars[0]?.time, 1_700_000_000);
    assert.equal(bars[0]?.open, 10);
    assert.equal(bars[1]?.close, 12);
    assert.deepEqual(normalizeChartBars([]), []);
    assert.deepEqual(normalizeChartBars(null), []);
    assert.deepEqual(normalizeChartBars({ candles: [[1_700_000_000, 1, 1, 1, 1]] }), []);
  });

  it("reads bars from ohlcv payloads including nested data", () => {
    const rows = [
      { time: 1_700_000_000, open: 0.02, high: 0.03, low: 0.01, close: 0.025 },
    ];
    assert.equal(normalizeChartBars(ohlcvBarsFromPayload({ bars: rows })).length, 1);
    assert.equal(normalizeChartBars(ohlcvBarsFromPayload({ candles: rows })).length, 1);
    assert.equal(normalizeChartBars(ohlcvBarsFromPayload({ data: { bars: rows } })).length, 1);
    assert.equal(normalizeChartBars(ohlcvBarsFromPayload({ chart: { candles: rows } })).length, 1);
    assert.deepEqual(ohlcvBarsFromPayload({ reason: "none" }), []);
  });

  it("puts unix time on X and price on Y, never date strings as prices", () => {
    const fromIso = normalizeChartBars([
      { time: "2023-11-14T22:13:20.000Z", o: 0.0196, h: 0.02, l: 0.018, c: 0.0198 },
    ]);
    assert.equal(fromIso[0]?.time, 1_700_000_000);
    assert.equal(fromIso[0]?.close, 0.0198);

    const swapped = normalizeChartBars([
      { time: 0.0196, close: 1_700_000_000 },
    ]);
    assert.equal(swapped[0]?.time, 1_700_000_000);
    assert.equal(swapped[0]?.close, 0.0196);

    assert.deepEqual(normalizeChartBars([{ time: "220d", close: 0.02 }]), []);
    assert.deepEqual(normalizeChartBars([{ time: "23d", value: "22d" }]), []);
    assert.deepEqual(
      normalizeChartBars([{ time: "2023-11-14", open: "2023-11-14", close: "2023-11-15" }]),
      [],
    );
  });

  it("accepts millisecond times and short ohlc keys", () => {
    const bars = normalizeChartBars([
      { t: 1_700_000_000_000, o: 1, h: 2, l: 0.5, c: 1.5 },
    ]);
    assert.equal(bars[0]?.time, 1_700_000_000);
    assert.equal(bars[0]?.high, 2);
  });

  it("formats axis labels as price and clock, not day-ago copy", () => {
    assert.equal(formatChartPrice(0.0196), "0.01960");
    assert.equal(formatChartTime(1_700_000_000), "11/14 22:13");
    assert.equal(formatChartTime("220d"), "");
  });
});
