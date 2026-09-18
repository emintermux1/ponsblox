import assert from "node:assert/strict";
import { test } from "node:test";
import { MUSE_IDS } from "@/types/world";
import { GROK_NAME } from "./cast";
import { seedWorld } from "./defaults";
import {
  COSTUME,
  GROK_SPECIES,
  GROK_SPRITE,
  HUG_MUSE_SPRITE,
  MUSE_SPECIES,
  MUSE_SPRITES_IN_WORLD,
  grokCompanyLine,
  grokIsFluff,
  grokLookAt,
  museCostume,
  museHasEars,
  museHugsGrok,
  museSprite,
  speciesOfActor,
} from "./species";

test("Muse and Grok are two species, never one clay bear", () => {
  assert.equal(speciesOfActor("muse"), MUSE_SPECIES);
  assert.equal(speciesOfActor("grok"), GROK_SPECIES);
  assert.notEqual(MUSE_SPECIES, GROK_SPECIES);
  assert.equal(grokIsFluff(), false);
  assert.equal(MUSE_SPRITES_IN_WORLD, true);
  assert.equal(GROK_SPRITE, "/muse/grok-orb.png");
  assert.doesNotMatch(HUG_MUSE_SPRITE, /grok-orb/);
});

test("loft muses are named costumes, not MUSE 01 snowmen", () => {
  assert.deepEqual(
    MUSE_IDS.map((id) => COSTUME[id].name),
    ["Pip", "Tape", "Sable", "Halo"],
  );
  assert.equal(museCostume("scroller"), "wave");
  assert.equal(museCostume("trader"), "cap");
  assert.equal(museCostume("chill"), "scarf");
  assert.equal(museCostume("builder"), "halo");
  assert.equal(museHasEars("builder"), true);
  assert.equal(museHasEars("scroller"), false);
  assert.equal(museSprite("scroller"), "/muse/wave.png");
  assert.equal(museSprite("trader"), "/muse/cap.png");
  assert.equal(museSprite("chill"), "/muse/sable.png");
  assert.equal(museSprite("builder"), "/muse/halo.png");
  for (const id of MUSE_IDS) {
    assert.doesNotMatch(COSTUME[id].name, /muse\s*0*\d/i);
    assert.ok(COSTUME[id].sprite.startsWith("/muse/"));
    assert.ok(COSTUME[id].still.startsWith("/muse/"));
  }
});

test("Grok watches a muse instead of sharing a mesh", () => {
  const world = seedWorld();
  world.selected = "trader";
  assert.deepEqual(grokLookAt(world), [
    world.muses.trader.position[0],
    world.muses.trader.position[1] + 0.74,
    world.muses.trader.position[2],
  ]);
  assert.equal(grokCompanyLine("Tape"), `${GROK_NAME} is with Tape`);
  assert.equal(museHugsGrok(world.muses.trader, "trader"), true);
  assert.equal(museHugsGrok(world.muses.chill, null), false);
});
