import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { seedWorld } from "../world/defaults";
import { applyGrokIngestToWorld, applyGrokWakeToWorld } from "./apply";
import { resolveWakeResult } from "./parse";
import { honestyFromLabel } from "./source";

describe("apply grok wake to the loft", () => {
  it("writes an xai/REAL caption and never marks the wake as Bot", () => {
    const world = applyGrokWakeToWorld(
      seedWorld(),
      "trader",
      resolveWakeResult(true, {
        source: "xai",
        summary: "thin book, PASS",
        bias: "pass",
      }),
      1_700_000_000_000,
    );
    const event = world.events[0];
    assert.equal(world.muses.trader.thought, "xai/REAL · thin book, PASS");
    assert.equal(world.muses.trader.mind.grok, "thin book, PASS");
    assert.equal(world.muses.trader.mind.action, "PASS");
    assert.equal(event?.source, "xai");
    assert.equal(event?.kind, "GROK_RESPONSE");
    assert.match(event?.text ?? "", /xai\/REAL/);
    assert.doesNotMatch(event?.text ?? "", /bot\/REAL/);
    assert.equal(honestyFromLabel(event?.source ?? "sim"), "real");
  });

  it("uses a labeled SIM literary stub when wake is only a 200", () => {
    const world = applyGrokWakeToWorld(
      seedWorld(),
      "trader",
      resolveWakeResult(true, null),
      2,
    );
    const event = world.events[0];
    assert.match(world.muses.trader.thought ?? "", /^SIM · /);
    assert.doesNotMatch(world.muses.trader.thought ?? "", /waiting on ingest/);
    assert.doesNotMatch(world.muses.trader.thought ?? "", /Grok Bot/);
    assert.equal(event?.source, "sim");
    assert.equal(event?.kind, "GROK_REQUESTED");
    assert.notEqual(event?.source, "bot");
    assert.equal(honestyFromLabel(event?.source ?? "world"), "sim");
  });

  it("labels authorized ingest as bot/REAL loft text", () => {
    const world = applyGrokIngestToWorld(
      seedWorld(),
      "builder",
      "thin book, WATCH",
      3,
    );
    const event = world.events[0];
    assert.equal(world.muses.builder.thought, "bot/REAL · thin book, WATCH");
    assert.equal(world.muses.builder.mind.grok, "thin book, WATCH");
    assert.equal(event?.source, "bot");
    assert.equal(event?.kind, "GROK_RESPONSE");
    assert.match(event?.text ?? "", /bot\/REAL/);
    assert.equal(honestyFromLabel("bot"), "real");
  });

  it("refuses CoT ingest as a loft thought", () => {
    assert.throws(
      () => applyGrokIngestToWorld(seedWorld(), "trader", "let me think through the book"),
      /ingest caption is not a loft line/,
    );
  });
});
