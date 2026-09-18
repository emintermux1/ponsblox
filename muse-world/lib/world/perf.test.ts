import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FIRST_PAINT_BUDGET,
  PERF_BUDGET,
  budgetFromSignals,
  shouldWatch,
  type PerfSignals,
} from "./perf";

function signals(partial: Partial<PerfSignals>): PerfSignals {
  return {
    width: 1280,
    height: 800,
    hidden: false,
    reducedMotion: false,
    webgl: true,
    coarse: false,
    saveData: false,
    pixelRatio: 2,
    ...partial,
  };
}

test("shouldWatch is only for missing or lost WebGL", () => {
  assert.equal(shouldWatch(signals({ width: 390, height: 844, coarse: true }), false), false);
  assert.equal(shouldWatch(signals({ width: 430, height: 932, coarse: true }), false), false);
  assert.equal(shouldWatch(signals({ width: 800, coarse: true }), false), false);
  assert.equal(shouldWatch(signals({ saveData: true, coarse: true }), false), false);
  assert.equal(shouldWatch(signals({ webgl: false }), false), true);
  assert.equal(shouldWatch(signals({ width: 390, webgl: true }), true), true);
});

test("phone with WebGL still mounts a lean 3D loft", () => {
  const budget = budgetFromSignals(signals({ width: 390, height: 844, coarse: true }));
  assert.equal(budget.tier, "phone");
  assert.equal(budget.mode, "webgl");
  assert.equal(budget.extraLights, false);
  assert.equal(budget.shadows, false);
  assert.equal(budget.contactShadows, false);
  assert.ok(budget.cityCount > 0);
  assert.ok(budget.cityCount <= PERF_BUDGET.cityDesktop);
  assert.equal(budget.frameloop, "always");
});

test("phone canvas dpr is at least min(2, devicePixelRatio)", () => {
  const retina = budgetFromSignals(
    signals({ width: 390, height: 844, coarse: true, pixelRatio: 3 }),
  );
  assert.equal(retina.dpr[0], 2);
  assert.equal(retina.dpr[1], 2);
  const two = budgetFromSignals(
    signals({ width: 390, height: 844, coarse: true, pixelRatio: 2 }),
  );
  assert.equal(two.dpr[1], 2);
  const one = budgetFromSignals(
    signals({ width: 390, height: 844, coarse: true, pixelRatio: 1 }),
  );
  assert.equal(one.dpr[1], 1);
});

test("first paint assumes the 3D loft, not WATCH", () => {
  assert.equal(FIRST_PAINT_BUDGET.mode, "webgl");
  assert.notEqual(FIRST_PAINT_BUDGET.mode, "watch");
});

test("hidden loft uses demand frameloop", () => {
  const budget = budgetFromSignals(signals({ hidden: true }));
  assert.equal(budget.mode, "webgl");
  assert.equal(budget.frameloop, "demand");
});

test("desktop city and lights stay under the hitch cap", () => {
  const budget = budgetFromSignals(signals({ width: 1440 }));
  assert.ok(budget.cityCount <= 18);
  assert.equal(budget.extraLights, false);
  assert.equal(budget.contactShadows, false);
  assert.equal(budget.shadowMapSize, 512);
  assert.equal(budget.glass, "standard");
});

test("lost WebGL falls back to watch even on desktop", () => {
  const budget = budgetFromSignals(signals({ width: 1440 }), { webglLost: true });
  assert.equal(budget.mode, "watch");
  assert.equal(budget.frameloop, "never");
  assert.equal(budget.cityCount, 0);
});
