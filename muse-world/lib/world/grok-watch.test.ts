import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CAST } from "@/lib/world/cast";
import { seedWorld } from "@/lib/world/defaults";
import { grokAttendId, grokCompanyLine, grokLookAt, inChatMuseId } from "./grok-watch.ts";

describe("Grok watches whoever is in chat", () => {
  it("prefers a waking desk muse over a lounge click", () => {
    const world = seedWorld();
    world.selected = "chill";
    world.grokWake.phase = "waking";
    world.grokWake.museId = "trader";
    world.muses.trader.activity = "TRADING";
    assert.equal(inChatMuseId(world), "trader");
    assert.equal(grokAttendId(world), "trader");
    const look = grokLookAt(world);
    assert.equal(look[0], world.muses.trader.position[0]);
    assert.equal(look[2], world.muses.trader.position[2]);
  });

  it("names the real company line with the muse, not Grok-as-muse", () => {
    const world = seedWorld();
    world.grokWake.honesty = "REAL";
    world.grokWake.museId = "trader";
    assert.equal(grokCompanyLine(world), `Grok is with ${CAST.trader.name}`);
    assert.notEqual(CAST.trader.name, "GROK");
  });
});
