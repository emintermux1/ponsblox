import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cinemaDt,
  dampShot,
  fitShotToViewport,
  flattenShot,
  HOME_SHOT,
  introEaseDuration,
  introShotsFor,
  INTRO_EASE_S,
  INTRO_SHOTS,
  isNarrowViewport,
  LOOK_CAM,
  lookLimits,
  MOBILE_INTRO_SHOTS,
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

test("narrow portrait phones get a real look-in intro", () => {
  assert.equal(isNarrowViewport(390, 844), true);
  assert.equal(isNarrowViewport(430, 932), true);
  assert.equal(isNarrowViewport(1280, 800), false);
  assert.equal(introShotsFor(390, 844), MOBILE_INTRO_SHOTS);
  assert.ok(introShotsFor(390, 844).length >= 2);
});

test("fitShotToViewport widens portrait ROOM so muses stay in frame", () => {
  const room = shotForPreset("ROOM", null, null);
  const phone = fitShotToViewport(room, 390, 844);
  const plus = fitShotToViewport(room, 430, 932);
  assert.ok(phone.fov > room.fov);
  assert.ok(phone.position[2] > room.position[2]);
  assert.ok(plus.fov > room.fov);
  assert.deepEqual(fitShotToViewport(room, 1280, 800), room);
});

test("tap-to-look presets still resolve at narrow width", () => {
  const lounge = fitShotToViewport(shotForPreset("LOUNGE", "chill", [-1.8, 0.62, 3.4]), 390, 844);
  const trader = fitShotToViewport(shotForPreset("TRADER", "trader", [3.35, 0.62, -0.15]), 390, 844);
  assert.ok(lounge.target[0] < 0);
  assert.ok(trader.target[0] > 0);
  assert.ok(lookLimits(true).minDistance > 4);
  assert.ok(lookLimits(true).maxPolarAngle < Math.PI * 0.7);
});
