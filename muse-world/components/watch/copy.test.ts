import assert from "node:assert/strict";
import { test } from "node:test";
import { CAST } from "@/lib/world/cast";
import {
  activityLine,
  asCaption,
  ENTER_MIND,
  ENTRY_CAPTION,
  INTRO_COPY,
  isAwake,
  LEAVE_MIND,
  PAGE_DESCRIPTION,
  SITE_ORIGIN,
  watchingLine,
  WORDMARK,
  WORLD_MARK,
} from "./copy";

test("first paint brand is Muse Grok at musegrok.world", () => {
  assert.equal(WORDMARK, "Muse Grok");
  assert.equal(WORLD_MARK, "musegrok.world");
  assert.equal(SITE_ORIGIN, "https://musegrok.world");
  assert.match(PAGE_DESCRIPTION, /PIP|Four muses/);
  assert.match(PAGE_DESCRIPTION, /GROK|muses/);
  assert.doesNotMatch(PAGE_DESCRIPTION, /ENTER MIND/);
  assert.equal(INTRO_COPY[0], WORDMARK);
  assert.notEqual(INTRO_COPY[0], "ENTER MIND");
});

test("asCaption keeps a short literary line", () => {
  assert.equal(asCaption("the tape is leaning"), "the tape is leaning");
});

test("asCaption and watchingLine never surface PAID or ticker slop", () => {
  assert.equal(asCaption("PAID"), null);
  assert.equal(asCaption("$PAID"), null);
  assert.equal(asCaption("WIF"), null);
  assert.equal(watchingLine("PAID", "PAID"), "looking, without an outside name");
  assert.equal(watchingLine("$PAID", null), "looking, without an outside name");
  assert.doesNotMatch(watchingLine("PAID", "PAID") ?? "", /PAID/);
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

test("first entry copy is not ENTER MIND", () => {
  assert.notEqual(ENTRY_CAPTION, ENTER_MIND);
});

test("mind is a quiet later word, never brass ENTER MIND", () => {
  assert.notEqual(ENTER_MIND.toUpperCase(), "ENTER MIND");
  assert.notEqual(LEAVE_MIND.toUpperCase(), "LEAVE MIND");
});

test("cast first names stay on the HUD copy side", () => {
  assert.equal(CAST.scroller.name, "Scroller");
  assert.equal(CAST.trader.name, "Trader");
  assert.equal(CAST.chill.name, "Chill");
  assert.equal(CAST.builder.name, "Builder");
});

test("literary activities stay awake except rest", () => {
  assert.equal(activityLine("TRADING"), "at the tape");
  assert.equal(activityLine("CHILLING"), "on the sofa");
  assert.equal(isAwake("TRADING"), true);
  assert.equal(isAwake("CHILLING"), false);
  assert.equal(isAwake("IDLE"), false);
});
