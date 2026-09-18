import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { screenSourceLabel, tapeFromPulse, tapeStamp } from "./tape";
import { screenTapeHeader, screenTapeRows } from "./screen-tape";

describe("screen tape rows", () => {
  it("paints 3–6 real tickers with honest gecko|dex|gmgn labels and no PAID", () => {
    const tape = tapeFromPulse({
      kind: "TREND_SPIKE",
      ticker: "WIF",
      source: "gecko",
      changePct: 8.2,
      tape: [
        { ticker: "WIF", priceChange24h: 8.2, source: "gecko" },
        { ticker: "BONK", priceChange24h: -1.3, source: "dexscreener" },
        { ticker: "PAID", priceChange24h: 99, source: "gecko" },
        { ticker: "$PAID", priceChange24h: 12, source: "gmgn" },
        { ticker: "PINT", priceChange24h: 2.1, source: "gmgn" },
        { ticker: "PENGU", priceChange24h: 0.4, source: "gecko" },
        { ticker: "MEW", priceChange24h: -4.2, source: "dexscreener" },
        { ticker: "POPCAT", priceChange24h: 1.1, source: "gecko" },
      ],
      candles: [{ t: 1, o: 1, h: 1.2, l: 0.9, c: 1.1 }],
    });
    const rows = screenTapeRows(tape);
    assert.equal(screenTapeHeader(tape), "gecko");
    assert.ok(rows.length >= 3 && rows.length <= 6);
    assert.deepEqual(
      rows.map((row) => row.ticker),
      ["WIF", "BONK", "PINT", "PENGU", "MEW"],
    );
    assert.equal(rows[0]?.change, "+8.2%");
    assert.equal(rows[1]?.change, "-1.3%");
    assert.equal(rows[0]?.source, "gecko");
    assert.equal(rows[1]?.source, "dex");
    assert.equal(rows[2]?.source, "gmgn");
    assert.deepEqual(rows[0]?.spark, [1.1]);
    assert.deepEqual(rows[1]?.spark, []);
    assert.equal(
      rows.some((row) => /paid/i.test(row.ticker) || row.ticker === "PAID"),
      false,
    );
  });

  it("fail-open SIM has no invented tickers or fills", () => {
    const tape = tapeFromPulse({ kind: "TREND_SPIKE", ticker: "WIF", source: "sim" });
    assert.equal(screenTapeHeader(tape), "sim");
    assert.deepEqual(screenTapeRows(tape), []);
    assert.deepEqual(tape.fills, []);
  });

  it("labels dexscreener as dex and never as an invented fill", () => {
    assert.equal(screenSourceLabel("dexscreener"), "dex");
    assert.equal(screenSourceLabel("gecko"), "gecko");
    assert.equal(screenSourceLabel("gmgn"), "gmgn");
    assert.equal(screenSourceLabel("helius"), "helius");
    assert.equal(screenSourceLabel("sim"), "sim");
    assert.equal(tapeStamp("dexscreener"), "LIVE · dex");
  });
});
