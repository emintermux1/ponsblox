import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { MUSE_IDS } from "@/types/world";
import { CAST, GROK_PORTRAIT } from "./cast";
import {
  MUSE_PLUSH_ALPHA,
  MUSE_PLUSH_HALO_JPG,
  MUSE_PLUSH_JPG,
  MUSE_PLUSH_PNG,
  OFFICIAL_PLUSH_SHA256,
  isMusePlushSrc,
  musePlushBillboard,
  musePlushPhoto,
  musePlushTint,
} from "./muse-face";

const publicRoot = resolve(import.meta.dirname, "../../public");

function sha256(rel: string): string {
  const bytes = readFileSync(resolve(publicRoot, rel.replace(/^\//, "")));
  return createHash("sha256").update(bytes).digest("hex");
}

test("every loft muse wears the official cream plush still", () => {
  const stills = new Set(MUSE_IDS.map((id) => musePlushPhoto(id)));
  assert.deepEqual([...stills].sort(), [MUSE_PLUSH_HALO_JPG, MUSE_PLUSH_JPG].sort());
  assert.equal(musePlushPhoto("scroller"), MUSE_PLUSH_JPG);
  assert.equal(musePlushPhoto("trader"), MUSE_PLUSH_JPG);
  assert.equal(musePlushPhoto("chill"), MUSE_PLUSH_JPG);
  assert.equal(musePlushPhoto("builder"), MUSE_PLUSH_HALO_JPG);
  for (const id of MUSE_IDS) {
    assert.equal(musePlushBillboard(id), musePlushPhoto(id));
    assert.equal(isMusePlushSrc(musePlushPhoto(id)), true);
    assert.doesNotMatch(musePlushPhoto(id), /grok/i);
    assert.notEqual(musePlushTint(id), "#ffffff");
    assert.notEqual(musePlushTint(id), "#888888");
  }
  assert.equal(musePlushTint("scroller"), "#fff3e4");
  assert.equal(musePlushTint("trader"), "#ece6f6");
  assert.equal(musePlushTint("chill"), "#e6f2e4");
  assert.equal(musePlushTint("builder"), "#fff1cc");

  const jpgPath = resolve(publicRoot, MUSE_PLUSH_JPG.replace(/^\//, ""));
  const haloPath = resolve(publicRoot, MUSE_PLUSH_HALO_JPG.replace(/^\//, ""));
  const pngPath = resolve(publicRoot, MUSE_PLUSH_PNG.replace(/^\//, ""));
  const alphaPath = resolve(publicRoot, MUSE_PLUSH_ALPHA.replace(/^\//, ""));
  const jpg = readFileSync(jpgPath);
  const halo = readFileSync(haloPath);
  const png = readFileSync(pngPath);
  const alpha = readFileSync(alphaPath);
  assert.equal(jpg[0], 0xff);
  assert.equal(jpg[1], 0xd8);
  assert.equal(halo[0], 0xff);
  assert.equal(halo[1], 0xd8);
  assert.equal(png[0], 0x89);
  assert.equal(png[1], 0x50);
  assert.equal(alpha[0], 0x89);
  assert.ok(statSync(jpgPath).size > 80_000);
  assert.ok(statSync(haloPath).size > 80_000);
  assert.ok(statSync(pngPath).size > 80_000);
  assert.ok(statSync(alphaPath).size > 20_000);
  assert.equal(sha256(MUSE_PLUSH_JPG), OFFICIAL_PLUSH_SHA256);
  assert.equal(sha256(MUSE_PLUSH_HALO_JPG), OFFICIAL_PLUSH_SHA256);
});

test("HUD portraits are the official plush, never Grok", () => {
  for (const id of MUSE_IDS) {
    assert.equal(isMusePlushSrc(CAST[id].portrait), true);
    assert.doesNotMatch(CAST[id].portrait, /grok/i);
  }
  assert.equal(CAST.builder.portrait, MUSE_PLUSH_HALO_JPG);
});

test("Grok stays a pill-eye orb, not the Muse plush", () => {
  assert.equal(isMusePlushSrc(GROK_PORTRAIT), false);
  assert.match(GROK_PORTRAIT, /grok/i);
});
