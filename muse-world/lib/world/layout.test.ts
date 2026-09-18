import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MUSE_IDS } from "@/types/world";
import { SEAT, roamStation, stationFor } from "./layout";

describe("loft roam", () => {
  it("sends a walk to a far station, not the home seat", () => {
    for (const id of MUSE_IDS) {
      const home = SEAT[id];
      const roam = roamStation(id);
      const walk = stationFor(id, "WALKING");
      assert.equal(walk, roam);
      assert.notEqual(walk.position[0], home.position[0]);
      assert.notEqual(walk.position[2], home.position[2]);
    }
  });

  it("puts Thalia at the window when she smokes or watches", () => {
    assert.deepEqual(stationFor("chill", "SMOKING").position, stationFor("chill", "WATCHING").position);
    assert.notDeepEqual(stationFor("chill", "SMOKING").position, SEAT.chill.position);
  });
});
