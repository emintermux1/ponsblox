import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  claimsExecutedFill,
  classifyGrokBias,
  grokEventText,
  grokReplyFromWake,
  grokSourceLabel,
  ingestAuthorized,
  labeledLoftThought,
  loftCaptionFromText,
  loftThoughtFromWake,
  asHttpsLogo,
  candlesFromOhlcvList,
  dedupeMarketHits,
  mergeMarketPulse,
  mintFromGeckoTokenId,
  providerStatusFromHttp,
  quietMarketPulse,
  quietProviders,
  resolveWakeResult,
  simLiteraryThought,
  tickerFromName,
  tickerFromSymbol,
  isPaidTicker,
  isQuoteTicker,
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
    assert.equal(grokSourceLabel("xai"), "xai/REAL");
    assert.equal(grokSourceLabel("bot"), "bot/REAL");
    assert.equal(grokSourceLabel("sim"), "SIM");
    assert.match(
      grokEventText("TAPE", "GROK_RESPONSE", "xai", "thin book, PASS"),
      /xai\/REAL/,
    );
    assert.doesNotMatch(
      grokEventText("TAPE", "GROK_RESPONSE", "xai", "thin book, PASS"),
      /bot\/REAL|Grok Bot|MUSE 02/,
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

  it("keeps loft captions short and drops CoT or fill claims", () => {
    assert.equal(loftCaptionFromText("thin book, PASS"), "thin book, PASS");
    assert.equal(loftCaptionFromText("let me think through the book first"), null);
    assert.equal(loftCaptionFromText("opened a position on WIF"), null);
    assert.equal(labeledLoftThought("xai", "thin book, PASS"), "xai/REAL · thin book, PASS");
    assert.equal(labeledLoftThought("bot", "thin book, WATCH"), "bot/REAL · thin book, WATCH");
    assert.equal(labeledLoftThought("xai", "because funding flipped"), null);
    assert.match(simLiteraryThought(1), /^SIM · /);
  });

  it("uses xAI as the loft thought and otherwise a labeled SIM stub", () => {
    const live = loftThoughtFromWake(
      resolveWakeResult(true, {
        source: "xai",
        summary: "thin book, PASS",
        bias: "pass",
      }),
    );
    assert.equal(live.source, "xai");
    assert.equal(live.thought, "xai/REAL · thin book, PASS");

    const pending = loftThoughtFromWake(resolveWakeResult(true, null), 2);
    assert.equal(pending.source, "sim");
    assert.match(pending.thought, /^SIM · /);
    assert.doesNotMatch(pending.thought, /Grok Bot/);
    assert.doesNotMatch(pending.thought, /waiting on ingest/);
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
    assert.equal(gecko.live, true);
    assert.equal(gecko.tape.length, 2);
    assert.deepEqual(gecko.fills, []);
    assert.deepEqual(gecko.candles, []);

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

  it("skips 401/402 as fail-open and never pads dumps or $PAID", () => {
    assert.equal(providerStatusFromHttp(401), "skip");
    assert.equal(providerStatusFromHttp(402), "skip");
    assert.equal(providerStatusFromHttp(500), "error");
    assert.equal(providerStatusFromHttp(200), "ok");
    assert.equal(isQuoteTicker("SOL"), true);
    assert.equal(asHttpsLogo("http://cdn.dexscreener.com/wif.png"), "https://cdn.dexscreener.com/wif.png");
    const paid = mergeMarketPulse({
      gecko: { source: "gecko", ticker: "$PAID", mint: "mint-paid", volumeUsd: 90_000 },
      dexscreener: { source: "dexscreener", ticker: "SOL", mint: "So11111111111111111111111111111111111111112", volumeUsd: 1 },
      birdeye: "skip",
      gmgn: "skip",
      helius: "skip",
    });
    assert.equal(paid.kind, "QUIET");
    assert.deepEqual(paid.tape, []);
    assert.deepEqual(paid.fills, []);
    assert.deepEqual(paid.candles, []);
  });

  it("dedupes the same mint and prefers gecko fields", () => {
    const hits = dedupeMarketHits([
      { source: "gecko", ticker: "WIF", mint: "mint1", volumeUsd: 12_000, priceUsd: null },
      { source: "birdeye", ticker: "WIF", mint: "mint1", volumeUsd: 90_000, priceUsd: 1.2 },
      { source: "dexscreener", ticker: "WIF", mint: "mint1", volumeUsd: 8_000, imageUrl: "https://cdn.dexscreener.com/wif.png" },
    ]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.source, "gecko");
    assert.equal(hits[0]?.priceUsd, 1.2);
    assert.equal(hits[0]?.imageUrl, "https://cdn.dexscreener.com/wif.png");
    const pulse = mergeMarketPulse({
      gecko: { source: "gecko", ticker: "WIF", mint: "mint1", volumeUsd: 12_000 },
      dexscreener: { source: "dexscreener", ticker: "WIF", mint: "mint1", volumeUsd: 8_000, priceUsd: 1.2 },
      birdeye: "skip",
      gmgn: "skip",
      helius: "skip",
    });
    assert.equal(pulse.source, "gecko");
    assert.equal(pulse.tape.length, 1);
    assert.equal(pulse.priceUsd, 1.2);
    assert.deepEqual(pulse.fills, []);
  });

  it("never invents candles from an empty ohlcv list", () => {
    assert.deepEqual(candlesFromOhlcvList(null), []);
    assert.deepEqual(candlesFromOhlcvList([[1, 2, 3]]), []);
    assert.deepEqual(candlesFromOhlcvList([[10, 1, 3, 0.5, 2]]), [{ t: 10, o: 1, h: 3, l: 0.5, c: 2 }]);
  });
});
