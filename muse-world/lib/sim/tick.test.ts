import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { seedWorld } from "../world/defaults";
import { STATIONS, nearXZ } from "../world/layout";
import { honestyFromLabel } from "../adapters/source";
import { applyActivity, deskGrokLive, pickTicker, realTicker, tickSnapshot } from "./tick";

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
    const next = applyActivity(muse, "WATCHING", "JUP");

    assert.equal(fetchMock.mock.callCount(), 0);
    assert.deepEqual(muse, frozen);
    assert.equal(next.activity, "WATCHING");
    assert.equal(next.mind.watching, "JUP");
  });

  it("does not keep PAID as a watched gecko ticker", () => {
    const muse = seedWorld().muses.trader;
    const next = applyActivity(muse, "WATCHING", "PAID");
    assert.equal(next.mind.watching, null);
    assert.notEqual(next.mind.watching, "PAID");
  });
});

describe("junk tickers stay off the tape", () => {
  it("does not watch PAID or pad coins from a junk pulse", () => {
    for (let i = 0; i < 48; i += 1) {
      const next = tickSnapshot(
        seedWorld(),
        { kind: "TREND_SPIKE", ticker: "PAID" },
        10_000 + i,
        () => (i % 7) / 10,
      );
      assert.notEqual(next.muses.trader.mind.watching, "PAID");
      assert.notEqual(next.muses.scroller.mind.watching, "PAID");
      if (next.packet) {
        assert.notEqual(next.packet.label, "PAID");
        assert.notEqual(next.packet.label, "$PAID");
      }
    }
    assert.equal(pickTicker("PAID"), null);
    assert.equal(pickTicker("SNAPPAD"), null);
    assert.equal(pickTicker("WIF"), "WIF");
  });
});

describe("real pulse only", () => {
  it("never invents PAID as a ticker", () => {
    assert.equal(realTicker("PAID"), null);
    assert.equal(realTicker("paid"), null);
    assert.equal(pickTicker(null), null);
    assert.equal(pickTicker("PAID"), null);
    assert.equal(pickTicker("JUP"), "JUP");
  });

  it("does not watch PAID even when applyActivity is handed it", () => {
    const next = applyActivity(seedWorld().muses.trader, "WATCHING", "PAID");
    assert.equal(next.mind.watching, null);
    assert.equal(next.mind.action, "WATCH");
  });

  it("rest uses PASS instead of IDLE", () => {
    const next = applyActivity(seedWorld().muses.chill, "CHILLING", null);
    assert.equal(next.mind.action, "PASS");
    assert.notEqual(next.activity, "IDLE");
  });
});

describe("tick events stay SIM", () => {
  it("never labels local packets or events as bot/xai/gecko", () => {
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("tick events must not fetch");
    });

    for (let i = 0; i < 64; i += 1) {
      const next = tickSnapshot(seedWorld(), { kind: "TREND_SPIKE", ticker: "JUP" });
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

describe("purposeful work", () => {
  it("walks a displaced trader back to the desk", () => {
    const world = seedWorld();
    world.muses.trader = {
      ...world.muses.trader,
      activity: "WALKING",
      position: [-2.4, 0.62, 3.1],
    };
    const next = tickSnapshot(world, { kind: "QUIET", ticker: null }, 20_000, () => 0.01);
    assert.equal(next.muses.trader.activity, "WALKING");
    assert.ok(next.muses.trader.position[0] > -2.4);
    assert.ok(next.muses.trader.position[0] < 3.4);
  });

  it("keeps chill on the armchair when already there", () => {
    const world = seedWorld();
    const next = tickSnapshot(world, { kind: "QUIET", ticker: null }, 1_000, () => 0.99);
    assert.ok(nearXZ(next.muses.chill.position, STATIONS.chillArmchair.position, 0.16));
    assert.notEqual(next.muses.chill.activity, "IDLE");
  });

  it("lets chill peek stories on the armchair and keeps the scroller on the sofa", () => {
    const world = seedWorld();
    const peek = tickSnapshot(world, { kind: "QUIET", ticker: null }, 2_000, () => 0.05);
    assert.equal(peek.muses.chill.activity, "SCROLLING");
    assert.ok(nearXZ(peek.muses.chill.position, STATIONS.chillArmchair.position, 0.16));
    assert.equal(peek.muses.scroller.activity, "SCROLLING");
    assert.ok(nearXZ(peek.muses.scroller.position, STATIONS.scrollerSofa.position, 0.16));
  });

  it("reacts to a real pulse ticker at the desk", () => {
    const next = tickSnapshot(seedWorld(), { kind: "TREND_SPIKE", ticker: "JUP" }, 20_000, () => 0.05);
    assert.equal(next.muses.trader.mind.watching, "JUP");
    assert.notEqual(next.muses.trader.activity, "IDLE");
    assert.ok(
      next.muses.trader.activity === "WATCHING" ||
        next.muses.trader.activity === "TRADING" ||
        next.muses.trader.activity === "REACTING" ||
        next.muses.trader.activity === "THINKING",
    );
  });

  it("never leaves a muse IDLE after a tick", () => {
    let world = seedWorld();
    for (let i = 0; i < 20; i += 1) {
      world = tickSnapshot(world, { kind: "QUIET", ticker: null }, 8_000 + i * 900, () => 0.2);
    }
    for (const muse of Object.values(world.muses)) {
      assert.notEqual(muse.activity, "IDLE");
      assert.notEqual(muse.mind.action, "IDLE");
    }
  });
});

describe("desk grok orb", () => {
  it("pulses on wake and real xAI, not on tape chatter", () => {
    const now = 50_000;
    assert.equal(deskGrokLive([], now), false);
    assert.equal(
      deskGrokLive(
        [{ id: "a", kind: "GROK_REQUESTED", museId: "trader", text: "wake", at: now - 400, source: "sim" }],
        now,
      ),
      true,
    );
    assert.equal(
      deskGrokLive(
        [{ id: "b", kind: "GROK_RESPONSE", museId: "trader", text: "note", at: now - 400, source: "xai" }],
        now,
      ),
      true,
    );
    assert.equal(
      deskGrokLive(
        [{ id: "c", kind: "THESIS_CREATED", museId: "builder", text: "card", at: now - 400, source: "world" }],
        now,
      ),
      false,
    );
  });
});
