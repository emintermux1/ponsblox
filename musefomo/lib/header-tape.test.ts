import assert from "node:assert/strict";
import { test } from "node:test";

import { BONK_MINT, JUP_MINT, SOL_MINT } from "./constants";
import { isTapeMajor, weaveHeaderTape, type HeaderTapeItem } from "./header-tape";

function item(kind: HeaderTapeItem["kind"], id: string): HeaderTapeItem {
  return {
    kind,
    id,
    href: "/",
    symbol: id,
    mint: null,
    logo: null,
    handle: null,
    name: null,
    priceUsd: null,
    change24h: null,
    usd: kind === "print" ? 12 : null,
    side: kind === "print" ? "buy" : null,
    snippet: kind === "thesis" ? "long this" : null,
  };
}

test("header tape drops NEAR-style majors and keeps memes", () => {
  assert.equal(isTapeMajor({ symbol: "NEAR" }), true);
  assert.equal(isTapeMajor({ symbol: "SOL" }), true);
  assert.equal(isTapeMajor({ mint: SOL_MINT, symbol: "POPCAT" }), true);
  assert.equal(isTapeMajor({ mint: JUP_MINT }), true);
  assert.equal(isTapeMajor({ symbol: "POPCAT" }), false);
  assert.equal(isTapeMajor({ symbol: "MOODENG" }), false);
  assert.equal(isTapeMajor({ mint: BONK_MINT, symbol: "BONK" }), false);
});

test("header tape weaves memes, prints, then theses", () => {
  const woven = weaveHeaderTape(
    [item("meme", "POPCAT"), item("meme", "CHILLGUY")],
    [item("print", "buy-1")],
    [item("thesis", "kaiser")],
  );
  assert.deepEqual(
    woven.map((row) => row.id),
    ["POPCAT", "buy-1", "kaiser", "CHILLGUY"],
  );
});
