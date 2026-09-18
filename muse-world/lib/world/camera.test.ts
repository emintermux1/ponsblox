import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cinemaDt,
  dampShot,
  flattenShot,
  HOME_SHOT,
  introEaseDuration,
  INTRO_EASE_S,
  INTRO_SHOTS,
  LOOK_CAM,
  playIntro,
  readShot,
  shotForPreset,
  shotSettled,
} from "./camera";

test("cinemaDt clamps a tab-resume spike and ignores negatives", () => {
  assert.equal(cinemaDt(2), 1 / 24);
  assert.equal(cinemaDt(1 / 12), 1 / 24);
  assert.equal(cinemaDt(-4), 0);
  assert.equal(cinemaDt(1 / 60), 1 / 60);
});

test("dampShot cannot jump the loft on a huge resumed dt", () => {
  const proxy = flattenShot({
    position: [0, 0, 0],
    target: [0, 0, 0],
    fov: 30,
  });
  dampShot(proxy, { position: [40, 0, 0], target: [0, 0, 0], fov: 30 }, 8);
  assert.ok(proxy.px < 4, `look-cam jumped too far: ${proxy.px}`);
});

test("playIntro eases into the loft then completes", () => {
  const proxy = flattenShot(INTRO_SHOTS[0]);
  let done = false;
  const timeline = playIntro(proxy, () => {
    done = true;
  });
  assert.ok(timeline.totalDuration() <= INTRO_EASE_S + 1);
  timeline.progress(1);
  assert.equal(done, true);
  assert.deepEqual(readShot(proxy).position, HOME_SHOT.position);
  assert.deepEqual(readShot(proxy).target, HOME_SHOT.target);
  assert.equal(shotSettled(readShot(proxy), HOME_SHOT), true);
});

test("intro ease is a short release, not a locked cinematic", () => {
  const duration = introEaseDuration(INTRO_SHOTS[0], HOME_SHOT);
  assert.ok(duration <= INTRO_EASE_S);
  assert.ok(duration < 3);
});

test("ROOM preset is the loft home shot", () => {
  assert.deepEqual(shotForPreset("ROOM", null, null), HOME_SHOT);
});

test("look-cam keeps a usable orbit range", () => {
  assert.ok(LOOK_CAM.minDistance < LOOK_CAM.maxDistance);
  assert.ok(LOOK_CAM.minPolarAngle < LOOK_CAM.maxPolarAngle);
  assert.ok(LOOK_CAM.dampingFactor > 0);
});
