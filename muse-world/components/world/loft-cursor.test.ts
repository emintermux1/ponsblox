import assert from "node:assert/strict";
import { test } from "node:test";
import { isOrbitDrag, ORBIT_DRAG_PX } from "./loft-cursor";

test("tiny pointer travel is a pick, not an orbit", () => {
  assert.equal(isOrbitDrag({ x: 10, y: 10 }, { x: 12, y: 11 }), false);
});

test("drag past the orbit threshold does not pick", () => {
  assert.equal(isOrbitDrag({ x: 0, y: 0 }, { x: ORBIT_DRAG_PX + 1, y: 0 }), true);
});
