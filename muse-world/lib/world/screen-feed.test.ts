import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SIM_LITERARY_STUBS } from "@/lib/adapters/parse";
import { emptyGrokWake } from "@/lib/world/pick";
import { quietTape } from "@/lib/world/tape";
import type { GrokWakeState, WorldEvent } from "@/types/world";
import {
  feedCardY,
  feedCards,
  feedScrollOffset,
  grokChatView,
  lastRealGrokCaption,
  simSocialMark,
  storyRings,
} from "./screen-feed.ts";

describe("SIM social feed", () => {
  it("captions the phone as room tape / SIM social, not Instagram official", () => {
    const mark = simSocialMark();
    assert.equal(mark, "SIM social");
    assert.doesNotMatch(mark, /instagram|snapchat|official/i);
    for (const ring of storyRings()) {
      assert.doesNotMatch(ring.handle, /instagram|snapchat|@/i);
    }
  });

  it("moves the feed y-offset every tick", () => {
    const a = feedScrollOffset(1_000);
    const b = feedScrollOffset(1_016);
    const c = feedScrollOffset(8_000);
    assert.notEqual(a, b);
    assert.notEqual(b, c);
    assert.ok(feedCardY(0, a, 4) !== feedCardY(0, b, 4));
  });

  it("uses public tape rows or literary stubs — never fills or $PAID", () => {
    const quiet = feedCards(quietTape());
    assert.ok(quiet.length > 0);
    for (const card of quiet) {
      assert.ok((SIM_LITERARY_STUBS as readonly string[]).includes(card.title));
      assert.doesNotMatch(card.title, /\$PAID|\bPAID\b|txid|opened a position/i);
      assert.doesNotMatch(card.body, /instagram|dm|direct message/i);
    }
    const live = feedCards({
      ...quietTape(),
      source: "gecko",
      rows: [
        { ticker: "WIF", changePct: 2.1, priceUsd: 1.2, source: "gecko" },
        { ticker: "JUP", changePct: -0.4, priceUsd: 0.8, source: "gecko" },
      ],
    });
    assert.equal(live[0]?.title, "WIF");
    assert.doesNotMatch(live.map((card) => card.title).join(" "), /PAID/);
  });
});

describe("Grok chat honesty", () => {
  it("shows a REAL caption only from bot/xai, never invented novels or fills", () => {
    const wake: GrokWakeState = {
      ...emptyGrokWake(),
      phase: "done",
      museId: "trader",
      source: "xai",
      honesty: "REAL",
      summary: "thin book, PASS",
    };
    assert.equal(lastRealGrokCaption([], wake), "thin book, PASS");
    const view = grokChatView([], wake, 1);
    assert.equal(view.honesty, "REAL");
    assert.equal(view.bubbles[0]?.mark, "REAL");
    assert.equal(view.bubbles[0]?.text, "thin book, PASS");
    assert.doesNotMatch(view.bubbles[0]?.text ?? "", /because|therefore|opened a position/i);
  });

  it("falls back to SIM literary stubs when there is no real grok/xai caption", () => {
    const events: WorldEvent[] = [
      {
        id: "ack",
        kind: "GROK_REQUESTED",
        museId: "trader",
        text: "Grok Bot woken — waiting on ingest",
        at: 10,
        source: "sim",
      },
      {
        id: "cot",
        kind: "GROK_RESPONSE",
        museId: "trader",
        text: "because the book is thin therefore we wait",
        at: 11,
        source: "xai",
      },
      {
        id: "fill",
        kind: "GROK_RESPONSE",
        museId: "trader",
        text: "opened a position on WIF",
        at: 12,
        source: "bot",
      },
    ];
    const view = grokChatView(events, emptyGrokWake(), 20);
    assert.equal(view.honesty, "SIM");
    assert.equal(lastRealGrokCaption(events, emptyGrokWake()), null);
    for (const bubble of view.bubbles) {
      assert.equal(bubble.mark, "SIM");
      assert.ok((SIM_LITERARY_STUBS as readonly string[]).includes(bubble.text));
      assert.doesNotMatch(bubble.text, /Bot|novel|opened a position|txid/i);
    }
  });
});
