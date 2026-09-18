import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { seedWorld } from "./defaults";
import { WALL_SLOT_COUNT } from "./layout";
import {
  STATE_WALL_LINES,
  WALL_LINE_CHAR_MAX,
  WALL_NOTES,
  clipWallLine,
  isPaidTicker,
  isReadableWallSentence,
  isSmashedWallLine,
  isTickerSlopHeadline,
  livingWallLines,
  packetCardText,
  packetNoteForBeat,
  pulseNameForWall,
  pulseSentence,
  rememberPulseName,
  resetPulseNameForTests,
  sanitizePacket,
  sanitizeWallPinLabel,
  sanitizeWallPins,
  wallCardText,
  wallCopyFromWorld,
  wallNoteForSlot,
  wrapWallInk,
} from "./wall-copy";

function assertReadableCard(line: string): void {
  assert.ok(line.length > 0, "empty paper is a fail");
  assert.ok(line.length <= WALL_LINE_CHAR_MAX, `${line} is longer than ${WALL_LINE_CHAR_MAX}`);
  assert.match(line, /\s/, `${line} smashed spaces`);
  assert.doesNotMatch(line, /\$/);
  assert.doesNotMatch(line, /\$PAID|\bPAID\b/i);
  assert.doesNotMatch(line, /\bfills?\b/i);
  assert.doesNotMatch(line, /REAL note|SIM hush/);
  assert.equal(isTickerSlopHeadline(line), false);
  assert.equal(isSmashedWallLine(line), false);
  assert.equal(isReadableWallSentence(line), true);
  assert.ok(line.split(/\s+/).length >= 3);
  assert.doesNotMatch(
    line.replace(/\s+/g, ""),
    /thesisforming|samestructure|threadthis|scrollerwaitit|catecoinleaned|laterer/i,
  );
}

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
    assert.equal(wallCardText("Catecoinleaned"), null);
    assert.equal(wallCardText("samestructure"), null);
    assert.equal(wallCardText("Scrollerwaitit"), null);
  });

  it("rewrites a slop pin to a literary note for its slot", () => {
    assert.equal(sanitizeWallPinLabel("PAID", 0), wallNoteForSlot(0));
    assert.equal(sanitizeWallPinLabel("$PAID", 4), wallNoteForSlot(4));
    assert.equal(isTickerSlopHeadline(sanitizeWallPinLabel("PENGU", 2)), false);
    assert.doesNotMatch(sanitizeWallPinLabel("PAID", 1), /paid/i);
    assert.doesNotMatch(sanitizeWallPinLabel("PAID", 1), /\$/);
    assertReadableCard(sanitizeWallPinLabel("Catecoinleaned", 3));
    assertReadableCard(sanitizeWallPinLabel("thesisforming", 5));
    assertReadableCard(sanitizeWallPinLabel("laterer", 6));
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
      assertReadableCard(pin.label);
    }
    assert.equal(pins[2]?.label, "the tape leaned");
  });

  it("never puts a gecko ticker on a packet label", () => {
    assert.equal(packetCardText("$PAID"), null);
    assert.equal(packetCardText("PAID"), null);
    assert.equal(packetNoteForBeat("discovery"), "look once, then look away");
    assert.equal(packetNoteForBeat("thesis", 0), wallNoteForSlot(0));
    assertReadableCard(packetNoteForBeat("discovery"));
    assertReadableCard(packetNoteForBeat("ask_card"));
    assertReadableCard(packetNoteForBeat("share_builder"));
    assertReadableCard(packetNoteForBeat("wave_chill"));
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
    assertReadableCard(packet.label);
  });
});

describe("living idea wall copy", () => {
  it("keeps a curated deck of 24 literary lines and 8 state-aware lines", () => {
    assert.equal(WALL_NOTES.length, 24);
    assert.equal(STATE_WALL_LINES.length, 8);
    for (const line of [...WALL_NOTES, ...STATE_WALL_LINES]) {
      assertReadableCard(line);
    }
    assert.ok(STATE_WALL_LINES.some((line) => /scroll/i.test(line)));
    assert.ok(STATE_WALL_LINES.some((line) => /trad/i.test(line)));
    assert.ok(STATE_WALL_LINES.some((line) => /Builder/i.test(line)));
    assert.equal(STATE_WALL_LINES[3], "Chill is right. wait.");
  });

  it("keeps 6–10 cards and never prints PAID, tickers, fills, or smashed words", () => {
    resetPulseNameForTests();
    rememberPulseName("$PAID");
    const world = seedWorld();
    world.muses.builder.thought = "let me think because firstly the tape";
    world.grokWake.honesty = "SIM";
    world.grokWake.summary = "no Grok key — SIM context only";
    const lines = wallCopyFromWorld(world, 1_000, WALL_SLOT_COUNT);
    assert.ok(lines.length >= 6 && lines.length <= 10);
    assert.equal(lines.length, WALL_SLOT_COUNT);
    for (const line of lines) {
      assertReadableCard(line);
    }
    assert.ok(lines.some((line) => /Builder|Trader|Scroller|Chill|tape|feed|loft/i.test(line)));
    assert.ok(!lines.some((line) => /REAL note|SIM hush|let me think|because/i.test(line)));
  });

  it("uses a market pulse NAME as a proper noun in a sentence", () => {
    assert.equal(pulseNameForWall("PAID"), null);
    assert.equal(pulseNameForWall("$WIF"), null);
    assert.equal(pulseNameForWall("WIF"), null);
    assert.equal(pulseNameForWall("Catecoinleaned"), null);
    assert.equal(pulseNameForWall("dogwifhat"), "dogwifhat");
    assert.equal(pulseSentence("Catecoin", 0), "Catecoin is all anyone is watching");
    const lines = livingWallLines({
      pins: [],
      muses: [],
      grokHonesty: null,
      grokSummary: null,
      pulseName: "Catecoin",
      now: 0,
      count: WALL_SLOT_COUNT,
    });
    assert.ok(lines.some((line) => /Catecoin/.test(line) && /\s/.test(line)));
    assert.ok(lines.some((line) => /dogwifhat/i.test(line) === false || /Catecoin/.test(line)));
    assert.ok(!lines.some((line) => /Catecoinleaned|Catecoin leaned/i.test(line)));
    const named = livingWallLines({
      pins: [],
      muses: [],
      grokHonesty: null,
      grokSummary: null,
      pulseName: "dogwifhat",
      now: 0,
      count: WALL_SLOT_COUNT,
    });
    assert.ok(named.some((line) => /dogwifhat/i.test(line) && /\s/.test(line)));
    for (const line of [...lines, ...named]) {
      assertReadableCard(line);
      assert.doesNotMatch(line, /\$/);
      assert.doesNotMatch(line, /\bPAID\b/i);
    }
  });

  it("never treats fake Grok as REAL or dumps CoT onto paper", () => {
    const lines = livingWallLines({
      pins: [],
      muses: [],
      grokHonesty: "REAL",
      grokSummary: "no Grok key — let me think because firstly",
      pulseName: null,
      now: 0,
      count: WALL_SLOT_COUNT,
    });
    for (const line of lines) {
      assertReadableCard(line);
      assert.doesNotMatch(line, /\bREAL\b/);
      assert.doesNotMatch(line, /let me think|because|firstly/i);
    }
  });

  it("updates a fresh thesis card and rotates stale copy", () => {
    const now = 50_000;
    const pinnedLine = "the tape feels loud tonight";
    const pinned = livingWallLines({
      pins: [{ id: "thesis", label: pinnedLine, slot: 2, at: now }],
      muses: seedWorld().muses.builder
        ? [seedWorld().muses.builder, seedWorld().muses.scroller]
        : [],
      grokHonesty: "REAL",
      grokSummary: "thin book",
      pulseName: null,
      now,
      count: WALL_SLOT_COUNT,
    });
    assert.equal(pinned[2], pinnedLine);
    assertReadableCard(pinned[2] ?? "");

    const later = livingWallLines({
      pins: [{ id: "thesis", label: pinnedLine, slot: 2, at: now }],
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
    for (const line of later) {
      assertReadableCard(line);
    }
    assert.ok(later.some((line) => /Jupiter/.test(line)));
  });

  it("names who is scrolling, trading, or building", () => {
    const world = seedWorld();
    const lines = livingWallLines({
      pins: [],
      muses: [world.muses.scroller, world.muses.trader, world.muses.builder, world.muses.chill],
      grokHonesty: null,
      grokSummary: null,
      pulseName: null,
      now: 8_000,
      count: WALL_SLOT_COUNT,
    });
    const joined = lines.join(" | ");
    assert.match(joined, /Scroller|Trader|Builder|Chill/);
    assert.ok(!joined.includes("Scrollerwaitit"));
    assert.ok(!joined.includes("Builderder"));
    for (const line of lines) {
      assertReadableCard(line);
    }
  });

  it("clips one-liners to paper length and keeps two short clauses", () => {
    assert.equal(clipWallLine("the tape leaned"), "the tape leaned");
    assert.equal(clipWallLine("Chill is right. wait."), "Chill is right. wait.");
    assert.equal(clipWallLine("the tape feels loud tonight"), "the tape feels loud tonight");
    assert.ok(clipWallLine("why is everyone posting this tonight about nothing").length <= WALL_LINE_CHAR_MAX);
    assert.doesNotMatch(clipWallLine("buy $PAID fills now please"), /\$|\bfills?\b/i);
    assert.match(clipWallLine("don't pin a name we don't know"), /\s/);
  });

  it("wraps pin ink on spaces and never concatenates words", () => {
    const sentence = "Catecoin is all anyone is watching";
    const wrapped = wrapWallInk(sentence);
    assert.ok(wrapped.length >= 2);
    assert.equal(wrapped.join(" "), sentence);
    assert.match(wrapped.join(" "), /\s/);
    for (const line of wrapped) {
      assert.doesNotMatch(line, /Catecoinleaned|samestructure|threadthis/);
      assert.ok(!line.includes("  "));
    }
    assert.deepEqual(wrapWallInk("same structure"), ["same structure"]);
    const measured = wrapWallInk(sentence, (line) => line.length * 10, 180);
    assert.ok(measured.every((line) => line.includes(" ") || line.length < 10));
    assert.equal(measured.join(" "), sentence);
  });
});
