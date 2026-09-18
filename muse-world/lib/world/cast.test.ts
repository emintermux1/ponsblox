import assert from "node:assert/strict";
import { test } from "node:test";
import { MUSE_IDS } from "@/types/world";
import { seedMuses } from "./defaults";
import {
  CAST,
  GROK_NAME,
  GROK_ROLE,
  castName,
  grokPresence,
  grokPresenceLabel,
  isNumberedMuseName,
  packetLine,
} from "./cast";

test("the loft uses living names, not Muse 02", () => {
  const muses = seedMuses();
  assert.equal(CAST.scroller.name, "Euterpe");
  assert.equal(CAST.trader.name, "Urania");
  assert.equal(CAST.chill.name, "Thalia");
  assert.equal(CAST.builder.name, "Calliope");
  assert.equal(GROK_NAME, "GROK");
  assert.equal(GROK_ROLE, "tool");
  assert.equal(muses.scroller.name, "Euterpe");
  assert.equal(muses.trader.name, "Urania");
  assert.equal(muses.chill.name, "Thalia");
  assert.equal(muses.builder.name, "Calliope");
  assert.equal(castName("trader"), "Urania");
  assert.notEqual(muses.trader.name, "MUSE 02");
  assert.notEqual(muses.scroller.name, "MUSE 01");
  for (const id of MUSE_IDS) {
    assert.equal(isNumberedMuseName(muses[id].name), false);
    assert.equal(muses[id].role, CAST[id].role);
  }
});

test("Grok presence is SIM until a real ingest exists", () => {
  assert.equal(grokPresence([]), "SIM");
  assert.equal(grokPresenceLabel("SIM"), "SIM");
  assert.equal(
    grokPresence([
      {
        id: "sim1",
        kind: "GROK_RESPONSE",
        museId: "trader",
        text: "sim context",
        at: 1,
        source: "sim",
      },
    ]),
    "SIM",
  );
  assert.equal(
    grokPresence([
      {
        id: "live1",
        kind: "GROK_RESPONSE",
        museId: "trader",
        text: "thin book, PASS",
        at: 2,
        source: "xai",
      },
    ]),
    "LIVE",
  );
  assert.equal(grokPresenceLabel("LIVE"), "GROK LIVE");
});

test("packets name who is passing what", () => {
  assert.equal(packetLine("scroller", "trader", "look"), "Euterpe → Urania · look");
  assert.equal(packetLine("builder", "wall", "note"), "Calliope → wall · note");
});
