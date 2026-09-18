import assert from "node:assert/strict";
import { test } from "node:test";
import { activityLine, asCaption, isAwake } from "./copy";

test("asCaption keeps a short literary line", () => {
  assert.equal(asCaption("the tape is leaning"), "the tape is leaning");
});

test("asCaption hides chain-of-thought shaped text", () => {
  assert.equal(asCaption("let me think through the order book first"), null);
  assert.equal(asCaption("because the funding flipped, therefore we wait"), null);
  assert.equal(
    asCaption("a long research dump that never belongs over a living body in the loft"),
    null,
  );
});

test("asCaption can keep the first short clause of a long line", () => {
  assert.equal(
    asCaption(
      "still at the window. everything else can wait while the rest of this line runs long.",
    ),
    "still at the window",
  );
});

test("literary activities stay awake except rest", () => {
  assert.equal(activityLine("TRADING"), "at the tape");
  assert.equal(activityLine("CHILLING"), "on the sofa");
  assert.equal(isAwake("TRADING"), true);
  assert.equal(isAwake("CHILLING"), false);
  assert.equal(isAwake("IDLE"), false);
});
