import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { askGrok } from "../lib/adapters/grok";
import { peekMarketPulse } from "../lib/adapters/market";
import { SIM_GROK_SUMMARY, honestyFromLabel } from "../lib/adapters/source";

const envNames = [
  "GROK_BOT_WEBHOOK_URL",
  "GROK_BOT_WEBHOOK_KEY",
  "XAI_API_KEY",
] as const;

const priorEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));

afterEach(() => {
  mock.restoreAll();
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
