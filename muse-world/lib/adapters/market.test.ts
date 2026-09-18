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

  it("wires DexScreener plus Solana and skips a 401 GMGN key", async () => {
    clearPaidKeys();
    resetMarketPulseForTests();
    process.env.GMGN_API_KEY = "gmgn-fixture-not-for-logs";
    process.env.HELIUS_API_KEY = "helius-fixture-not-for-logs";
    const seen: string[] = [];
    mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      seen.push(url.includes("helius-rpc.com") ? "helius-rpc.com" : url);
      assert.doesNotMatch(url, /gmgn-fixture-not-for-logs/);
      if (url.includes("openapi.gmgn.ai")) {
        return new Response("nope", { status: 401 });
      }
      if (url.includes("geckoterminal.com") && url.includes("trending_pools")) {
        return jsonOk({ data: [] });
      }
      if (url.includes("token-boosts") || url.includes("token-profiles")) {
        return jsonOk([
          { chainId: "solana", tokenAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
        ]);
      }
      if (url.includes("tokens/v1/solana/")) {
        return jsonOk([
          {
            chainId: "solana",
            dexId: "raydium",
            pairAddress: "poolwifxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            baseToken: {
              address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
              symbol: "WIF",
              name: "dogwifhat",
            },
            priceUsd: "1.25",
            priceChange: { h24: 3.5 },
            volume: { h24: 22_000 },
            liquidity: { usd: 80_000 },
            marketCap: 900_000,
            info: { imageUrl: "https://cdn.dexscreener.com/wif.png" },
          },
        ]);
      }
      if (url.includes("mainnet-beta.solana.com") || url.includes("helius-rpc.com")) {
        return jsonOk({ jsonrpc: "2.0", result: 456 });
      }
      if (url.includes("latest/dex/tokens/")) {
        return jsonOk({ pairs: [{ chainId: "solana", priceUsd: "148.2", liquidity: { usd: 1 } }] });
      }
      return new Response("nope", { status: 500 });
    });

    const pulse = await peekMarketPulse();
    assert.equal(pulse.source, "dexscreener");
    assert.equal(pulse.ticker, "WIF");
    assert.equal(pulse.name, "dogwifhat");
    assert.equal(pulse.priceUsd, 1.25);
    assert.equal(pulse.changePct, 3.5);
    assert.equal(pulse.dexId, "raydium");
    assert.equal(pulse.providers.gmgn, "skip");
    assert.equal(pulse.providers.dexscreener, "ok");
    assert.equal(pulse.solUsd, 148.2);
    assert.deepEqual(pulse.fills, []);
    assert.ok(!seen.some((url) => url.includes("gmgn-fixture") || url.includes("helius-fixture")));
    assert.ok(seen.some((url) => url.includes("api.dexscreener.com")));
  });

  it("does not call GMGN, Birdeye, or Helius when those keys are missing", async () => {
    clearPaidKeys();
    resetMarketPulseForTests();
    const seen: string[] = [];
    mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      seen.push(url);
      if (url.includes("geckoterminal.com")) {
        return jsonOk({ data: [] });
      }
      if (url.includes("dexscreener.com") || url.includes("mainnet-beta.solana.com")) {
        return new Response("nope", { status: 500 });
      }
      return new Response("nope", { status: 500 });
    });
    const pulse = await peekMarketPulse();
    assert.equal(pulse.providers.birdeye, "skip");
    assert.equal(pulse.providers.gmgn, "skip");
    assert.equal(pulse.providers.helius, "skip");
    assert.ok(
      !seen.some(
        (url) =>
          url.includes("birdeye.so") || url.includes("openapi.gmgn.ai") || url.includes("helius-rpc.com"),
      ),
    );
    assert.deepEqual(pulse.fills, []);
  });
});
