import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SIM_GROK_SUMMARY } from "../adapters/source";
import { shotForPreset } from "./camera";
import { museGivenName, seedWorld } from "./defaults";
import {
  applyGrokFocus,
  applyGrokWake,
  applyMuseSelect,
  applyScreenInspect,
  inspectCopy,
} from "./pick";
import { MUSE_IDS } from "../../types/world";

describe("muse names", () => {
  it("gives each muse a name that is not Muse 02", () => {
    const world = seedWorld();
    for (const id of MUSE_IDS) {
      const name = museGivenName(id);
      assert.equal(world.muses[id].name, name);
      assert.doesNotMatch(name, /muse\s*0*\d/i);
      assert.notEqual(name, "Muse 02");
      assert.notEqual(name, "MUSE 02");
    }
  });
});

describe("loft pick", () => {
  it("selecting a muse looks at them and keeps their name and activity", () => {
    const world = seedWorld();
    const next = applyMuseSelect(world, "trader");
    assert.equal(next.selected, "trader");
    assert.equal(next.inspecting, null);
    assert.equal(next.camera, "TRADER");
    assert.equal(next.muses.trader.name, world.muses.trader.name);
    assert.equal(next.muses.trader.activity, world.muses.trader.activity);
    const shot = shotForPreset("TRADER", "trader", world.muses.trader.position);
    assert.equal(shot.target[0], world.muses.trader.position[0]);
    assert.equal(shot.target[2], world.muses.trader.position[2]);
  });

  it("select does not rewrite TRADING into WATCHING", () => {
    const world = seedWorld();
    world.muses.trader.activity = "TRADING";
    const next = applyMuseSelect(world, "trader");
    assert.equal(next.muses.trader.activity, "TRADING");
  });

  it("clearing a muse returns the room", () => {
    const selected = applyMuseSelect(seedWorld(), "scroller");
    const next = applyMuseSelect(selected, null);
    assert.equal(next.selected, null);
    assert.equal(next.camera, "ROOM");
  });

  it("inspecting a lit screen is not a $PAID wall", () => {
    const world = seedWorld();
    world.muses.trader.mind.watching = "PAID";
    world.wallPins = [{ id: "pin", label: "PAID", slot: 0, at: 1 }];
    const next = applyScreenInspect(world, "tape");
    assert.equal(next.inspecting, "tape");
    assert.equal(next.camera, "TRADER");
    const tape = inspectCopy(next, "tape");
    assert.equal(tape.title, "Tape");
    assert.equal(tape.lines.some((line) => /\$/.test(line)), false);
    assert.equal(inspectCopy(next, "notes").lines.some((line) => /\$paid\b/i.test(line)), false);
    assert.equal(
      tape.lines.includes("looking, without an outside name"),
      true,
    );
  });
});

describe("grok wake honesty", () => {
  it("looks at the orb while waking and does not invent a reply", () => {
    const focused = applyGrokFocus(seedWorld(), "trader");
    assert.equal(focused.camera, "GROK");
    assert.equal(focused.selected, null);
    assert.equal(focused.grokWake.phase, "waking");
    assert.equal(focused.grokWake.summary, null);
    const shot = shotForPreset("GROK", null, null);
    assert.equal(shot.target[1] > 1, true);
  });

  it("labels a missing adapter as SIM with the adapter line only", () => {
    const next = applyGrokWake(seedWorld(), null, "trader", 10);
    assert.equal(next.grokWake.phase, "done");
    assert.equal(next.grokWake.honesty, "SIM");
    assert.equal(next.grokWake.source, "sim");
    assert.equal(next.grokWake.summary, SIM_GROK_SUMMARY);
    assert.equal(next.events[0]?.source, "sim");
    assert.match(next.events[0]?.text ?? "", /SIM/);
    assert.doesNotMatch(next.events[0]?.text ?? "", /as an ai|let me think/i);
  });

  it("labels xAI as REAL and keeps the adapter sentence", () => {
    const next = applyGrokWake(
      seedWorld(),
      {
        woken: false,
        pendingIngest: false,
        reply: { source: "xai", summary: "thin book, PASS" },
      },
      "builder",
      11,
    );
    assert.equal(next.grokWake.honesty, "REAL");
    assert.equal(next.grokWake.source, "xai");
    assert.equal(next.grokWake.summary, "thin book, PASS");
    assert.equal(next.events[0]?.source, "xai");
    assert.equal(next.muses.builder.mind.grok, "thin book, PASS");
    assert.equal(next.packet?.from, "grok");
    assert.equal(next.packet?.to, "builder");
  });
});
