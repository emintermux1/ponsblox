import assert from "node:assert/strict";
import { test } from "node:test";
import { MUSE_IDS } from "@/types/world";
import { isMusePlushSrc, musePlushPhoto, musePlushStill } from "./muse-face";
import { museSprite, museStill } from "./species";

test("each muse face is its own costume still, not one shared clay bear", () => {
  const photos = MUSE_IDS.map((id) => musePlushPhoto(id));
  assert.deepEqual(photos, [
    museSprite("scroller"),
    museSprite("trader"),
    museSprite("chill"),
    museSprite("builder"),
  ]);
  assert.equal(new Set(photos).size, 4);
  for (const id of MUSE_IDS) {
    assert.equal(musePlushStill(id), museStill(id));
    assert.equal(isMusePlushSrc(musePlushPhoto(id)), true);
    assert.equal(isMusePlushSrc("/muse/grok-orb.png"), false);
  }
});
