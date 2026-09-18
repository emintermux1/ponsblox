import assert from "node:assert/strict";
import { test } from "node:test";
import {
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
    devicePixelRatio: 2,
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
  assert.ok(budget.cityCount <= 4);
  assert.equal(budget.frameloop, "always");
});

test("desktop caps DPR at 1.5 and keeps the loft lean", () => {
  const budget = budgetFromSignals(signals({ width: 1440, devicePixelRatio: 3 }));
  assert.equal(budget.tier, "desktop");
  assert.equal(budget.mode, "webgl");
  assert.deepEqual(budget.dpr, [1, 1.5]);
  assert.equal(budget.extraLights, false);
  assert.equal(budget.shadows, false);
  assert.equal(budget.contactShadows, false);
  assert.equal(budget.cityCount, 16);
  assert.equal(budget.glass, "standard");
});

test("mobile DPR is min(2, device pixel ratio)", () => {
  const retina = budgetFromSignals(signals({ width: 390, height: 844, devicePixelRatio: 3 }));
  const oneX = budgetFromSignals(signals({ width: 390, height: 844, devicePixelRatio: 1 }));
  assert.deepEqual(retina.dpr, [1, 2]);
  assert.deepEqual(oneX.dpr, [1, 1]);
});

test("hidden tabs pause extras and stop the frame loop", () => {
  const budget = budgetFromSignals(signals({ hidden: true }));
  assert.equal(budget.hidden, true);
  assert.equal(budget.pauseExtras, true);
  assert.equal(budget.frameloop, "never");
});

test("lost WebGL falls back to watch even on desktop", () => {
  const budget = budgetFromSignals(signals({ width: 1440 }), { webglLost: true });
  assert.equal(budget.mode, "watch");
  assert.equal(budget.frameloop, "never");
  assert.equal(budget.cityCount, 0);
});
