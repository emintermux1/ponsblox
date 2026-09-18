import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { POST } from "../app/api/grok/ingest/route";
import { getWorld, setWorld } from "../lib/world/store";
import { seedWorld } from "../lib/world/defaults";

const priorSecret = process.env.GROK_INGEST_SECRET;

afterEach(() => {
  if (priorSecret === undefined) {
    delete process.env.GROK_INGEST_SECRET;
  } else {
    process.env.GROK_INGEST_SECRET = priorSecret;
  }
});

async function ingest(headers: HeadersInit, body: unknown) {
  return POST(
    new Request("http://localhost/api/grok/ingest", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

describe("grok ingest auth", () => {
  it("returns 401 without x-muse-ingest", async () => {
    process.env.GROK_INGEST_SECRET = "test-ingest-fixture";
    const prior = getWorld();
    setWorld(seedWorld());

    const response = await ingest(
      {},
      { museId: "trader", summary: "FIXTURE — not a live Grok reply" },
    );

    assert.equal(response.status, 401);
    const payload = (await response.json()) as { error?: string };
    assert.equal(payload.error, "unauthorized");
    assert.equal(getWorld().events.length, 0);

    setWorld(prior);
  });

  it("returns 401 when GROK_INGEST_SECRET is unset even if a header is sent", async () => {
    delete process.env.GROK_INGEST_SECRET;
    const response = await ingest(
      { "x-muse-ingest": "test-ingest-fixture" },
      { museId: "trader", summary: "FIXTURE — not a live Grok reply" },
    );
    assert.equal(response.status, 401);
  });

  it("does not accept Authorization in place of x-muse-ingest", async () => {
    process.env.GROK_INGEST_SECRET = "test-ingest-fixture";
    const response = await ingest(
      { authorization: "Bearer test-ingest-fixture" },
      { museId: "trader", summary: "FIXTURE — not a live Grok reply" },
    );
    assert.equal(response.status, 401);
  });
});
