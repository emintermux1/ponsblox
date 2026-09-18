import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { candlesFromOhlcvList, mergeMarketPulse, withPublicTape } from "@/lib/adapters/parse";
import {
  formatChange,
  paidSafeTicker,
  quietTape,
  tapeFromPulse,
  tapeHeadline,
  tapeStamp,
} from "./tape";
import { SEAT } from "./layout";

describe("public tape honesty", () => {
  it("never invents candles or a PAID ticker", () => {
    assert.deepEqual(candlesFromOhlcvList(null), []);
    assert.deepEqual(candlesFromOhlcvList([[1, 2]]), []);
    assert.deepEqual(candlesFromOhlcvList([[100, 1, 2, 0.5, 1.4]]), [
      { t: 100, o: 1, h: 2, l: 0.5, c: 1.4 },
    ]);
    assert.equal(paidSafeTicker("PAID"), null);
    assert.equal(paidSafeTicker("$paid"), null);
    assert.equal(paidSafeTicker("WIF"), "WIF");
  });

  it("fail-open SIM stays labeled SIM with empty fills", () => {
    const tape = tapeFromPulse({ kind: "TREND_SPIKE", ticker: "WIF", source: "sim" });
    assert.deepEqual(tape, quietTape());
    assert.equal(tapeStamp(tape.source), "SIM");
    assert.equal(tapeHeadline(tape), "SIM · quiet");
    assert.deepEqual(tape.fills, []);
    assert.deepEqual(tape.candles, []);
  });

  it("live gecko tape can show symbol and % without inventing bars", () => {
    const tape = tapeFromPulse({
      kind: "TREND_SPIKE",
      ticker: "WIF",
      source: "gecko",
      changePct: 2.41,
      candles: [],
    });
    assert.equal(tape.source, "gecko");
    assert.equal(tape.ticker, "WIF");
    assert.equal(formatChange(tape.changePct), "+2.4%");
    assert.equal(tapeHeadline(tape), "WIF  +2.4%");
    assert.deepEqual(tape.candles, []);
    assert.equal(tape.rows.length, 1);
    assert.equal(tape.rows[0]?.ticker, "WIF");
    assert.equal(tape.rows[0]?.changePct, 2.41);
    assert.equal(tapeStamp("gecko"), "LIVE · gecko");
    const named = tapeFromPulse({
      kind: "TREND_SPIKE",
      ticker: "WIF",
      name: "dogwifhat",
      source: "gecko",
      changePct: 4.2,
      candles: [],
    });
    assert.equal(named.name, "dogwifhat");
    assert.equal(tapeHeadline(named), "dogwifhat  +4.2%");
    const pad = tapeFromPulse({
      kind: "TREND_SPIKE",
      ticker: "SNAPPAD",
      name: "Snap Pad",
      source: "birdeye",
      changePct: 3,
    });
    assert.deepEqual(pad, quietTape());
  });

  it("uses public pulse tape rows and drops PAID without inventing %", () => {
    const tape = tapeFromPulse({
      kind: "TREND_SPIKE",
      ticker: "WIF",
      source: "gecko",
      changePct: 2.4,
      priceUsd: 1.25,
      tape: [
        { ticker: "WIF", priceChange24h: 2.4, priceUsd: 1.25, source: "gecko" },
        { ticker: "PAID", priceChange24h: 99, priceUsd: 8, source: "birdeye" },
        { ticker: "BONK", priceChange24h: -1.26, source: "dexscreener" },
        { ticker: "TOOLONGSYM", priceChange24h: 4 },
      ],
    });
    assert.deepEqual(
      tape.rows.map((row) => row.ticker),
      ["WIF", "BONK"],
    );
    assert.equal(tape.rows[1]?.changePct, -1.26);
    assert.equal(tape.rows[1]?.source, "dexscreener");
    assert.equal(tape.priceUsd, 1.25);
    assert.deepEqual(tape.fills, []);
  });

  it("dexscreener can use public % and only real OHLCV bars", () => {
    const tape = tapeFromPulse({
      kind: "VIRAL_POST",
      ticker: "BONK",
      source: "dexscreener",
      priceChange24h: -1.26,
      candles: [[1, 1, 1.1, 0.9, 0.95]],
    });
    assert.equal(tape.source, "dexscreener");
    assert.equal(tape.ticker, "BONK");
    assert.equal(formatChange(tape.changePct), "-1.3%");
    assert.equal(tapeHeadline(tape), "BONK  -1.3%");
    assert.equal(tape.candles.length, 1);
    assert.deepEqual(tape.fills, []);
    assert.equal(tapeStamp("dexscreener"), "LIVE · dexscreener");
    const paired = tapeFromPulse({
      kind: "VIRAL_POST",
      ticker: "WIF",
      source: "dexscreener",
      pairAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    });
    assert.equal(paired.pairAddress, "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN");
    assert.equal(paired.mint, "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN");
  });

  it("keeps dexscreener and solana pulses live instead of remapping them to SIM", () => {
    const dex = tapeFromPulse({
      kind: "VIRAL_POST",
      ticker: "WIF",
      source: "dexscreener",
      changePct: 4.2,
      candles: [],
    });
    assert.equal(dex.source, "dexscreener");
    assert.equal(tapeStamp(dex.source), "LIVE · dexscreener");
    assert.deepEqual(dex.fills, []);
    const sol = tapeFromPulse({ kind: "VIRAL_POST", ticker: "WIF", source: "solana" });
    assert.equal(sol.source, "solana");
    assert.equal(tapeStamp("solana"), "LIVE · solana");
  });

  it("drops PAID even if a provider tried to stamp it live", () => {
    const tape = tapeFromPulse({
      kind: "TREND_SPIKE",
      ticker: "PAID",
      source: "gecko",
      changePct: 12,
      candles: [[1, 1, 2, 1, 2]],
    });
    assert.equal(tape.source, "sim");
    assert.equal(tape.ticker, null);
    assert.deepEqual(tape.candles, []);
  });

  it("withPublicTape cannot upgrade SIM or attach fake fills", () => {
    const pulse = mergeMarketPulse({
      gecko: "error",
      birdeye: "skip",
      gmgn: "skip",
      helius: "skip",
    });
    const next = withPublicTape(pulse, {
      changePct: 9,
      candles: [{ t: 1, o: 1, h: 2, l: 1, c: 2 }],
    });
    assert.equal(next.source, "sim");
    assert.equal(next.changePct, null);
    assert.deepEqual(next.candles, []);
    assert.deepEqual(next.fills, []);
  });
});

describe("muses sit at the devices", () => {
  it("seats scroller at the lounge laptop, trader and builder at the desk", () => {
    assert.ok(SEAT.scroller.position[0] < -3);
    assert.ok(SEAT.trader.position[0] > 2 && SEAT.trader.position[0] < 3.4);
    assert.ok(SEAT.builder.position[0] > 3.6);
    assert.equal(SEAT.trader.facing, Math.PI);
    assert.equal(SEAT.builder.facing, Math.PI);
  });
});
