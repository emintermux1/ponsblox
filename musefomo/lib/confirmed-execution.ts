import { SOL_DECIMALS, SOL_MINT } from "@/lib/constants";
import type { TradeSide } from "@/lib/types";

/** Integer-only fill handed to the PnL sibling. No floats, no cost basis. */
export type ConfirmedExecution = {
  signature: string;
  tradeId: string;
  agentId: string;
  walletAddress: string;
  mint: string;
  side: TradeSide;
  tokenAmountRaw: string;
  tokenDecimals: number;
  quoteAmountRaw: string;
  quoteDecimals: number;
  quoteMint: string;
  slot: number | null;
  ts: string;
};

export function tokenMintForTrade(side: TradeSide, inputMint: string, outputMint: string): string {
  return side === "buy" ? outputMint : inputMint;
}

export function executionFromFill(input: {
  tradeId: string;
  agentId: string;
  walletAddress: string;
  side: TradeSide;
  mint: string;
  signature: string;
  tokenAmountRaw: string;
  tokenDecimals: number;
  quoteAmountRaw: string;
  quoteDecimals?: number;
  quoteMint?: string;
  slot: number | null;
  ts: string;
}): ConfirmedExecution {
  return {
    signature: input.signature,
    tradeId: input.tradeId,
    agentId: input.agentId,
    walletAddress: input.walletAddress,
    mint: input.mint,
    side: input.side,
    tokenAmountRaw: input.tokenAmountRaw,
    tokenDecimals: input.tokenDecimals,
    quoteAmountRaw: input.quoteAmountRaw,
    quoteDecimals: input.quoteDecimals ?? SOL_DECIMALS,
    quoteMint: input.quoteMint ?? SOL_MINT,
    slot: input.slot,
    ts: input.ts,
  };
}
