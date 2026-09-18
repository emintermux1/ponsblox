import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clipPathFromCorners,
  dexOverlayOpen,
  overlayRectFromCorners,
  placeDexOverlay,
  readableOverlay,
  watchDexRect,
} from "./dex-overlay";

describe("Dex overlay pin", () => {
  it("builds an axis-aligned box from the LCD corners", () => {
    const rect = overlayRectFromCorners([
      { x: 100, y: 80, z: 0.4 },
      { x: 220, y: 90, z: 0.4 },
      { x: 210, y: 160, z: 0.42 },
      { x: 90, y: 150, z: 0.42 },
    ]);
    assert.equal(rect.left, 90);
    assert.equal(rect.top, 80);
    assert.equal(rect.width, 130);
    assert.equal(rect.height, 80);
  });

  it("clips to the monitor quad without a CSS transform", () => {
    const corners = [
      { x: 10, y: 20, z: 0.3 },
      { x: 40, y: 20, z: 0.3 },
      { x: 40, y: 50, z: 0.3 },
      { x: 10, y: 50, z: 0.3 },
    ];
    const rect = overlayRectFromCorners(corners);
    assert.equal(clipPathFromCorners(corners, rect), "polygon(0px 0px, 30px 0px, 30px 30px, 0px 30px)");
  });

  it("stays closed when the LCD faces away or sits behind the camera", () => {
    const rect = { left: 200, top: 120, width: 80, height: 50 };
    assert.equal(
      dexOverlayOpen({ rect, facing: -0.2, ndcZ: [0.4, 0.4, 0.4, 0.4], viewW: 800, viewH: 600 }),
      false,
    );
    assert.equal(
      dexOverlayOpen({ rect, facing: 0.9, ndcZ: [-0.1, 0.4, 0.4, 0.4], viewW: 800, viewH: 600 }),
      false,
    );
    assert.equal(
      dexOverlayOpen({
        rect: { left: 200, top: 120, width: 10, height: 10 },
        facing: 0.9,
        ndcZ: [0.4, 0.4, 0.4, 0.4],
        viewW: 800,
        viewH: 600,
      }),
      false,
    );
  });

  it("magnifies a far tape LCD onto that monitor, not a corner HUD", () => {
    const far = { left: 420, top: 260, width: 90, height: 52 };
    const placed = placeDexOverlay({
      rect: far,
      facing: 0.7,
      ndcZ: [0.5, 0.5, 0.5, 0.5],
      viewW: 1280,
      viewH: 800,
    });
    assert.ok(placed);
    assert.equal(placed?.exact, false);
    assert.equal(placed?.rect.width, 300);
    assert.equal(placed?.rect.height, 174);
    assert.ok(Math.abs((placed?.rect.left ?? 0) + 150 - 465) < 0.01);
    assert.ok(Math.abs((placed?.rect.top ?? 0) + 87 - 286) < 0.01);
    const close = placeDexOverlay({
      rect: { left: 200, top: 140, width: 420, height: 240 },
      facing: 0.9,
      ndcZ: [0.3, 0.3, 0.3, 0.3],
      viewW: 1280,
      viewH: 800,
    });
    assert.equal(close?.exact, true);
    assert.equal(close?.rect.width, 420);
  });

  it("keeps a readable box from a distant rect", () => {
    const next = readableOverlay({ left: 10, top: 10, width: 40, height: 20 }, 80, 40);
    assert.deepEqual(next, { left: -10, top: 0, width: 80, height: 40 });
  });

  it("pins watch Dex with left/top only after the room frame", () => {
    const rect = watchDexRect({ left: 50, top: 50 }, { x: 0, y: 0, scale: 1 }, 1000, 800);
    assert.equal(rect.left, 350);
    assert.equal(rect.top, 313);
    assert.equal(rect.width, 300);
    assert.equal(rect.height, 174);
    const desk = watchDexRect({ left: 70, top: 40 }, { x: -18, y: 6, scale: 1.36 }, 1000, 800);
    assert.ok(desk.left !== 700 - 150);
    assert.ok(desk.width === 300);
  });
});
