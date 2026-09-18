import { SOL_DECIMALS } from "@/lib/constants";
import { heliusTokenHolding, heliusWalletBalances } from "@/lib/providers/helius";
import { getAccountPortfolio, getAccountTransactions } from "@/lib/providers/solscan";
import { getWalletAnalytics } from "@/lib/providers/birdeye";
import { getWalletSnapshot, walletHolding } from "@/lib/wallet";
import type { WalletSnapshot } from "@/lib/types";

export { getWalletSnapshot, walletHolding };

export async function getWalletView(address: string, fresh = false, mint?: string | null) {
  return getWalletSnapshot(address, fresh, mint);
}

export async function enrichWalletUsd(wallet: WalletSnapshot): Promise<WalletSnapshot> {
  if (wallet.totalUsd != null && wallet.solUsd != null) return wallet;
  const portfolio = await getAccountPortfolio(wallet.address);
  if (portfolio.ok) {
    const prices = new Map(portfolio.data.tokens.map((token) => [token.mint, token]));
    const tokens = wallet.tokens.map((token) => {
      const extra = prices.get(token.mint);
      return {
        ...token,
        usd: token.usd ?? extra?.usd ?? null,
        symbol: token.symbol ?? extra?.symbol ?? null,
        name: token.name ?? extra?.name ?? null,
        imageUrl: token.imageUrl ?? extra?.imageUrl ?? null,
      };
    });
    const tokenUsd = tokens.reduce((sum, token) => sum + (token.usd ?? 0), 0);
    const solUsd = portfolio.data.tokens.length
      ? (portfolio.data.totalUsd != null
          ? Math.max(0, portfolio.data.totalUsd - tokenUsd)
          : null)
      : null;
    return {
      ...wallet,
      tokens,
      solUsd: wallet.solUsd ?? (solUsd != null && wallet.sol > 0 ? solUsd / wallet.sol : null),
      totalUsd: wallet.totalUsd ?? portfolio.data.totalUsd,
    };
  }
  const analytics = await getWalletAnalytics(wallet.address);
  if (analytics.ok && wallet.totalUsd == null) {
    return { ...wallet, totalUsd: analytics.data.totalUsd };
  }
  return wallet;
}

export async function getWalletFallbackBalances(address: string) {
  const helius = await heliusWalletBalances(address).catch(() => null);
  if (helius) return helius;
  const portfolio = await getAccountPortfolio(address);
  if (!portfolio.ok) return null;
  return {
    address,
    solLamports: portfolio.data.solLamports ?? 0,
    tokens: portfolio.data.tokens.map((token) => ({
      mint: token.mint,
      symbol: token.symbol,
      name: token.name,
      amount: token.amount,
      rawAmount: token.rawAmount,
      decimals: token.decimals,
      imageUrl: token.imageUrl,
      usd: token.usd,
    })),
  };
}

export async function getWalletHolding(address: string, mint: string) {
  return heliusTokenHolding(address, mint);
}

export async function getWalletTransactions(address: string) {
  const txs = await getAccountTransactions(address);
  return txs.ok ? txs.data : [];
}

export function solFromLamports(lamports: number) {
  return lamports / 10 ** SOL_DECIMALS;
}
