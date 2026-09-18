import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { MUSE_IDS } from "@/types/world";
import { seedWorld } from "./defaults";
import {
  COSTUME,
  GROK_SPECIES,
  GROK_SPRITE,
  HUG_MUSE_SPRITE,
  MUSE_SPECIES,
  MUSE_SPRITES_IN_WORLD,
  grokIsFluff,
  museCostume,
  museHasEars,
  museHugsGrok,
  museSprite,
  museStill,
  speciesOfActor,
} from "./species";

const MUSE_DIR = join(process.cwd(), "public/muse");

function bytes(name: string): Buffer {
  return readFileSync(join(MUSE_DIR, name));
}

test("Muse and Grok are two species, never one clay bear", () => {
  assert.equal(speciesOfActor("muse"), MUSE_SPECIES);
  assert.equal(speciesOfActor("grok"), GROK_SPECIES);
  assert.notEqual(MUSE_SPECIES, GROK_SPECIES);
  assert.equal(grokIsFluff(), false);
  assert.equal(MUSE_SPRITES_IN_WORLD, false);
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
  assert.equal(museHasEars("scroller"), true);
  assert.equal(museHasEars("trader"), true);
  assert.equal(museHasEars("chill"), true);
  assert.equal(museSprite("scroller"), "/muse/wave.jpg");
  assert.equal(museSprite("trader"), "/muse/cap.jpg");
  assert.equal(museSprite("chill"), "/muse/sable.jpg");
  assert.equal(museSprite("builder"), "/muse/halo.jpg");
  assert.equal(museStill("scroller"), "/muse/wave.jpg");
  for (const id of MUSE_IDS) {
    assert.doesNotMatch(COSTUME[id].name, /muse\s*0*\d/i);
    assert.ok(COSTUME[id].sprite.startsWith("/muse/"));
    assert.ok(COSTUME[id].still.startsWith("/muse/"));
    assert.notEqual(COSTUME[id].sprite, GROK_SPRITE);
  }
});

test("costume stills are four different owner photos", () => {
  const wave = bytes("wave.jpg");
  const cap = bytes("cap.jpg");
  const sable = bytes("sable.jpg");
  const halo = bytes("halo.jpg");
  const grok = bytes("grok-orb.jpg");
  assert.notEqual(wave.equals(cap), true);
  assert.notEqual(wave.equals(halo), true);
  assert.notEqual(cap.equals(sable), true);
  assert.notEqual(sable.equals(halo), true);
  assert.notEqual(grok.equals(wave), true);
  assert.notEqual(bytes("wave.jpg").equals(bytes("halo.jpg")), true);
});

test("a waking muse can hug Grok without sharing a mesh", () => {
  const world = seedWorld();
  assert.equal(museHugsGrok(world.muses.trader, "trader"), true);
  assert.equal(museHugsGrok(world.muses.chill, null), false);
});
