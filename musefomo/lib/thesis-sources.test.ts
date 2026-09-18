import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { handleHref, profileHref } from "./feed-event";
import { isFakeThesisEvent, isRealTraderThesis, looksLikeBlogLearnCardText } from "./thesis-guard";
import { dedupeTheses, thesesFromUnknown } from "./thesis-sources";
import type { FeedEvent, FomoScanThesis } from "./types";

describe("thesis cache payloads", () => {
  it("keeps a real thesis page and drops authorless rows", () => {
    const rows = thesesFromUnknown({
      items: [
        { id: "t1", authorHandle: "kaiser", authorName: "kaiser", thesis: "long SOL" },
        { id: "t2", thesis: "no author" },
      ],
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, "t1");
    assert.equal(rows[0]?.thesis, "long SOL");
  });

  it("unwraps nested data and arrays without inventing people", () => {
    const rows = thesesFromUnknown({
      data: {
        items: [{ id: "x", authorId: "u1", authorHandle: "alpha", thesis: "fade this" }],
      },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.authorHandle, "alpha");
    assert.equal(thesesFromUnknown({ items: [] }).length, 0);
    assert.equal(thesesFromUnknown(null).length, 0);
  });

  it("dedupes by id", () => {
    const rows = dedupeTheses([
      {
        id: "t1",
        tokenAddress: null,
        tokenNetwork: null,
        tokenSymbol: null,
        authorId: "a",
        authorHandle: "a",
        authorName: "A",
        authorIsDev: null,
        thesis: "fade this pump",
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
        fomoCreatedAt: 1,
        updatedAt: null,
      },
      {
        id: "t1",
        tokenAddress: null,
        tokenNetwork: null,
        tokenSymbol: null,
        authorId: "a",
        authorHandle: "a",
        authorName: "A",
        authorIsDev: null,
        thesis: "dup this later",
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
        fomoCreatedAt: 2,
        updatedAt: null,
      },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.thesis, "fade this pump");
  });
});

function thesis(partial: Pick<FomoScanThesis, "id" | "authorHandle" | "thesis">): FomoScanThesis {
  return {
    id: partial.id,
    tokenAddress: null,
    tokenNetwork: null,
    tokenSymbol: null,
    authorId: partial.authorHandle,
    authorHandle: partial.authorHandle,
    authorName: partial.authorHandle,
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
    fomoCreatedAt: 1,
    updatedAt: null,
  };
}

describe("blog/learn cards are not theses", () => {
  it("drops family:learn ids, concatenated slugs, and Learn-how blurbs", () => {
    assert.equal(isRealTraderThesis(thesis({ id: "family:learn:logjam-meme", authorHandle: "Logjam", thesis: "Crypto trader Logjam breaks down his epic Penguin trade." })), false);
    assert.equal(isRealTraderThesis(thesis({ id: "t1", authorHandle: "chengang_nft", thesis: "cryptodtradingmistakes onchainmarketpsychology" })), false);
    assert.equal(looksLikeBlogLearnCardText("Learn how crypto trader Printgod started with $1,000"), true);
    assert.equal(isRealTraderThesis(thesis({ id: "t9", authorHandle: "kaiser", thesis: "fade this pump" })), true);
    assert.equal(
      isFakeThesisEvent({
        id: "fomoscan:family:learn:printgod-crypto-trading-guide-new-traders",
        action: "thesis",
        source: "fomoscan",
        at: 1,
        confirmed: true,
        actor: { id: "p", handle: "Printgod", name: "Printgod", avatarUrl: null, kind: "human" },
        token: null,
        amountUsd: null,
        amountLabel: null,
        entryLabel: null,
        pnlUsd: null,
        pnlPct: null,
        pnlKind: null,
        thesis: "Learn how crypto trader Printgod started with $1,000",
        signature: null,
        txUrl: null,
        target: null,
      } satisfies FeedEvent),
      true,
    );
  });
});

describe("author profile links", () => {
  it("sends humans to /profile and agents to /agent", () => {
    assert.equal(
      profileHref({ id: "u1", handle: "kaiser", name: "kaiser", avatarUrl: null, kind: "human" }),
      "/profile/kaiser",
    );
    assert.equal(
      profileHref({ id: "agent-1", handle: "muse_one", name: "Muse", avatarUrl: null, kind: "agent" }),
      "/agent/agent-1",
    );
    assert.equal(
      handleHref({ id: "u1", handle: "kaiser", name: "kaiser", avatarUrl: null, kind: "human" }),
      "/profile/kaiser",
    );
  });
});
