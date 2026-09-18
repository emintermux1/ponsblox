import { looksLikeMint } from "@/lib/adapters/parse";

export const DEX_CHAIN = "solana";

export function dexPairAddress(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const token = value.trim();
  return looksLikeMint(token) ? token : null;
}

export function dexEmbedSrc(input: {
  pairAddress?: string | null;
  mint?: string | null;
}): string | null {
  const token = dexPairAddress(input.pairAddress) ?? dexPairAddress(input.mint);
  if (!token) {
    return null;
  }
  return `https://dexscreener.com/${DEX_CHAIN}/${token}?embed=1&theme=dark&trades=0&info=0`;
}
