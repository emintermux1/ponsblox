import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bookFromTheses,
  findBoardTrader,
  mergeFomoUsers,
  parseEquitySeries,
  parseFamilyUser,
  statsFromBoardEntry,
  thesesForAuthor,
  userFromBoardEntry,
} from "./human-map";
import { actorProfileHref, humanProfileHref, museProfileHref } from "./profile-href";
import type { FomoScanBoardEntry, FomoScanThesis, FomoScanUser } from "./types";

const entry: FomoScanBoardEntry = {
  rank: 1,
  id: "humanbeingET",
  handle: "humanbeingET",
  label: "HUMAN",
  avatarUrl: "https://img.example/a.png",
  pnl: 12.5,
  volume: 400,
  followers: 8,
  numTrades: 3,
  memberCount: null,
  marketCap: null,
  price: null,
  liquidity: null,
};

describe("human map", () => {
  it("builds a cache user from a board row without inventing books", () => {
    const user = userFromBoardEntry(entry);
    assert.equal(user?.handle, "humanbeingET");
    assert.equal(user?.name, "HUMAN");
    assert.equal(user?.bio, null);
    assert.equal(statsFromBoardEntry(entry, "24h").pnl, 12.5);
    assert.equal(statsFromBoardEntry(entry, "24h").winRate, null);
  });

  it("keeps richer cache fields when merging a thinner board row", () => {
    const prev: FomoScanUser = {
      id: "humanbeingET",
      handle: "humanbeingET",
      name: "HUMAN",
      bio: "wrestler",
      banner: "https://img.example/b.png",
      profilePicture: "https://img.example/a.png",
      twitter: null,
      solanaAddress: null,
      evmAddress: null,
      followers: 8,
    };
    const merged = mergeFomoUsers(prev, userFromBoardEntry(entry)!);
    assert.equal(merged.bio, "wrestler");
    assert.equal(merged.banner, "https://img.example/b.png");
  });

  it("omits positions and swaps unless thesis fields exist", () => {
    const empty = bookFromTheses([
      {
        id: "t1",
        tokenAddress: "mint",
        tokenNetwork: null,
        tokenSymbol: "FOO",
        authorId: "u",
        authorHandle: "humanbeingET",
        authorName: "HUMAN",
        authorIsDev: null,
        thesis: "note",
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
      } satisfies FomoScanThesis,
    ]);
    assert.equal(empty.positions.length, 0);
    assert.equal(empty.swaps.length, 0);
    const held = bookFromTheses([
      {
        id: "t2",
        tokenAddress: "mint",
        tokenNetwork: null,
        tokenSymbol: "FOO",
        authorId: "u",
        authorHandle: "humanbeingET",
        authorName: "HUMAN",
        authorIsDev: null,
        thesis: "note",
        likeCount: null,
        holdingsUsd: 40,
        authorTradeUsd: 10,
        pnl: 2,
        realizedPnlUsd: null,
        unrealizedPnlUsd: 2,
        percentageRealizedPnl: null,
        percentageUnrealizedPnl: null,
        tokenAmount: 1,
        closedAt: null,
        fomoCreatedAt: 2,
        updatedAt: null,
      } satisfies FomoScanThesis,
    ]);
    assert.equal(held.positions.length, 1);
    assert.equal(held.swaps.length, 1);
  });

  it("needs two real equity points", () => {
    assert.equal(parseEquitySeries([{ t: 1, v: 2 }]), null);
    assert.equal(parseEquitySeries([{ foo: 1 }]), null);
    const series = parseEquitySeries([
      { timestamp: 1, equity: 10 },
      { timestamp: 2, equity: 12 },
    ]);
    assert.equal(series?.length, 2);
    assert.equal(series?.[1]?.v, 12);
  });

  it("finds a ranked trader across windows without inventing a row", () => {
    const hit = findBoardTrader({ "24h": { entries: [entry] } }, "@humanbeingET");
    assert.equal(hit?.entry.handle, "humanbeingET");
    assert.equal(hit?.window, "24h");
    assert.equal(findBoardTrader({ "24h": { entries: [entry] } }, "missing"), null);
    assert.equal(
      thesesForAuthor(
        [
          {
            id: "t1",
            tokenAddress: null,
            tokenNetwork: null,
            tokenSymbol: null,
            authorId: "humanbeingET",
            authorHandle: "humanbeingET",
            authorName: "HUMAN",
            authorIsDev: null,
            thesis: "note",
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
            fomoCreatedAt: null,
            updatedAt: null,
          },
        ],
        { id: "humanbeingET", handle: "humanbeingET" },
      ).length,
      1,
    );
  });

  it("maps a family JSON user only when the handle matches", () => {
    const user = parseFamilyUser(
      { userHandle: "humanbeingET", displayName: "HUMAN", description: "bio", followers: 9 },
      "humanbeingET",
    );
    assert.equal(user?.name, "HUMAN");
    assert.equal(user?.bio, "bio");
    assert.equal(user?.followers, 9);
  });
});

describe("profile hrefs", () => {
  it("routes Muse agents to /agent and humans to /profile", () => {
    assert.equal(museProfileHref("abc"), "/agent/abc");
    assert.equal(humanProfileHref("@humanbeingET"), "/profile/humanbeingET");
    assert.equal(
      actorProfileHref({ kind: "human", handle: "humanbeingET", id: "x" }),
      "/profile/humanbeingET",
    );
    assert.equal(actorProfileHref({ kind: "agent", handle: "muse", id: "id-1" }), "/agent/id-1");
  });
});
