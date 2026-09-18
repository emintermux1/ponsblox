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
  assert.ok(budget.cityCount > 0);
  assert.equal(budget.frameloop, "always");
});

test("lost WebGL falls back to watch even on desktop", () => {
  const budget = budgetFromSignals(signals({ width: 1440 }), { webglLost: true });
  assert.equal(budget.mode, "watch");
  assert.equal(budget.frameloop, "never");
  assert.equal(budget.cityCount, 0);
});
