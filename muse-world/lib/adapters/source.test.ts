import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GROK_ENV_NAMES,
  SIM_GROK_SUMMARY,
  assertSimNotReal,
  assertSource,
  authorizeMuseIngest,
  grokIngestEventSource,
  grokReplyAfterWake,
  honestyFromLabel,
  isGrokWebhookConfigured,
  isXaiConfigured,
  marketPulseFromFetch,
  readEnvName,
  simGrokReply,
  simMarketPulse,
} from "./source";

describe("assertSource", () => {
  it("accepts real and sim and returns the same label", () => {
    assert.equal(assertSource("real"), "real");
    assert.equal(assertSource("sim"), "sim");
  });
});

describe("market fail-open", () => {
  it("returns SIM on http error", () => {
    const pulse = marketPulseFromFetch({ status: "http-error" });
    assert.equal(pulse.source, "sim");
    assert.equal(pulse.kind, "QUIET");
    assert.equal(pulse.ticker, null);
    assert.equal(honestyFromLabel(pulse.source), "sim");
  });

  it("returns SIM on network error", () => {
    const pulse = marketPulseFromFetch({ status: "network-error" });
    assert.deepEqual(pulse, simMarketPulse());
    assert.equal(honestyFromLabel(pulse.source), "sim");
  });

  it("returns SIM when gecko body has no pool row", () => {
    const pulse = marketPulseFromFetch({ status: "ok", body: { data: [] } });
    assert.equal(pulse.source, "sim");
    assert.equal(honestyFromLabel(pulse.source), "sim");
  });

  it("skips a PAID / paid gecko pool instead of pulsing it", () => {
    const paid = marketPulseFromFetch({
      status: "ok",
      body: {
        data: [{ attributes: { name: "PAID / SOL", volume_usd: { h1: "90000" } } }],
      },
    });
    assert.equal(paid.kind, "QUIET");
    assert.equal(paid.ticker, null);
    assert.equal(paid.source, "sim");

    const lower = marketPulseFromFetch({
      status: "ok",
      body: {
        data: [{ attributes: { name: "paid / SOL", volume_usd: { h1: "12000" } } }],
      },
    });
    assert.equal(lower.kind, "QUIET");
    assert.equal(lower.ticker, null);
  });
});

describe("grok wake without webhook", () => {
  it("is SIM when webhook env names are unset", () => {
    assert.equal(isGrokWebhookConfigured(undefined, undefined), false);
    const reply = grokReplyAfterWake({
      webhookConfigured: false,
      woken: false,
      xai: null,
    });
    assert.equal(reply.source, "sim");
    assert.equal(reply.summary, SIM_GROK_SUMMARY);
    assert.equal(reply.bias, "watch");
    assert.equal(honestyFromLabel(reply.source), "sim");
    assert.deepEqual(reply, simGrokReply());
  });

  it("stays SIM even if a wake flag is set without a webhook", () => {
    const reply = grokReplyAfterWake({
      webhookConfigured: false,
      woken: true,
      xai: null,
    });
    assert.equal(reply.source, "sim");
    assert.equal(honestyFromLabel(reply.source), "sim");
  });

  it("does not label a webhook 200 as Bot text", () => {
    const reply = grokReplyAfterWake({
      webhookConfigured: true,
      woken: true,
      xai: null,
    });
    assert.equal(reply.source, "sim");
    assert.notEqual(reply.source, "bot");
    assert.equal(honestyFromLabel(reply.source), "sim");
    assert.match(reply.summary, /waiting on ingest/);
  });
});

describe("events never mark SIM packets as REAL", () => {
  it("maps world and sim labels to sim", () => {
    assert.equal(honestyFromLabel("world"), "sim");
    assert.equal(honestyFromLabel("sim"), "sim");
  });

  it("maps bot, xai, and gecko labels to real", () => {
    assert.equal(honestyFromLabel("bot"), "real");
    assert.equal(honestyFromLabel("xai"), "real");
    assert.equal(honestyFromLabel("gecko"), "real");
  });

  it("refuses to upgrade a SIM packet to a live label", () => {
    assert.equal(assertSimNotReal("sim", "world"), "sim");
    assert.equal(assertSimNotReal("sim", "sim"), "sim");
    assert.throws(() => assertSimNotReal("sim", "bot"), /SIM packet cannot be marked REAL/);
    assert.throws(() => assertSimNotReal("sim", "xai"), /SIM packet cannot be marked REAL/);
    assert.throws(() => assertSimNotReal("sim", "gecko"), /SIM packet cannot be marked REAL/);
  });

  it("does not treat a sim-shaped xai object as a live Grok reply", () => {
    const reply = grokReplyAfterWake({
      webhookConfigured: false,
      woken: false,
      xai: {
        source: "sim",
        summary: "FIXTURE — not a live Grok reply",
        bias: "watch",
      },
    });
    assert.equal(reply.source, "sim");
    assert.equal(reply.summary, SIM_GROK_SUMMARY);
  });
});

describe("ingest auth helper", () => {
  it("rejects a missing x-muse-ingest header", () => {
    assert.equal(authorizeMuseIngest(null, "test-ingest-fixture"), false);
    assert.equal(authorizeMuseIngest(null, undefined), false);
  });

  it("rejects when GROK_INGEST_SECRET is unset", () => {
    assert.equal(authorizeMuseIngest("test-ingest-fixture", undefined), false);
  });
});

describe("env names already in .env.example", () => {
  it("reads trimmed process.env names and does not invent keys", () => {
    assert.equal(GROK_ENV_NAMES.webhookUrl, "GROK_BOT_WEBHOOK_URL");
    assert.equal(GROK_ENV_NAMES.webhookKey, "GROK_BOT_WEBHOOK_KEY");
    assert.equal(GROK_ENV_NAMES.ingestSecret, "GROK_INGEST_SECRET");
    assert.equal(GROK_ENV_NAMES.xaiKey, "XAI_API_KEY");
    assert.equal(GROK_ENV_NAMES.xaiUrl, "XAI_API_URL");
    assert.equal(isXaiConfigured(undefined), false);
    assert.equal(isXaiConfigured("  "), false);
    assert.equal(isXaiConfigured("test-xai-fixture"), true);
    const prior = process.env.XAI_API_KEY;
    process.env.XAI_API_KEY = "  fixture-key  ";
    try {
      assert.equal(readEnvName("XAI_API_KEY"), "fixture-key");
    } finally {
      if (prior === undefined) {
        delete process.env.XAI_API_KEY;
      } else {
        process.env.XAI_API_KEY = prior;
      }
    }
  });
});

describe("verified ingest source label", () => {
  it("labels authorized ingest as bot after assertSource(real)", () => {
    assert.equal(assertSource("real"), "real");
    assert.equal(grokIngestEventSource(), "bot");
    assert.equal(honestyFromLabel("bot"), "real");
  });
});
