import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyFill,
  averageHoldMs,
  confirmedFillsFromTrades,
  emptyPosition,
  markValueLamports,
  openPnlLamports,
  rankLeaderboard,
  rankMostTraded,
  replayFills,
  winRateBps,
  type ConfirmedFill,
} from "./ledger";
import { parseDecimal, PRICE_SCALE } from "./money";
import type { Trade } from "./types";

function fill(partial: Omit<ConfirmedFill, "agentId"> & { agentId?: string }): ConfirmedFill {
  return { agentId: "a1", ...partial };
}

function replayOne(fills: ConfirmedFill[]) {
  const snap = replayFills(fills);
  return snap.agents.get(fills[0]?.agentId ?? "a1") ?? null;
}

describe("confirmed-fill ledger", () => {
  it("1) one buy", () => {
    const agent = replayOne([
      fill({ id: "b1", mint: "tok", side: "buy", tokenQty: 1_000_000n, solLamports: 1_000_000_000n, atMs: 1 }),
    ]);
    assert.ok(agent);
    const pos = agent.mints.get("tok");
    assert.equal(pos?.qty, 1_000_000n);
    assert.equal(pos?.costLamports, 1_000_000_000n);
    assert.equal(pos?.realizedLamports, 0n);
    assert.equal(winRateBps(agent.closed), null);
  });

  it("2) multiple buys use continuing VWAP", () => {
    const agent = replayOne([
      fill({ id: "b1", mint: "tok", side: "buy", tokenQty: 100n, solLamports: 200n, atMs: 1 }),
      fill({ id: "b2", mint: "tok", side: "buy", tokenQty: 300n, solLamports: 300n, atMs: 2 }),
    ]);
    const pos = agent?.mints.get("tok");
    assert.equal(pos?.qty, 400n);
    assert.equal(pos?.costLamports, 500n);
  });

  it("3) partial sell realizes the sold slice and keeps remaining basis", () => {
    const agent = replayOne([
      fill({ id: "b1", mint: "tok", side: "buy", tokenQty: 100n, solLamports: 1000n, atMs: 1 }),
      fill({ id: "s1", mint: "tok", side: "sell", tokenQty: 40n, solLamports: 500n, atMs: 2 }),
    ]);
    const pos = agent?.mints.get("tok");
    assert.equal(pos?.qty, 60n);
    assert.equal(pos?.costLamports, 600n);
    assert.equal(pos?.realizedLamports, 100n);
    assert.equal(agent?.closed.length, 0);
    assert.equal(winRateBps(agent?.closed ?? []), null);
  });

  it("4) full sell realizes remaining cost and closes the book", () => {
    const agent = replayOne([
      fill({ id: "b1", mint: "tok", side: "buy", tokenQty: 100n, solLamports: 1000n, atMs: 1 }),
      fill({ id: "s1", mint: "tok", side: "sell", tokenQty: 100n, solLamports: 1300n, atMs: 2 }),
    ]);
    const pos = agent?.mints.get("tok");
    assert.equal(pos?.qty, 0n);
    assert.equal(pos?.costLamports, 0n);
    assert.equal(pos?.realizedLamports, 300n);
    assert.equal(agent?.closed.length, 1);
  });

  it("5) buy after partial sell continues weighted average", () => {
    const agent = replayOne([
      fill({ id: "b1", mint: "tok", side: "buy", tokenQty: 100n, solLamports: 1000n, atMs: 1 }),
      fill({ id: "s1", mint: "tok", side: "sell", tokenQty: 40n, solLamports: 500n, atMs: 2 }),
      fill({ id: "b2", mint: "tok", side: "buy", tokenQty: 40n, solLamports: 200n, atMs: 3 }),
    ]);
    const pos = agent?.mints.get("tok");
    assert.equal(pos?.qty, 100n);
    assert.equal(pos?.costLamports, 800n);
    assert.equal(pos?.realizedLamports, 100n);
  });

  it("6) winning completed trade", () => {
    const agent = replayOne([
      fill({ id: "b1", mint: "tok", side: "buy", tokenQty: 10n, solLamports: 100n, atMs: 1 }),
      fill({ id: "s1", mint: "tok", side: "sell", tokenQty: 10n, solLamports: 250n, atMs: 2 }),
    ]);
    assert.equal(agent?.realizedLamports, 150n);
    assert.equal(winRateBps(agent?.closed ?? []), 10_000n);
  });

  it("7) losing completed trade", () => {
    const agent = replayOne([
      fill({ id: "b1", mint: "tok", side: "buy", tokenQty: 10n, solLamports: 100n, atMs: 1 }),
      fill({ id: "s1", mint: "tok", side: "sell", tokenQty: 10n, solLamports: 40n, atMs: 2 }),
    ]);
    assert.equal(agent?.realizedLamports, -60n);
    assert.equal(winRateBps(agent?.closed ?? []), 0n);
  });

  it("8) unusual decimals 0/4/6/9 mark conversion", () => {
    const qty = 10_000n;
    const cost = 1_000_000_000n;
    const markUsd = "2";
    const solUsd = "200";
    for (const decimals of [0, 4, 6, 9]) {
      const marked = markValueLamports({ qty, decimals, markUsd, solUsd });
      const open = openPnlLamports({ qty, costLamports: cost, decimals, markUsd, solUsd });
      const expectedMark = 100_000_000_000n / 10n ** BigInt(decimals);
      assert.equal(marked, expectedMark, `decimals ${decimals}`);
      assert.equal(open, expectedMark - cost, `open decimals ${decimals}`);
    }
    assert.equal(
      openPnlLamports({ qty, costLamports: cost, decimals: null, markUsd, solUsd }),
      null,
    );
    assert.equal(
      openPnlLamports({ qty, costLamports: cost, decimals: 6, markUsd: null, solUsd }),
      null,
    );
  });

  it("pending trades never enter cost basis", () => {
    const pending = {
      id: "p1",
      idempotencyKey: null,
      agentId: "a1",
      humanPrivyUserId: null,
      walletAddress: "w",
      side: "buy",
      inputMint: "sol",
      outputMint: "tok",
      requestedAmount: "1000",
      actualInAmount: "1000",
      actualOutAmount: "50",
      quoteOutAmount: "50",
      price: null,
      slippageBps: null,
      feeLamports: null,
      thesisId: null,
      dflowQuote: null,
      signature: null,
      status: "submitted",
      failReason: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      submittedAt: "2026-01-01T00:00:00.000Z",
      confirmedAt: null,
    } as Trade;
    assert.deepEqual(confirmedFillsFromTrades([pending]), []);
  });

  it("windowed leaderboard uses pre-window cost basis", () => {
    const now = 1_000_000_000_000;
    const fills = [
      fill({ id: "b1", mint: "tok", side: "buy", tokenQty: 10n, solLamports: 100n, atMs: now - 10 * 86_400_000 }),
      fill({ id: "s1", mint: "tok", side: "sell", tokenQty: 10n, solLamports: 180n, atMs: now - 60_000 }),
    ];
    const snap = replayFills(fills);
    const day = rankLeaderboard(snap, "24h", now);
    const week = rankLeaderboard(snap, "7d", now);
    const all = rankLeaderboard(snap, "all", now);
    assert.equal(day[0]?.realizedPnlLamports, 80n);
    assert.equal(week[0]?.realizedPnlLamports, 80n);
    assert.equal(all[0]?.realizedPnlLamports, 80n);
    const traded24h = rankMostTraded(fills, "24h", now);
    assert.equal(traded24h[0]?.volumeLamports, 180n);
  });

  it("applyFill does not create shorts", () => {
    const sold = applyFill(emptyPosition(), "sell", 10n, 50n);
    assert.equal(sold.position.qty, 0n);
    assert.equal(sold.realizedLamports, 0n);
  });

  it("averageHoldMs is only complete exits", () => {
    assert.equal(averageHoldMs([]), null);
    assert.equal(
      averageHoldMs([
        fill({ id: "b1", mint: "tok", side: "buy", tokenQty: 10n, solLamports: 100n, atMs: 0 }),
      ]),
      null,
    );
    assert.equal(
      averageHoldMs([
        fill({ id: "b1", mint: "tok", side: "buy", tokenQty: 10n, solLamports: 100n, atMs: 0 }),
        fill({ id: "s1", mint: "tok", side: "sell", tokenQty: 4n, solLamports: 40n, atMs: 3_600_000 }),
      ]),
      null,
    );
    assert.equal(
      averageHoldMs([
        fill({ id: "b1", mint: "tok", side: "buy", tokenQty: 10n, solLamports: 100n, atMs: 0 }),
        fill({ id: "s1", mint: "tok", side: "sell", tokenQty: 10n, solLamports: 90n, atMs: 3_600_000 }),
      ]),
      3_600_000,
    );
  });

  it("parseDecimal never uses float", () => {
    assert.equal(parseDecimal("150.23", PRICE_SCALE), 150_230_000_000_000n);
    assert.equal(parseDecimal("0.000000000001", PRICE_SCALE), 1n);
  });
});
