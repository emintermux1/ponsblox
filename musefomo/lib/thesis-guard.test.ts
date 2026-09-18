import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isFreshThesis, isPreferredThesis, pickHomeTheses } from "./thesis-guard";
import type { FomoScanThesis } from "./types";

function thesis(partial: Partial<FomoScanThesis> & Pick<FomoScanThesis, "id" | "thesis">): FomoScanThesis {
  return {
    id: partial.id,
    tokenAddress: null,
    tokenNetwork: null,
    tokenSymbol: null,
    authorId: partial.authorHandle ?? "kaiser",
    authorHandle: partial.authorHandle ?? "kaiser",
    authorName: partial.authorHandle ?? "kaiser",
    authorIsDev: null,
    thesis: partial.thesis,
    likeCount: null,
    holdingsUsd: null,
    authorTradeUsd: null,
    pnl: null,
    realizedPnlUsd: null,
    unrealizedPnlUsd: null,
    percentageRealizedPnl: null,
    percentageUnrealizedPnl: null,
    tokenAmount: null,
    closedAt: null,
    fomoCreatedAt: partial.fomoCreatedAt ?? Date.now(),
    updatedAt: null,
  };
}

describe("home thesis age", () => {
  it("drops 238-day stamps and prefers the last 48 hours", () => {
    const now = Date.now();
    const ancient = thesis({
      id: "ancient",
      thesis: "fade this pump from last winter",
      fomoCreatedAt: now - 238 * 86_400_000,
    });
    const threeDays = thesis({
      id: "three",
      thesis: "fade this pump three days ago",
      fomoCreatedAt: now - 3 * 86_400_000,
    });
    const today = thesis({
      id: "today",
      thesis: "fade this pump right now",
      fomoCreatedAt: now - 8 * 60 * 60 * 1000,
    });
    assert.equal(isFreshThesis(ancient, now), false);
    assert.equal(isFreshThesis(threeDays, now), true);
    assert.equal(isPreferredThesis(threeDays, now), false);
    assert.equal(isPreferredThesis(today, now), true);
    const picked = pickHomeTheses([ancient, threeDays, today], now);
    assert.deepEqual(
      picked.map((row) => row.id),
      ["today"],
    );
  });

  it("stays empty when only stale cards remain", () => {
    const now = Date.now();
    const picked = pickHomeTheses(
      [
        thesis({
          id: "old",
          thesis: "fade this pump from last month",
          fomoCreatedAt: now - 30 * 86_400_000,
        }),
      ],
      now,
    );
    assert.equal(picked.length, 0);
  });
});
