import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SIM_GROK_SUMMARY,
  assertSimNotReal,
  assertSource,
  authorizeMuseIngest,
  grokIngestEventSource,
  grokReplyAfterWake,
  honestyFromLabel,
  isGrokWebhookConfigured,
  marketPulseFromFetch,
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

  it("skips a PAID pool and stays SIM when nothing clean remains", () => {
    const pulse = marketPulseFromFetch({
      status: "ok",
      body: { data: [{ attributes: { name: "PAID / SOL", volume_usd: { h1: "90000" } } }] },
    });
    assert.equal(pulse.source, "sim");
    assert.equal(pulse.ticker, null);
  });

  it("walks past a pad coin to the first clean gecko ticker", () => {
    const pulse = marketPulseFromFetch({
      status: "ok",
      body: {
        data: [
          { attributes: { name: "SNAPPAD / SOL", volume_usd: { h1: "90000" } } },
          { attributes: { name: "WIF / SOL", volume_usd: { h1: "12000" } } },
        ],
      },
    });
    assert.equal(pulse.source, "gecko");
    assert.equal(pulse.ticker, "WIF");
    assert.equal(honestyFromLabel(pulse.source), "real");
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
});

describe("events never mark SIM packets as REAL", () => {
  it("maps world and sim labels to sim", () => {
    assert.equal(honestyFromLabel("world"), "sim");
    assert.equal(honestyFromLabel("sim"), "sim");
  });

  it("maps bot, xai, and live tape labels to real", () => {
    assert.equal(honestyFromLabel("bot"), "real");
    assert.equal(honestyFromLabel("xai"), "real");
    assert.equal(honestyFromLabel("gecko"), "real");
    assert.equal(honestyFromLabel("birdeye"), "real");
    assert.equal(honestyFromLabel("gmgn"), "real");
    assert.equal(honestyFromLabel("helius"), "real");
  });

  it("refuses to upgrade a SIM packet to a live label", () => {
    assert.equal(assertSimNotReal("sim", "world"), "sim");
    assert.equal(assertSimNotReal("sim", "sim"), "sim");
    assert.throws(() => assertSimNotReal("sim", "bot"), /SIM packet cannot be marked REAL/);
    assert.throws(() => assertSimNotReal("sim", "xai"), /SIM packet cannot be marked REAL/);
    assert.throws(() => assertSimNotReal("sim", "gecko"), /SIM packet cannot be marked REAL/);
    assert.throws(() => assertSimNotReal("sim", "birdeye"), /SIM packet cannot be marked REAL/);
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

describe("verified ingest source label", () => {
  it("labels authorized ingest as bot after assertSource(real)", () => {
    assert.equal(assertSource("real"), "real");
    assert.equal(grokIngestEventSource(), "bot");
    assert.equal(honestyFromLabel("bot"), "real");
  });
});
