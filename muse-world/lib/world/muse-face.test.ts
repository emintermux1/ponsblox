import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { MUSE_IDS } from "@/types/world";
import { GROK_PORTRAIT } from "./cast";
import {
  MUSE_PLUSH_JPG,
  MUSE_PLUSH_PNG,
  isMusePlushSrc,
  musePlushBillboard,
  musePlushPhoto,
  musePlushTint,
} from "./muse-face";

const publicRoot = resolve(import.meta.dirname, "../../public");

test("every loft muse wears the official cream plush still", () => {
  const stills = new Set(MUSE_IDS.map((id) => musePlushPhoto(id)));
  assert.deepEqual([...stills], [MUSE_PLUSH_JPG]);
  for (const id of MUSE_IDS) {
    assert.equal(musePlushPhoto(id), MUSE_PLUSH_JPG);
    assert.equal(musePlushBillboard(id), MUSE_PLUSH_PNG);
    assert.equal(musePlushTint(id), "#ffffff");
    assert.equal(isMusePlushSrc(musePlushPhoto(id)), true);
    assert.doesNotMatch(musePlushPhoto(id), /grok/i);
  }

  const jpgPath = resolve(publicRoot, MUSE_PLUSH_JPG.replace(/^\//, ""));
  const pngPath = resolve(publicRoot, MUSE_PLUSH_PNG.replace(/^\//, ""));
  const jpg = readFileSync(jpgPath);
  const png = readFileSync(pngPath);
  assert.equal(jpg[0], 0xff);
  assert.equal(jpg[1], 0xd8);
  assert.equal(png[0], 0x89);
  assert.equal(png[1], 0x50);
  assert.ok(statSync(jpgPath).size > 80_000);
  assert.ok(statSync(pngPath).size > 80_000);
});

test("Grok stays a pill-eye orb, not the Muse plush", () => {
  assert.equal(isMusePlushSrc(GROK_PORTRAIT), false);
  assert.match(GROK_PORTRAIT, /grok/i);
});
