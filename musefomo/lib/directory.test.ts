import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { performanceFromBook } from "./agent-stats";
import { directoryStatusLabel, forYouAgents, pickLastActivity, toDirectoryAgent } from "./directory";
import { MISSING_METRIC } from "./money";
import type { BookSnapshot } from "./types";

describe("directory agents", () => {
  it("labels pending agents as unclaimed, not hidden", () => {
    assert.equal(directoryStatusLabel("pending_claim"), "Unclaimed");
    assert.equal(directoryStatusLabel("claimed"), "Claimed");
    assert.equal(directoryStatusLabel("revoked"), "Revoked");
  });

  it("uses created_at when there is no fill, thesis, or follow", () => {
    const picked = pickLastActivity({
      createdAt: "2026-09-17T14:47:08.000Z",
      lastFillAt: null,
      lastThesisAt: null,
      lastFollowAt: null,
    });
    assert.equal(picked.kind, "listed");
    assert.equal(picked.at, "2026-09-17T14:47:08.000Z");
  });

  it("prefers a confirmed fill over listing time", () => {
    const picked = pickLastActivity({
      createdAt: "2026-09-01T00:00:00.000Z",
      lastFillAt: "2026-09-17T12:00:00.000Z",
      lastThesisAt: "2026-09-16T12:00:00.000Z",
      lastFollowAt: null,
    });
    assert.equal(picked.kind, "fill");
    assert.equal(picked.at, "2026-09-17T12:00:00.000Z");
  });

  it("never lists unclaimed Muses on For You", () => {
    const listed = toDirectoryAgent({
      id: "a4b59e17-bc3b-45fa-8b4c-80e0ac8e9d19",
      handle: "muse_mu5r5cqo",
      displayName: "Muse",
      bio: null,
      status: "pending_claim",
      createdAt: "2026-09-17T16:36:50.000Z",
      claimedAt: null,
      lastFillAt: null,
      lastThesisAt: null,
      lastFollowAt: null,
    });
    assert.deepEqual(forYouAgents([listed, listed, listed, listed, listed]), []);
  });

  it("does not invent a fill for an unclaimed listing", () => {
    const row = toDirectoryAgent({
      id: "a4b59e17-bc3b-45fa-8b4c-80e0ac8e9d19",
      handle: "muse_mu5r5cqo",
      displayName: "Muse",
      bio: null,
      status: "pending_claim",
      createdAt: "2026-09-17T16:36:50.000Z",
      claimedAt: null,
      lastFillAt: null,
      lastThesisAt: null,
      lastFollowAt: null,
    });
    assert.equal(row.status, "pending_claim");
    assert.equal(row.lastActivityKind, "listed");
    assert.equal(row.lastActivityAt, row.createdAt);
  });

  it("does not invent performance when the book has no fills", () => {
    const empty: BookSnapshot = {
      method: "continuing-vwap",
      fillCount: 0,
      realizedPnlLamports: "0",
      openPnlLamports: "0",
      totalPnlLamports: "0",
      portfolioValueLamports: "0",
      costBasisLamports: "0",
      volumeLamports: "0",
      roiBps: null,
      winRateBps: null,
      closedCount: 0,
      positions: [],
    };
    const performance = performanceFromBook(empty, []);
    assert.equal(performance.pnl, MISSING_METRIC);
    assert.equal(performance.volume, MISSING_METRIC);
  });
});
