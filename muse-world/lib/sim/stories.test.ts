import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { seedWorld } from "../world/defaults";
import { WALL_SLOT_COUNT } from "../world/layout";
import {
  cooled,
  nextWallSlot,
  packetLive,
  pickStoryBeat,
  STORY_COOLDOWN_MS,
  upsertWallPin,
  type StoryInput,
} from "./stories";
import { tickSnapshot } from "./tick";
import { isTickerSlopHeadline, wallNoteForSlot } from "../world/wall-copy";
import type { MuseState, WorldEvent } from "../../types/world";

function event(kind: WorldEvent["kind"], at: number, museId: WorldEvent["museId"] = "chill"): WorldEvent {
  return { id: `t_${kind}_${at}`, kind, museId, text: kind, at, source: "world" };
}

function input(partial: Partial<StoryInput> & { muses?: StoryInput["muses"] }): StoryInput {
  const world = seedWorld();
  return {
    muses: partial.muses ?? world.muses,
    events: partial.events ?? [],
    packet: partial.packet ?? null,
    wallPins: partial.wallPins ?? [],
    spiked: partial.spiked ?? false,
    pulseTicker: partial.pulseTicker ?? null,
    now: partial.now ?? 1_000_000,
    random: partial.random ?? (() => 0),
  };
}

function withBoredom(muse: MuseState, value: number): MuseState {
  return { ...muse, mind: { ...muse.mind, nodes: { ...muse.mind.nodes, BOREDOM: value } } };
}

describe("story cooldowns", () => {
  it("blocks a kind inside its window", () => {
    const now = 50_000;
    const events = [event("BOREDOM", now - 4_000)];
    assert.equal(cooled(events, "BOREDOM", STORY_COOLDOWN_MS.BOREDOM, now), false);
    assert.equal(cooled(events, "NEW_DISCOVERY", STORY_COOLDOWN_MS.NEW_DISCOVERY, now), true);
  });

  it("keeps a live packet occupied", () => {
    assert.equal(
      packetLive({ from: "scroller", to: "trader", label: "WIF", t: 1_000, kind: "NOTE" }, 2_000),
      true,
    );
    assert.equal(
      packetLive({ from: "scroller", to: "trader", label: "WIF", t: 1_000, kind: "NOTE" }, 4_000),
      false,
    );
  });
});

describe("wall slots", () => {
  it("fills empty slots then the oldest", () => {
    assert.equal(nextWallSlot([]), 0);
    const pins = Array.from({ length: WALL_SLOT_COUNT }, (_, slot) => ({
      id: `p${slot}`,
      label: wallNoteForSlot(slot),
      slot,
      at: slot === 1 ? 3 : 10 + slot,
    }));
    assert.equal(nextWallSlot(pins), 1);
    const next = upsertWallPin(pins, "PENGU", 1, 20).find((pin) => pin.slot === 1);
    assert.equal(next?.label, wallNoteForSlot(1));
    assert.notEqual(next?.label, "PENGU");
    assert.equal(isTickerSlopHeadline(next?.label), false);
  });
});

describe("pickStoryBeat", () => {
  it("sends a discovery note from scroller to trader", () => {
    const beat = pickStoryBeat(input({ spiked: true, pulseTicker: "JUP", random: () => 0.1 }));
    assert.deepEqual(beat, { type: "discovery", ticker: "JUP" });
  });

  it("does not replace a live packet with another cross-agent beat", () => {
    const beat = pickStoryBeat(
      input({
        spiked: true,
        pulseTicker: "JUP",
        packet: { from: "builder", to: "trader", label: "JUP", t: 999_000, kind: "NOTE" },
        now: 1_000_000,
        random: () => 0.1,
      }),
    );
    assert.equal(beat, null);
  });

  it("pins a thesis to the wall when someone is watching", () => {
    const world = seedWorld();
    world.muses.trader.mind.watching = "WIF";
    world.muses.builder.activity = "RESEARCHING";
    const beat = pickStoryBeat(
      input({
        muses: world.muses,
        pulseTicker: "WIF",
        random: () => 0.1,
      }),
    );
    assert.equal(beat?.type, "thesis");
    if (beat?.type === "thesis") {
      assert.equal(beat.ticker, "WIF");
      assert.equal(beat.slot, 0);
    }
  });

  it("does not invent a thesis on a quiet room with no watch", () => {
    const beat = pickStoryBeat(input({ spiked: false, pulseTicker: null, random: () => 0.1 }));
    assert.notEqual(beat?.type, "thesis");
  });

  it("lets chill stay bored without a packet", () => {
    const world = seedWorld();
    world.muses.chill = withBoredom(world.muses.chill, 0.8);
    const beat = pickStoryBeat(input({ muses: world.muses, random: () => 0.1 }));
    assert.deepEqual(beat, { type: "boredom", ticker: null });
  });

  it("does not overfire boredom", () => {
    const world = seedWorld();
    world.muses.chill = withBoredom(world.muses.chill, 0.9);
    const beat = pickStoryBeat(
      input({
        muses: world.muses,
        events: [event("BOREDOM", 990_000)],
        now: 1_000_000,
        random: () => 0.1,
      }),
    );
    assert.equal(beat, null);
  });

  it("skips a PAID pulse instead of asking for a PAID card", () => {
    const world = seedWorld();
    world.muses.trader.mind.watching = "PAID";
    world.muses.builder.activity = "RESEARCHING";
    const beat = pickStoryBeat(
      input({
        muses: world.muses,
        pulseTicker: "PAID",
        events: [event("THESIS_CREATED", 990_000, "builder")],
        now: 1_000_000,
        random: () => 0.1,
      }),
    );
    assert.equal(beat, null);
  });

  it("asks the builder for a card after a thesis cooldown", () => {
    const world = seedWorld();
    world.muses.trader.mind.watching = "WIF";
    world.muses.builder.activity = "RESEARCHING";
    const beat = pickStoryBeat(
      input({
        muses: world.muses,
        pulseTicker: "WIF",
        events: [event("THESIS_CREATED", 990_000, "builder")],
        now: 1_000_000,
        random: () => 0.1,
      }),
    );
    assert.deepEqual(beat, { type: "ask_card", ticker: "WIF" });
  });

  it("shares a ticker from scroller to builder", () => {
    const world = seedWorld();
    world.muses.scroller.mind.nodes.ATTENTION = 0.6;
    world.muses.builder.activity = "THINKING";
    const beat = pickStoryBeat(
      input({
        muses: world.muses,
        pulseTicker: "PINT",
        random: () => 0.1,
      }),
    );
    assert.deepEqual(beat, { type: "share_builder", ticker: "PINT" });
  });

  it("waves a ticker at chill as a social beat", () => {
    const world = seedWorld();
    world.muses.chill = withBoredom(world.muses.chill, 0.6);
    world.muses.builder.activity = "THINKING";
    const beat = pickStoryBeat(
      input({
        muses: world.muses,
        pulseTicker: "BONK",
        random: () => 0.1,
      }),
    );
    assert.deepEqual(beat, { type: "wave_chill", ticker: "BONK" });
  });
});

describe("tickSnapshot stories", () => {
  it("never invents fills", () => {
    const pulse = { kind: "TREND_SPIKE" as const, ticker: "WIF" };
    let world = seedWorld();
    world.muses.chill = withBoredom(world.muses.chill, 0.85);
    world.muses.trader.mind.watching = "WIF";
    for (let i = 0; i < 80; i += 1) {
      world = tickSnapshot(world, pulse, 10_000 + i * 900, () => (i % 7) / 10);
    }
    assert.equal(
      world.events.some(
        (item) => item.kind === "POSITION_OPENED" || item.kind === "POSITION_CLOSED",
      ),
      false,
    );
    assert.ok(world.events.length <= 24);
  });

  it("does not invent a watch or thesis on a quiet room", () => {
    let world = seedWorld();
    for (let i = 0; i < 24; i += 1) {
      world = tickSnapshot(world, { kind: "QUIET", ticker: null }, 10_000 + i * 900, () => 0.4);
    }
    assert.equal(world.muses.trader.mind.watching, null);
    assert.equal(world.wallPins.length, 0);
    assert.equal(
      world.events.some(
        (item) => item.kind === "THESIS_CREATED" || item.kind === "NEW_DISCOVERY",
      ),
      false,
    );
  });

  it("keeps a two-minute quiet room sparse", () => {
    let world = seedWorld();
    let rng = 7;
    const random = () => {
      rng = (rng * 9301 + 49297) % 233280;
      return rng / 233280;
    };
    for (let i = 0; i < 133; i += 1) {
      world = tickSnapshot(world, { kind: "QUIET", ticker: null }, 1_000_000 + i * 900, random);
    }
    const kinds = world.events.map((item) => item.kind);
    assert.equal(kinds.includes("THESIS_CREATED"), false);
    assert.equal(kinds.includes("NEW_DISCOVERY"), false);
    assert.ok(kinds.filter((kind) => kind === "BOREDOM").length <= 5);
    assert.ok(world.events.length <= 8);
  });

  it("arrives from a walk as CHILLING, not IDLE", () => {
    const world = seedWorld();
    world.muses.chill = {
      ...world.muses.chill,
      activity: "WALKING",
      position: [-1.6, 0.62, 3.5],
    };
    const next = tickSnapshot(world, { kind: "QUIET", ticker: null }, 1_000, () => 0.99);
    assert.equal(next.muses.chill.activity, "CHILLING");
    assert.notEqual(next.muses.chill.activity, "IDLE");
  });

  it("lands a wall pin from a thesis beat", () => {
    const world = seedWorld();
    world.muses.trader.mind.watching = "JUP";
    world.muses.builder.activity = "RESEARCHING";
    const next = tickSnapshot(
      world,
      { kind: "QUIET", ticker: "JUP" },
      20_000,
      () => 0.05,
    );
    assert.equal(next.packet?.kind, "PIN");
    assert.equal(next.packet?.to, "wall");
    assert.equal(next.wallPins[0]?.label, wallNoteForSlot(next.wallPins[0]?.slot ?? 0));
    assert.notEqual(next.wallPins[0]?.label, "JUP");
    assert.notEqual(next.packet?.label, "JUP");
    assert.equal(isTickerSlopHeadline(next.wallPins[0]?.label), false);
    assert.doesNotMatch(next.wallPins[0]?.label ?? "", /\$PAID|\bPAID\b/);
    assert.equal(next.events[0]?.kind, "THESIS_CREATED");
    assert.doesNotMatch(next.events[0]?.text ?? "", /\$PAID|\bPAID\b|\$JUP/);
  });

  it("never pins PAID from a PAID pulse", () => {
    const world = seedWorld();
    world.muses.trader.mind.watching = "PAID";
    world.muses.builder.activity = "RESEARCHING";
    const next = tickSnapshot(
      world,
      { kind: "TREND_SPIKE", ticker: "PAID" },
      20_000,
      () => 0.05,
    );
    assert.equal(next.muses.trader.mind.watching, null);
    for (const pin of next.wallPins) {
      assert.doesNotMatch(pin.label, /paid/i);
      assert.equal(isTickerSlopHeadline(pin.label), false);
    }
    if (next.packet) {
      assert.doesNotMatch(next.packet.label, /paid/i);
    }
    for (const item of next.events) {
      assert.doesNotMatch(item.text, /\$PAID|\bPAID\b/);
    }
  });
});
