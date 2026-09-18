import { SOL_DECIMALS } from "@/lib/constants";
import { assertNever } from "@/lib/never";
import type { LeaderboardWindow } from "@/lib/types";

/**
 * Window + unit helpers for discovery boards.
 * Muse ranks use continuing-VWAP realized PnL from `lib/ledger.ts`
 * (proceeds − costOfSold on confirmed fills; quotes never count).
 * `cashflowUsd` is only the FomoScan-style sell-minus-buy check, not the Muse board.
 */
export function windowSince(window: LeaderboardWindow): Date | null {
  const now = Date.now();
  switch (window) {
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case "all":
      return null;
    default:
      return assertNever(window, "leaderboard window");
  }
}

export function parseLamports(value: string | null | undefined): bigint {
  if (!value) return 0n;
  try {
    const whole = value.split(".")[0] ?? "0";
    if (!/^-?\d+$/.test(whole)) return 0n;
    return BigInt(whole);
  } catch {
    return 0n;
  }
}

export function lamportsToUsd(lamports: bigint, solUsd: number | null): number | null {
  if (solUsd == null || !Number.isFinite(solUsd)) return null;
  return (Number(lamports) / 10 ** SOL_DECIMALS) * solUsd;
}

export function cashflowUsd(
  sellLamports: bigint,
  buyLamports: bigint,
  solUsd: number | null,
): { pnl: number | null; volume: number | null } {
  return {
    pnl: lamportsToUsd(sellLamports - buyLamports, solUsd),
    volume: lamportsToUsd(sellLamports + buyLamports, solUsd),
  };
}
