import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SIM_GROK_SUMMARY } from "../adapters/source";
import { seedWorld } from "./defaults";
import {
  grokAttendId,
  grokCompanyLine,
  grokSupportCaption,
  grokWakePacket,
} from "./grok-watch";
import { applyGrokFocus, applyGrokWake } from "./pick";

describe("grok watch honesty", () => {
  it("attends the wake subject, then the selected muse", () => {
    const waking = applyGrokFocus(seedWorld(), "builder");
    assert.equal(grokAttendId(waking), "builder");
    assert.equal(grokCompanyLine(waking), null);
    const picked = { ...seedWorld(), selected: "chill" as const };
    assert.equal(grokAttendId(picked), "chill");
  });

  it("says Grok is with a muse only after a REAL wake", () => {
    const sim = applyGrokWake(seedWorld(), null, "trader", 10);
    assert.equal(grokCompanyLine(sim), null);
    assert.equal(grokSupportCaption(sim), SIM_GROK_SUMMARY);
    assert.equal(sim.packet?.from, "trader");
    assert.equal(sim.packet?.to, "grok");

    const real = applyGrokWake(
      seedWorld(),
      {
        woken: false,
        pendingIngest: false,
        reply: { source: "xai", summary: "thin book, PASS" },
      },
      "trader",
      11,
    );
    assert.equal(grokCompanyLine(real), "Grok is with Trader");
    assert.equal(grokSupportCaption(real), "thin book, PASS");
    assert.equal(real.packet?.from, "grok");
    assert.equal(real.packet?.to, "trader");
  });

  it("never fills a CoT dump into the support caption", () => {
    const next = applyGrokWake(
      seedWorld(),
      {
        reply: {
          source: "xai",
          summary: "let me think through the order book first",
        },
      },
      "trader",
      12,
    );
    assert.equal(next.grokWake.honesty, "REAL");
    assert.equal(grokSupportCaption(next), SIM_GROK_SUMMARY);
    assert.equal(grokWakePacket("trader", "SIM", 1).label, "ask");
  });
});
