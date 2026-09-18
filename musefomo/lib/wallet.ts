import { cacheDelete, cacheWrap } from "@/lib/cache";
import { SOL_DECIMALS } from "@/lib/constants";
import { looksLikeMint } from "@/lib/format";
import { forgetHeliusWallet, heliusTokenHolding, heliusWalletBalances } from "@/lib/helius";
import { getDexTokenImages } from "@/lib/market";
import { pickImageUrl } from "@/lib/pfp";
import type { WalletSnapshot, WalletToken } from "@/lib/types";

export function forgetWalletSnapshot(address: string) {
  forgetHeliusWallet(address);
  cacheDelete(`wallet-snap:${address}`);
}

export async function getWalletSnapshot(
  address: string,
  fresh = false,
  mint?: string | null,
): Promise<WalletSnapshot> {
  if (!looksLikeMint(address)) {
    throw new Error("invalid_address");
  }
  if (fresh) forgetWalletSnapshot(address);
  return cacheWrap(`wallet-snap:${address}`, 12_000, async () => {
    const raw = await heliusWalletBalances(address);
    const tokens = [...raw.tokens];
    if (mint && looksLikeMint(mint) && !tokens.some((token) => token.mint === mint)) {
      const holding = await heliusTokenHolding(address, mint).catch(() => null);
      if (holding) tokens.push(holding);
    }
    const images = await getDexTokenImages(tokens.map((token) => token.mint));
    const decorated: WalletToken[] = tokens.map((token) => ({
      mint: token.mint,
      symbol: token.symbol,
      name: token.name,
      amount: token.amount,
      rawAmount: token.rawAmount,
      decimals: token.decimals,
      usd: null,
      imageUrl: pickImageUrl(token.imageUrl, images.get(token.mint) ?? null),
    }));
    return {
      address,
      source: "helius",
      solLamports: raw.solLamports,
      sol: raw.solLamports / 10 ** SOL_DECIMALS,
      solUsd: null,
      tokens: decorated,
      totalUsd: null,
    };
  });
}

export function walletHolding(wallet: WalletSnapshot, mint: string): WalletToken | null {
  return wallet.tokens.find((token) => token.mint === mint && token.rawAmount !== "0") ?? null;
}
