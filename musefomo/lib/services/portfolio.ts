import { buildBook, loadWalletBook } from "@/lib/book";
import { listConfirmedTradesForAgent, listPositions } from "@/lib/db";
import type { Trade } from "@/lib/types";

export async function getAgentPortfolio(agentId: string) {
  const [stored, trades] = await Promise.all([
    listPositions(agentId),
    listConfirmedTradesForAgent(agentId),
  ]);
  const book = await buildBook(trades, agentId);
  return { book, positions: book.positions, stored, trades };
}

export async function getWalletBook(address: string, trades: Trade[]) {
  return loadWalletBook(address, trades);
}
