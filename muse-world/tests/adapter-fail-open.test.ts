import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { askGrok } from "../lib/adapters/grok";
import { peekMarketPulse, resetMarketPulseCache } from "../lib/adapters/market";
import { SIM_GROK_SUMMARY, honestyFromLabel } from "../lib/adapters/source";

const envNames = [
  "GROK_BOT_WEBHOOK_URL",
  "GROK_BOT_WEBHOOK_KEY",
  "XAI_API_KEY",
  "BIRDEYE_API_KEY",
  "HELIUS_API_KEY",
  "GMGN_API_KEY",
] as const;

const priorEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));

beforeEach(() => {
  resetMarketPulseCache();
});

afterEach(() => {
  mock.restoreAll();
  resetMarketPulseCache();
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
    assert.equal(first.name, null);
    assert.equal(first.changePct, null);
    assert.deepEqual(first.fills, []);
    assert.ok(fetchMock.mock.callCount() >= 1);

    const second = await peekMarketPulse();
    assert.equal(second.source, "sim");
    assert.equal(honestyFromLabel(second.source), "sim");
    assert.deepEqual(second.fills, []);
  });

  it("peekMarketPulse skips PAID and pad-coin rows", async () => {
    mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("geckoterminal.com")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                attributes: {
                  name: "PAID / SOL",
                  volume_usd: { h1: "90000" },
                  price_change_percentage: { h1: "12.4" },
                },
              },
              {
                attributes: {
                  name: "SNAPPAD / SOL",
                  volume_usd: { h1: "80000" },
                  price_change_percentage: { h1: "9.1" },
                },
              },
              {
                attributes: {
                  name: "WIF / SOL",
                  volume_usd: { h1: "51000" },
                  price_change_percentage: { h1: "4.2" },
                },
                relationships: {
                  base_token: { data: { id: "solana_EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" } },
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error("optional keyed adapters stay unused in this fixture");
    });

    const pulse = await peekMarketPulse();
    assert.equal(pulse.source, "gecko");
    assert.equal(pulse.ticker, "WIF");
    assert.equal(pulse.name, "WIF");
    assert.equal(pulse.changePct, 4.2);
    assert.notEqual(pulse.ticker, "PAID");
    assert.deepEqual(pulse.fills, []);
  });
});
