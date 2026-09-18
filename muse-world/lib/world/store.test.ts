import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { tickSnapshot } from "../sim/tick";
import { seedWorld } from "./defaults";
import { getWorld, patchWorld, setWorld } from "./store";

afterEach(() => {
  mock.restoreAll();
});

describe("store purity", () => {
  it("get/set/patch stay in memory and never fetch", () => {
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("world store must not touch the network");
    });
    const prior = getWorld();
    const seeded = seedWorld();

    setWorld(seeded);
    assert.equal(getWorld(), seeded);

    const patched = patchWorld((current) => ({
      ...current,
      selected: "trader",
      mindOpen: false,
    }));

    assert.equal(patched.selected, "trader");
    assert.equal(getWorld().selected, "trader");
    assert.equal(fetchMock.mock.callCount(), 0);

    setWorld(prior);
  });

  it("can apply a client tick through patchWorld without network", () => {
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("store+tick must not fetch");
    });
    const prior = getWorld();
    setWorld(seedWorld());

    const next = patchWorld((current) => tickSnapshot(current, { kind: "QUIET", ticker: null }));
    assert.ok(next.muses.builder);
    assert.equal(next.muses.scroller.name, "Pip");
    assert.equal(next.muses.trader.name, "Tape");
    assert.equal(next.muses.chill.name, "Sable");
    assert.equal(next.muses.builder.name, "Halo");
    assert.equal(next.muses.scroller.role, "WAVE");
    assert.equal(fetchMock.mock.callCount(), 0);

    setWorld(prior);
  });
});
