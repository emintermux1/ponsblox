import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isPaidTicker,
  isTickerSlopHeadline,
  packetCardText,
  packetNoteForBeat,
  sanitizePacket,
  sanitizeWallPinLabel,
  sanitizeWallPins,
  wallCardText,
  wallNoteForSlot,
} from "./wall-copy";

describe("PAID and ticker slop never become chrome", () => {
  it("treats PAID / $PAID / paid as a skipped ticker", () => {
    assert.equal(isPaidTicker("PAID"), true);
    assert.equal(isPaidTicker("$PAID"), true);
    assert.equal(isPaidTicker("paid"), true);
    assert.equal(isPaidTicker(" $paid "), true);
    assert.equal(isPaidTicker("WIF"), false);
    assert.equal(isPaidTicker(null), false);
  });

  it("rejects all-caps 2–5 letter slop as a wall headline", () => {
    assert.equal(isTickerSlopHeadline("PAID"), true);
    assert.equal(isTickerSlopHeadline("$PAID"), true);
    assert.equal(isTickerSlopHeadline("WIF"), true);
    assert.equal(isTickerSlopHeadline("JUP"), true);
    assert.equal(isTickerSlopHeadline("BONK"), true);
    assert.equal(isTickerSlopHeadline("PENGU"), true);
    assert.equal(isTickerSlopHeadline("the tape leaned"), false);
    assert.equal(isTickerSlopHeadline("later"), false);
  });

  it("renders wall cards as literary notes or empty paper — never $PAID", () => {
    assert.equal(wallCardText("$PAID"), null);
    assert.equal(wallCardText("PAID"), null);
    assert.equal(wallCardText("paid"), null);
    assert.equal(wallCardText("WIF"), null);
    assert.equal(wallCardText("JUP"), null);
    assert.equal(wallCardText("the tape leaned"), "the tape leaned");
    assert.equal(wallCardText(""), null);
  });

  it("rewrites a slop pin to a literary note for its slot", () => {
    assert.equal(sanitizeWallPinLabel("PAID", 0), wallNoteForSlot(0));
    assert.equal(sanitizeWallPinLabel("$PAID", 4), wallNoteForSlot(4));
    assert.equal(isTickerSlopHeadline(sanitizeWallPinLabel("PENGU", 2)), false);
    assert.doesNotMatch(sanitizeWallPinLabel("PAID", 1), /paid/i);
    assert.doesNotMatch(sanitizeWallPinLabel("PAID", 1), /\$/);
  });

  it("scrubs existing wall pins that already say PAID", () => {
    const pins = sanitizeWallPins([
      { id: "a", label: "$PAID", slot: 0, at: 1 },
      { id: "b", label: "PAID", slot: 1, at: 2 },
      { id: "c", label: "the tape leaned", slot: 2, at: 3 },
    ]);
    for (const pin of pins) {
      assert.equal(isPaidTicker(pin.label), false);
      assert.equal(isTickerSlopHeadline(pin.label), false);
      assert.doesNotMatch(pin.label, /\$PAID|PAID/i);
    }
    assert.equal(pins[2]?.label, "the tape leaned");
  });

  it("never puts a gecko ticker on a packet label", () => {
    assert.equal(packetCardText("$PAID"), null);
    assert.equal(packetCardText("PAID"), null);
    assert.equal(packetNoteForBeat("discovery"), "look");
    assert.equal(packetNoteForBeat("thesis", 0), wallNoteForSlot(0));
    const packet = sanitizePacket({
      from: "builder",
      to: "wall",
      label: "PAID",
      t: 1,
      kind: "PIN",
      slot: 0,
    });
    assert.ok(packet);
    assert.notEqual(packet.label, "PAID");
    assert.doesNotMatch(packet.label, /\$/);
    assert.equal(isTickerSlopHeadline(packet.label), false);
  });
});
