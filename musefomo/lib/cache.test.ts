import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cachePeek, cachePublic, cacheSet, cacheSWR } from "@/lib/cache";

describe("cache SWR", () => {
  it("returns last-good while a refresh is in flight", async () => {
    cacheSet("swr-test", { n: 1 }, 50);
    await new Promise((resolve) => setTimeout(resolve, 60));
    const peek = cachePeek<{ n: number }>("swr-test");
    assert.equal(peek?.fresh, false);
    assert.equal(peek?.value.n, 1);

    let started = false;
    const value = await cacheSWR(
      "swr-test",
      1_000,
      () =>
        new Promise<{ n: number }>((resolve) => {
          started = true;
          setTimeout(() => resolve({ n: 2 }), 30);
        }),
    );
    assert.equal(value.n, 1);
    assert.equal(started, true);
  });

  it("serves last-good instantly and falls back on a hung cold miss", async () => {
    cacheSet("public-stale", { n: 4 }, 20);
    await new Promise((resolve) => setTimeout(resolve, 30));
    const stale = await cachePublic(
      "public-stale",
      1_000,
      () => new Promise<{ n: number }>(() => undefined),
      { n: 0 },
      () => true,
      80,
    );
    assert.equal(stale.n, 4);

    const started = Date.now();
    const cold = await cachePublic(
      "public-cold-hang",
      1_000,
      () => new Promise<{ n: number }>(() => undefined),
      { n: 9 },
      () => true,
      80,
    );
    assert.equal(cold.n, 9);
    assert.ok(Date.now() - started < 400);
  });

  it("does not start a second public load while one is inflight", async () => {
    let loads = 0;
    const load = () => {
      loads += 1;
      return new Promise<{ n: number }>(() => undefined);
    };
    const [a, b] = await Promise.all([
      cachePublic("public-once", 1_000, load, { n: 0 }, () => true, 50),
      cachePublic("public-once", 1_000, load, { n: 0 }, () => true, 50),
    ]);
    assert.equal(a.n, 0);
    assert.equal(b.n, 0);
    assert.equal(loads, 1);
  });
});
