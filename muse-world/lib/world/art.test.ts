import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { MUSE_ART, MUSE_ART_IDS, museArtSrc } from "./art";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../../public");

describe("official Muse and Grok loft stills", () => {
  it("maps every art id to a /muse/*.jpg plate", () => {
    for (const id of MUSE_ART_IDS) {
      const src = museArtSrc(id);
      assert.equal(src, MUSE_ART[id]);
      assert.match(src, /^\/muse\/[a-z]+\.jpg$/);
      assert.doesNotMatch(src, /paid/i);
      const disk = join(publicDir, src);
      assert.equal(existsSync(disk), true, `missing ${src}`);
      const bytes = readFileSync(disk);
      assert.ok(bytes.byteLength > 20_000, `${src} too small to be a still`);
      assert.equal(bytes[0], 0xff);
      assert.equal(bytes[1], 0xd8);
    }
  });
});
