import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import {
  MARKET_BUDGET_MS,
  MARKET_LIVE_TTL_MS,
  peekMarketPulse,
  resetMarketPulseForTests,
} from "./market.ts";

const KEYS = ["BIRDEYE_API_KEY", "GMGN_API_KEY", "HELIUS_API_KEY"] as const;
const prior = Object.fromEntries(KEYS.map((name) => [name, process.env[name]]));

afterEach(() => {
  mock.restoreAll();
  resetMarketPulseForTests();
  for (const name of KEYS) {
    const value = prior[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

function clearPaidKeys() {
  for (const name of KEYS) {
    delete process.env[name];
  }
}

function jsonOk(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("market adapter fetch", () => {
  it("keeps a 12s cache and a 3s budget", () => {
    assert.equal(MARKET_LIVE_TTL_MS, 12_000);
    assert.equal(MARKET_BUDGET_MS, 3_000);
  });

  it("treats 401/402 as skip and still pulses gecko", async () => {
    clearPaidKeys();
    resetMarketPulseForTests();
    process.env.BIRDEYE_API_KEY = "test-key-not-for-logs";
    const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      assert.doesNotMatch(url, /test-key-not-for-logs/);
      if (url.includes("birdeye.so")) {
        return new Response("paywall", { status: 402 });
      }
      if (url.includes("geckoterminal.com") && url.includes("trending_pools")) {
        return jsonOk({
          data: [
            {
              attributes: {
                name: "WIF / SOL",
                address: "poolwifxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                volume_usd: { h1: "51000" },
                base_token_price_usd: "1.4",
                price_change_percentage: { h24: "8.2" },
              },
              relationships: {
                base_token: { data: { id: "solana_EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" } },
              },
            },
          ],
        });
      }
      if (url.includes("mainnet-beta.solana.com")) {
        return jsonOk({ jsonrpc: "2.0", result: 123 });
      }
      return new Response("nope", { status: 500 });
    });

    const pulse = await peekMarketPulse();
    assert.equal(pulse.source, "gecko");
    assert.equal(pulse.ticker, "WIF");
    assert.equal(pulse.live, true);
    assert.equal(pulse.providers.birdeye, "skip");
    assert.equal(pulse.providers.solana, "ok");
    assert.equal(pulse.slot, 123);
    assert.deepEqual(pulse.fills, []);
    assert.doesNotMatch(pulse.ticker ?? "", /PAID/);
    assert.ok(fetchMock.mock.callCount() >= 1);

    const cached = await peekMarketPulse();
    assert.equal(cached.source, "gecko");
    assert.equal(cached.ticker, "WIF");
  });

  it("fails open to sim quiet without inventing fills when every source dies", async () => {
    clearPaidKeys();
    resetMarketPulseForTests();
    mock.method(globalThis, "fetch", async () => {
      throw new Error("fixture — not a live tape");
    });
    const pulse = await peekMarketPulse();
    assert.equal(pulse.source, "sim");
    assert.equal(pulse.kind, "QUIET");
    assert.deepEqual(pulse.fills, []);
    assert.deepEqual(pulse.tape, []);
    assert.deepEqual(pulse.candles, []);
    assert.equal(pulse.live, false);
  });
});
