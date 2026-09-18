import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { seedWorld } from "../world/defaults";
import { honestyFromLabel } from "../adapters/source";
import { applyActivity, tickSnapshot } from "./tick";

afterEach(() => {
  mock.restoreAll();
});

describe("client tick purity", () => {
  it("does not call fetch or mutate the input snapshot", () => {
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("client tick must not touch the network");
    });
    const world = seedWorld();
    const frozen = structuredClone(world);
    const next = tickSnapshot(world, { kind: "QUIET", ticker: null });

    assert.equal(fetchMock.mock.callCount(), 0);
    assert.deepEqual(world, frozen);
    assert.notEqual(next, world);
    assert.ok(next.muses.scroller);
    assert.ok(next.muses.trader);
    assert.ok(next.muses.chill);
    assert.ok(next.muses.builder);
  });

  it("keeps applyActivity local — no network", () => {
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("applyActivity must not fetch");
    });
    const muse = seedWorld().muses.trader;
    const frozen = structuredClone(muse);
    const next = applyActivity(muse, "WATCHING", "WIF");

    assert.equal(fetchMock.mock.callCount(), 0);
    assert.deepEqual(muse, frozen);
    assert.equal(next.activity, "WATCHING");
    assert.equal(next.mind.watching, "WIF");
  });

  it("does not keep PAID as a watched gecko ticker", () => {
    const muse = seedWorld().muses.trader;
    const next = applyActivity(muse, "WATCHING", "PAID");
    assert.equal(next.mind.watching, null);
    assert.notEqual(next.mind.watching, "PAID");
  });
});

describe("tick events stay SIM", () => {
  it("never labels local packets or events as bot/xai/gecko", () => {
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("tick events must not fetch");
    });

    for (let i = 0; i < 64; i += 1) {
      const next = tickSnapshot(seedWorld(), { kind: "TREND_SPIKE", ticker: "WIF" });
      for (const event of next.events) {
        assert.equal(honestyFromLabel(event.source), "sim");
        assert.notEqual(event.source, "bot");
        assert.notEqual(event.source, "xai");
        assert.doesNotMatch(event.text, /\$PAID|\bPAID\b/);
      }
      if (next.packet) {
        assert.ok(next.packet.label);
        assert.notEqual(next.packet.from, undefined);
        assert.doesNotMatch(next.packet.label, /\$PAID|\bPAID\b/);
      }
      for (const pin of next.wallPins) {
        assert.doesNotMatch(pin.label, /\$PAID|\bPAID\b/);
      }
    }

    assert.equal(fetchMock.mock.callCount(), 0);
  });
});
