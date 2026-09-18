import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { screenTapeHeader, screenTapeRows, SCREEN_TAPE_MAX_ROWS } from "./screen-tape";
import { quietTape, tapeFromPulse } from "./tape";

describe("screen tape rows", () => {
  it("keeps SIM empty instead of inventing tickers", () => {
    const tape = quietTape();
    assert.deepEqual(screenTapeRows(tape), []);
    assert.equal(screenTapeHeader(tape), "sim");
  });

  it("shows gecko and dex rows, drops PAID, and labels sources honestly", () => {
    const tape = tapeFromPulse({
      kind: "TREND_SPIKE",
      ticker: "WIF",
      source: "gecko",
      changePct: 2.4,
      tape: [
        { ticker: "WIF", priceChange24h: 2.4, source: "gecko" },
        { ticker: "PAID", priceChange24h: 99, source: "birdeye" },
        { ticker: "BONK", priceChange24h: -1.26, source: "dexscreener" },
        { ticker: "POPCAT", priceChange24h: 4.1, source: "gmgn" },
      ],
      candles: [
        { t: 1, o: 1, h: 1.1, l: 0.9, c: 1 },
        { t: 2, o: 1, h: 1.2, l: 0.95, c: 1.1 },
      ],
    });
    const rows = screenTapeRows(tape);
    assert.ok(rows.length >= 3);
    assert.ok(rows.length <= SCREEN_TAPE_MAX_ROWS);
    assert.deepEqual(
      rows.map((row) => row.ticker),
      ["WIF", "BONK", "POPCAT"],
    );
    assert.deepEqual(
      rows.map((row) => row.source),
      ["gecko", "dex", "gmgn"],
    );
    assert.equal(rows[0]?.change, "+2.4%");
    assert.equal(rows[1]?.change, "-1.3%");
    assert.ok(rows[0] && rows[0].spark.length >= 2);
    assert.deepEqual(rows[1]?.spark, []);
    assert.equal(screenTapeHeader(tape), "gecko");
    assert.ok(!rows.some((row) => row.ticker === "PAID" || row.ticker === "$PAID"));
  });

  it("labels a dexscreener pulse as dex", () => {
    const tape = tapeFromPulse({
      kind: "VIRAL_POST",
      ticker: "BONK",
      source: "dexscreener",
      priceChange24h: -1.26,
    });
    assert.equal(screenTapeHeader(tape), "dex");
    assert.equal(screenTapeRows(tape)[0]?.source, "dex");
  });
});
