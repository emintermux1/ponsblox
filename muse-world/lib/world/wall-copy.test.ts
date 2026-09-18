import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { seedWorld } from "./defaults";
import { WALL_SLOT_COUNT } from "./layout";
import {
  clipWallLine,
  isPaidTicker,
  isTickerSlopHeadline,
  livingWallLines,
  packetCardText,
  packetNoteForBeat,
  pulseNameForWall,
  rememberPulseName,
  resetPulseNameForTests,
  sanitizePacket,
  sanitizeWallPinLabel,
  sanitizeWallPins,
  wallCardText,
  wallCopyFromWorld,
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

describe("living idea wall copy", () => {
  it("keeps 6–10 cards and never prints PAID, tickers, or fills", () => {
    resetPulseNameForTests();
    rememberPulseName("$PAID");
    const world = seedWorld();
    world.muses.builder.thought = "card it";
    world.grokWake.honesty = "SIM";
    world.grokWake.summary = "no Grok key — SIM context only";
    const lines = wallCopyFromWorld(world, 1_000, WALL_SLOT_COUNT);
    assert.ok(lines.length >= 6 && lines.length <= 10);
    assert.equal(lines.length, WALL_SLOT_COUNT);
    for (const line of lines) {
      assert.ok(line.length > 0, "empty paper is a fail");
      assert.doesNotMatch(line, /\$/);
      assert.doesNotMatch(line, /\$PAID|\bPAID\b/i);
      assert.doesNotMatch(line, /\bfills?\b/i);
      assert.equal(isTickerSlopHeadline(line), false);
      assert.ok(line.split(/\s+/).length <= 4);
    }
    assert.ok(lines.some((line) => /builder/i.test(line) || /SIM/i.test(line) || /tape/i.test(line)));
  });

  it("uses a market pulse NAME and rejects ticker slop", () => {
    assert.equal(pulseNameForWall("PAID"), null);
    assert.equal(pulseNameForWall("$WIF"), null);
    assert.equal(pulseNameForWall("WIF"), null);
    assert.equal(pulseNameForWall("dogwifhat"), "dogwifhat");
    const lines = livingWallLines({
      pins: [],
      muses: [],
      grokHonesty: null,
      grokSummary: null,
      pulseName: "dogwifhat",
      now: 0,
      count: WALL_SLOT_COUNT,
    });
    assert.ok(lines.some((line) => /dogwifhat/i.test(line)));
    for (const line of lines) {
      assert.doesNotMatch(line, /\$/);
      assert.doesNotMatch(line, /\bPAID\b/i);
      assert.equal(isTickerSlopHeadline(line), false);
    }
  });

  it("updates a fresh thesis card and rotates stale copy", () => {
    const now = 50_000;
    const pinned = livingWallLines({
      pins: [{ id: "thesis", label: "same structure", slot: 2, at: now }],
      muses: seedWorld().muses.builder
        ? [seedWorld().muses.builder, seedWorld().muses.scroller]
        : [],
      grokHonesty: "REAL",
      grokSummary: "thin book",
      pulseName: null,
      now,
      count: WALL_SLOT_COUNT,
    });
    assert.equal(pinned[2], "same structure");

    const later = livingWallLines({
      pins: [{ id: "thesis", label: "same structure", slot: 2, at: now }],
      muses: [seedWorld().muses.builder, seedWorld().muses.chill],
      grokHonesty: "REAL",
      grokSummary: "thin book",
      pulseName: "Jupiter",
      now: now + 20_000,
      count: WALL_SLOT_COUNT,
    });
    assert.notEqual(later.join("|"), pinned.join("|"));
    assert.ok(later[2]);
    assert.equal(isTickerSlopHeadline(later[2] ?? ""), false);
  });

  it("clips one-liners to paper length", () => {
    assert.equal(clipWallLine("the tape leaned"), "the tape leaned");
    assert.ok(clipWallLine("why is everyone posting this").split(/\s+/).length <= 4);
    assert.doesNotMatch(clipWallLine("buy $PAID fills now please"), /\$|\bfills?\b/i);
  });
});
