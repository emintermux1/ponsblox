import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { MUSE_IDS } from "@/types/world";
import { GROK_PORTRAIT } from "./cast";
import {
  MUSE_PLUSH_HALO_JPG,
  MUSE_PLUSH_JPG,
  isMusePlushSrc,
  musePlushPhoto,
  musePlushTint,
} from "./muse-face";

const publicRoot = resolve(import.meta.dirname, "../../public");

test("the loft face is the official Muse jpg, not a gray clay body", () => {
  const plushPath = resolve(publicRoot, "muse/muse-plush.jpg");
  const haloPath = resolve(publicRoot, "muse/muse-plush-halo.jpg");
  const plush = readFileSync(plushPath);
  const halo = readFileSync(haloPath);
  assert.equal(plush[0], 0xff);
  assert.equal(plush[1], 0xd8);
  assert.ok(statSync(plushPath).size > 80_000);
  assert.equal(
    createHash("sha256").update(plush).digest("hex"),
    createHash("sha256").update(halo).digest("hex"),
  );
  assert.equal(MUSE_PLUSH_JPG, "/muse/muse-plush.jpg");
  assert.equal(MUSE_PLUSH_HALO_JPG, "/muse/muse-plush-halo.jpg");
});

test("four muses share the official plush photo and tint on top", () => {
  for (const id of MUSE_IDS) {
    const src = musePlushPhoto(id);
    assert.equal(isMusePlushSrc(src), true);
    assert.doesNotMatch(src, /grok/i);
    assert.notEqual(musePlushTint(id), "#ffffff");
    assert.notEqual(musePlushTint(id), "#888888");
  }
  assert.equal(musePlushPhoto("builder"), MUSE_PLUSH_HALO_JPG);
  assert.equal(musePlushPhoto("scroller"), MUSE_PLUSH_JPG);
});

test("Grok does not wear the Muse photo", () => {
  assert.equal(isMusePlushSrc(GROK_PORTRAIT), false);
  assert.doesNotMatch(GROK_PORTRAIT, /muse-plush/);
});
