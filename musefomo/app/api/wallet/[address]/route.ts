import { loadWalletBook } from "@/lib/book";
import { listAllConfirmedTradesForWallet, listConfirmedTradesForWallet } from "@/lib/db";
import { looksLikeMint } from "@/lib/format";
import { jsonError, jsonOk } from "@/lib/http";
import type { WalletFill } from "@/lib/types";
import { getWalletView, walletHolding } from "@/lib/services/wallet-data";

export async function GET(request: Request, context: { params: Promise<{ address: string }> }) {
  const { address } = await context.params;
  if (!looksLikeMint(address)) return jsonError(400, "invalid_address", "Not a Solana address.");
  const url = new URL(request.url);
  const fresh = url.searchParams.get("fresh") === "1";
  const mint = url.searchParams.get("mint");
  const scopedMint = mint && looksLikeMint(mint) ? mint : null;
  try {
    const wallet = await getWalletView(address, fresh, scopedMint);
    const [trades, allFills] = await Promise.all([
      listConfirmedTradesForWallet(address, scopedMint ?? undefined).catch(() => []),
      listAllConfirmedTradesForWallet(address).catch(() => []),
    ]);
    const fills: WalletFill[] = trades
      .filter((trade) => Boolean(trade.signature && trade.confirmedAt))
      .map((trade) => ({
        id: trade.id,
        side: trade.side,
        mint: trade.side === "buy" ? trade.outputMint : trade.inputMint,
        signature: trade.signature,
        confirmedAt: trade.confirmedAt,
        actualInAmount: trade.actualInAmount,
        actualOutAmount: trade.actualOutAmount,
      }));
    const book = await loadWalletBook(address, allFills).catch(() => null);
    return jsonOk({
      wallet,
      holding: scopedMint ? walletHolding(wallet, scopedMint) : null,
      fills,
      book,
      rpc: "helius-mainnet",
    });
  } catch (error) {
    return jsonError(502, "helius_wallet", error instanceof Error ? error.message : "Helius wallet read failed.");
  }
}
