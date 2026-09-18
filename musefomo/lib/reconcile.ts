import { listConfirmedMissingExecution, listPendingTrades } from "@/lib/db";
import { logInfo, logWarn } from "@/lib/log";
import { getTradeOrRefresh, refreshTrade } from "@/lib/trades";
import type { Trade } from "@/lib/types";

export async function reconcilePendingTrades(): Promise<{
  pending: number;
  repaired: number;
  confirmed: number;
  failed: number;
}> {
  const pending = await listPendingTrades(40);
  let confirmed = 0;
  let failed = 0;
  for (const trade of pending) {
    const next = await refreshTrade(trade);
    if (next.status === "confirmed") confirmed += 1;
    if (next.status === "failed" || next.status === "expired") failed += 1;
  }
  const missing = await listConfirmedMissingExecution(20);
  for (const trade of missing) {
    await refreshTrade(trade);
  }
  logInfo("reconcile.tick", {
    pending: pending.length,
    repaired: missing.length,
    confirmed,
    failed,
  });
  if (failed) logWarn("reconcile.failures", { failed });
  return { pending: pending.length, repaired: missing.length, confirmed, failed };
}

export async function waitForTradeStatus(id: string, timeoutMs = 12_000): Promise<Trade | null> {
  const deadline = Date.now() + Math.min(Math.max(timeoutMs, 500), 20_000);
  let trade = await getTradeOrRefresh(id);
  while (trade && Date.now() < deadline) {
    if (trade.status === "confirmed" || trade.status === "failed" || trade.status === "expired") {
      return trade;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
    trade = await getTradeOrRefresh(id);
  }
  return trade;
}
