import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  claimsExecutedFill,
  classifyGrokBias,
  cleanTicker,
  grokEventText,
  grokReplyFromWake,
  grokSourceLabel,
  ingestAuthorized,
  isJunkTicker,
  mergeMarketPulse,
  mintFromGeckoTokenId,
  pulseDisplayName,
  quietMarketPulse,
  quietProviders,
  resolveWakeResult,
  tickerFromName,
  tickerFromSymbol,
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
      grokEventText("MUSE 02", "GROK_RESPONSE", "xai", "thin book, PASS"),
      /xAI/,
    );
    assert.doesNotMatch(
      grokEventText("MUSE 02", "GROK_RESPONSE", "xai", "thin book, PASS"),
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
    assert.equal(
      mintFromGeckoTokenId("solana_DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"),
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    );
  });

  it("skips PAID, pad coins, and other junk symbols", () => {
    assert.equal(tickerFromSymbol("PAID"), null);
    assert.equal(tickerFromSymbol("$PAID"), null);
    assert.equal(tickerFromName("PAID / SOL"), null);
    assert.equal(tickerFromSymbol("SNAPPAD"), null);
    assert.equal(tickerFromSymbol("GITPAD"), null);
    assert.equal(cleanTicker("PAID"), null);
    assert.equal(isJunkTicker("PAID"), true);
    assert.equal(isJunkTicker("WIF"), false);
    assert.equal(pulseDisplayName("PAID", "PAID"), null);
    assert.equal(pulseDisplayName("dogwifhat", "WIF"), "dogwifhat");
  });

  it("prefers gecko then birdeye/gmgn and never invents fills", () => {
    const gecko = mergeMarketPulse({
      gecko: {
        source: "gecko",
        ticker: "WIF",
        name: "dogwifhat",
        mint: "mint1",
        volumeUsd: 50_000,
        changePct: 4.2,
      },
      birdeye: {
        source: "birdeye",
        ticker: "BONK",
        name: "Bonk",
        mint: "mint2",
        volumeUsd: 90_000,
        changePct: 1.1,
      },
      gmgn: "skip",
      helius: "skip",
    });
    assert.equal(gecko.source, "gecko");
    assert.equal(gecko.kind, "TREND_SPIKE");
    assert.equal(gecko.name, "dogwifhat");
    assert.equal(gecko.changePct, 4.2);
    assert.deepEqual(gecko.fills, []);

    const fallback = mergeMarketPulse({
      gecko: "error",
      birdeye: {
        source: "birdeye",
        ticker: "PINT",
        name: "PINT",
        mint: "mint3",
        volumeUsd: 1_000,
        changePct: -2.5,
      },
      gmgn: "skip",
      helius: { symbol: null, name: null, mint: "mint3" },
    });
    assert.equal(fallback.source, "birdeye");
    assert.equal(fallback.ticker, "PINT");
    assert.equal(fallback.changePct, -2.5);
    assert.deepEqual(fallback.fills, []);
    assert.equal(fallback.providers.gecko, "error");
    assert.equal(fallback.providers.helius, "ok");
  });

  it("drops a PAID gecko row and uses the next live provider", () => {
    const pulse = mergeMarketPulse({
      gecko: {
        source: "gecko",
        ticker: "PAID",
        name: "PAID",
        mint: "mint-paid",
        volumeUsd: 99_000,
        changePct: 80,
      },
      birdeye: {
        source: "birdeye",
        ticker: "WIF",
        name: "dogwifhat",
        mint: "mint1",
        volumeUsd: 12_000,
        changePct: 3.1,
      },
      gmgn: "skip",
      helius: "skip",
    });
    assert.equal(pulse.source, "birdeye");
    assert.equal(pulse.ticker, "WIF");
    assert.notEqual(pulse.ticker, "PAID");
    assert.equal(pulse.name, "dogwifhat");
    assert.deepEqual(pulse.fills, []);
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
    assert.equal(pulse.name, null);
    assert.equal(pulse.changePct, null);
    assert.deepEqual(pulse.fills, []);
  });

  it("lets helius fill a missing ticker without inventing a new source", () => {
    const pulse = mergeMarketPulse({
      gecko: {
        source: "gecko",
        ticker: null,
        name: null,
        mint: "mint9",
        volumeUsd: 12_000,
        changePct: 1.4,
      },
      birdeye: "skip",
      gmgn: "skip",
      helius: { symbol: "JUP", name: "Jupiter", mint: "mint9" },
    });
    assert.equal(pulse.source, "gecko");
    assert.equal(pulse.ticker, "JUP");
    assert.equal(pulse.name, "Jupiter");
    assert.equal(pulse.changePct, 1.4);
    assert.deepEqual(pulse.fills, []);
  });
});
