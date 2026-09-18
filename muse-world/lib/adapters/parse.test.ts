import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  claimsExecutedFill,
  classifyGrokBias,
  grokEventText,
  grokReplyFromWake,
  grokSourceLabel,
  ingestAuthorized,
  mergeMarketPulse,
  mintFromGeckoTokenId,
  quietMarketPulse,
  quietProviders,
  resolveWakeResult,
  tickerFromName,
  tickerFromSymbol,
  isPaidTicker,
} from "./parse.ts";

describe("grok wake/ingest", () => {
  it("never labels a wake-only result as a Bot reply", () => {
    const pending = grokReplyFromWake(resolveWakeResult(true, null));
    const idle = grokReplyFromWake(resolveWakeResult(false, null));
    assert.equal(pending.source, "sim");
    assert.equal(idle.source, "sim");
    assert.notEqual(pending.source, "bot");
    assert.notEqual(idle.source, "bot");
  });

  it("keeps optional xAI labeled as xai", () => {
    const xai = grokReplyFromWake(
      resolveWakeResult(true, {
        source: "xai",
        summary: "thin book, PASS",
        bias: "pass",
      }),
    );
    assert.equal(xai.source, "xai");
    assert.equal(grokSourceLabel("xai"), "xAI");
    assert.equal(grokSourceLabel("bot"), "Grok Bot");
    assert.match(
      grokEventText("TAPE", "GROK_RESPONSE", "xai", "thin book, PASS"),
      /xAI/,
    );
    assert.doesNotMatch(
      grokEventText("TAPE", "GROK_RESPONSE", "xai", "thin book, PASS"),
      /Grok Bot/,
    );
  });

  it("classifies bias from the real sentence", () => {
    assert.equal(classifyGrokBias("asymmetric, BUY"), "buy");
    assert.equal(classifyGrokBias("avoid, thin book PASS"), "pass");
    assert.equal(classifyGrokBias("keep it on the desk WATCH"), "watch");
  });

  it("requires an ingest secret and rejects fake fills", () => {
    assert.equal(ingestAuthorized(undefined, "secret"), "missing_secret");
    assert.equal(ingestAuthorized("secret", "nope"), "unauthorized");
    assert.equal(ingestAuthorized("secret", "secret"), "ok");
    assert.equal(ingestAuthorized("secret", "Bearer secret"), "ok");
    assert.equal(claimsExecutedFill("opened a position on WIF"), true);
    assert.equal(claimsExecutedFill("executed the trade"), true);
    assert.equal(claimsExecutedFill("txid abc"), true);
    assert.equal(claimsExecutedFill("thin book, WATCH"), false);
  });
});

describe("market pulse", () => {
  it("parses live tickers and gecko mints", () => {
    assert.equal(tickerFromName("WIF / SOL"), "WIF");
    assert.equal(tickerFromSymbol("bonk"), "BONK");
    assert.equal(tickerFromName("thisnameistoolong / SOL"), null);
    assert.equal(isPaidTicker("PAID"), true);
    assert.equal(isPaidTicker("paid"), true);
    assert.equal(tickerFromSymbol("PAID"), null);
    assert.equal(tickerFromSymbol("$PAID"), null);
    assert.equal(tickerFromName("paid / SOL"), null);
    assert.equal(
      mintFromGeckoTokenId("solana_DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"),
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    );
  });

  it("prefers gecko then birdeye/gmgn and never invents fills", () => {
    const gecko = mergeMarketPulse({
      gecko: { source: "gecko", ticker: "WIF", mint: "mint1", volumeUsd: 50_000 },
      birdeye: { source: "birdeye", ticker: "BONK", mint: "mint2", volumeUsd: 90_000 },
      gmgn: "skip",
      helius: "skip",
    });
    assert.equal(gecko.source, "gecko");
    assert.equal(gecko.kind, "TREND_SPIKE");
    assert.deepEqual(gecko.fills, []);

    const fallback = mergeMarketPulse({
      gecko: "error",
      birdeye: { source: "birdeye", ticker: "PINT", mint: "mint3", volumeUsd: 1_000 },
      gmgn: "skip",
      helius: { symbol: null, mint: "mint3" },
    });
    assert.equal(fallback.source, "birdeye");
    assert.equal(fallback.ticker, "PINT");
    assert.deepEqual(fallback.fills, []);
    assert.equal(fallback.providers.gecko, "error");
    assert.equal(fallback.providers.helius, "ok");
  });

  it("fails open to sim quiet with empty fills when nothing live answers", () => {
    const pulse = mergeMarketPulse({
      gecko: "error",
      birdeye: "skip",
      gmgn: "skip",
      helius: "skip",
    });
    assert.deepEqual(pulse, quietMarketPulse(quietProviders()));
    assert.equal(pulse.source, "sim");
    assert.deepEqual(pulse.fills, []);
  });

  it("skips a PAID gecko pulse instead of putting it on the tape", () => {
    const pulse = mergeMarketPulse({
      gecko: { source: "gecko", ticker: "PAID", mint: "mint-paid", volumeUsd: 90_000 },
      birdeye: "skip",
      gmgn: "skip",
      helius: { symbol: "PAID", mint: "mint-paid" },
    });
    assert.equal(pulse.kind, "QUIET");
    assert.equal(pulse.ticker, null);
    assert.equal(pulse.source, "sim");
    assert.deepEqual(pulse.fills, []);
  });

  it("skips lowercase paid and does not fall through to a slop headline", () => {
    const pulse = mergeMarketPulse({
      gecko: { source: "gecko", ticker: "paid", mint: "mint-paid", volumeUsd: 12_000 },
      birdeye: "skip",
      gmgn: "skip",
      helius: "skip",
    });
    assert.equal(pulse.kind, "QUIET");
    assert.equal(pulse.ticker, null);
  });

  it("lets helius fill a missing ticker without inventing a new source", () => {
    const pulse = mergeMarketPulse({
      gecko: { source: "gecko", ticker: null, mint: "mint9", volumeUsd: 12_000 },
      birdeye: "skip",
      gmgn: "skip",
      helius: { symbol: "JUP", mint: "mint9" },
    });
    assert.equal(pulse.source, "gecko");
    assert.equal(pulse.ticker, "JUP");
    assert.deepEqual(pulse.fills, []);
  });
});
