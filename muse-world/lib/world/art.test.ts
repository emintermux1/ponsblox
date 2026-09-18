import assert from "node:assert/strict";
import { test } from "node:test";
import { MUSE_ART, MUSE_ART_IDS, museArtSrc } from "./art";

test("generated loft stills live under /muse", () => {
  assert.deepEqual(MUSE_ART_IDS, ["hug", "grok", "banner", "halo", "laptop"]);
  for (const id of MUSE_ART_IDS) {
    const src = museArtSrc(id);
    assert.equal(src.startsWith("/muse/"), true);
    assert.equal(src.endsWith(".jpg"), true);
    assert.doesNotMatch(src, /\$PAID|paid/i);
    assert.equal(src, MUSE_ART[id]);
  }
});
