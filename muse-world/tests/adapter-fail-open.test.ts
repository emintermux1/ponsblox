import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { askGrok, resetGrokWakeClocksForTests, wakeGrok } from "../lib/adapters/grok";
import { peekMarketPulse } from "../lib/adapters/market";
import { SIM_GROK_SUMMARY, honestyFromLabel } from "../lib/adapters/source";

const envNames = [
  "GROK_BOT_WEBHOOK_URL",
  "GROK_BOT_WEBHOOK_KEY",
  "XAI_API_KEY",
  "XAI_API_URL",
] as const;

const priorEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));

beforeEach(() => {
  resetGrokWakeClocksForTests();
});

afterEach(() => {
  mock.restoreAll();
  resetGrokWakeClocksForTests();
  for (const name of envNames) {
    const value = priorEnv[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

function clearOptionalApis() {
  for (const name of envNames) {
    delete process.env[name];
  }
}

describe("adapter fail-open (no live APIs)", () => {
  it("askGrok without webhook or xAI key is SIM and does not fetch", async () => {
    clearOptionalApis();
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("askGrok must not fetch when no webhook or xAI key is configured");
    });

    const reply = await askGrok({
      museId: "trader",
      goal: "context",
      observation: "room is quiet",
    });

    assert.equal(reply.source, "sim");
    assert.equal(reply.summary, SIM_GROK_SUMMARY);
    assert.equal(honestyFromLabel(reply.source), "sim");
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  it("peekMarketPulse returns SIM when gecko fetch fails", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("gecko fixture failure — not a live tape");
    });

    const first = await peekMarketPulse();
    assert.equal(first.source, "sim");
    assert.equal(honestyFromLabel(first.source), "sim");
    assert.equal(first.kind, "QUIET");
    assert.ok(fetchMock.mock.callCount() >= 1);

    const second = await peekMarketPulse();
    assert.equal(second.source, "sim");
    assert.equal(honestyFromLabel(second.source), "sim");
  });
});

describe("live xAI and webhook wake", () => {
  it("labels a real xAI caption as xai, never Bot", async () => {
    clearOptionalApis();
    process.env.XAI_API_KEY = "test-xai-fixture";
    process.env.XAI_API_URL = "https://xai.test";
    const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      assert.match(url, /xai\.test\/chat\/completions/);
      assert.doesNotMatch(url, /test-xai-fixture/);
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "thin book, PASS" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const reply = await askGrok({
      museId: "trader",
      goal: "context",
      observation: "PAID is in the room",
    });

    assert.equal(reply.source, "xai");
    assert.equal(reply.summary, "thin book, PASS");
    assert.equal(reply.bias, "pass");
    assert.equal(honestyFromLabel(reply.source), "real");
    assert.notEqual(reply.source, "bot");
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("drops CoT or fill-claim xAI bodies instead of faking a caption", async () => {
    clearOptionalApis();
    process.env.XAI_API_KEY = "test-xai-fixture";
    mock.method(globalThis, "fetch", async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "let me think, then I executed the trade" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const reply = await askGrok({
      museId: "trader",
      goal: "context",
      observation: "the loft is quiet",
    });
    assert.equal(reply.source, "sim");
    assert.equal(honestyFromLabel(reply.source), "sim");
  });

  it("treats a webhook 200 as a wake, not a Bot reply", async () => {
    clearOptionalApis();
    process.env.GROK_BOT_WEBHOOK_URL = "https://webhook.test/wake";
    process.env.GROK_BOT_WEBHOOK_KEY = "test-webhook-fixture";
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      return new Response("ok", { status: 200 });
    });

    const wake = await wakeGrok({
      museId: "trader",
      goal: "context",
      observation: "the loft is quiet",
    });
    const reply = await askGrok({
      museId: "trader",
      goal: "context",
      observation: "the loft is quiet",
    });

    assert.equal(wake.woken, true);
    assert.equal(wake.pendingIngest, true);
    assert.equal(wake.xai, null);
    assert.equal(reply.source, "sim");
    assert.notEqual(reply.source, "bot");
    assert.match(reply.summary, /waiting on ingest/);
    assert.ok(fetchMock.mock.callCount() >= 1);
  });
});
