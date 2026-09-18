import {
  BONK_MINT,
  JUP_MINT,
  LIQUID_MINT_ALIASES,
  SOL_MINT,
  TRUMP_MINT,
  USDC_MINT,
  WIF_MINT,
} from "@/lib/constants";
import { looksLikeEvm } from "@/lib/format";
import {
  MUSE_FOMO_CA,
  MUSE_FOMO_LOGO,
  MUSE_FOMO_NAME,
  MUSE_FOMO_PAIR,
  MUSE_FOMO_SYMBOL,
  PINNED_CA_ALIASES,
  pinnedTokenMarket,
} from "@/lib/pinned-tokens";
import { asHttpsLogo, cleanTokenLabel } from "@/lib/token-logo";
import type { DiscoverTokenRow, TokenMarket } from "@/lib/types";

export { LIQUID_MINT_ALIASES };

function preferLabel(value: string | null | undefined, fallback: string | null, mint?: string | null): string | null {
  return cleanTokenLabel(value, mint) ?? fallback;
}

export type KnownMint = {
  mint: string;
  symbol: string;
  name: string;
  imageUrl: string;
  chain?: "solana" | "robinhood";
  pairAddress?: string;
};

/** Official liquid-mint identity + DexScreener CDN logos. Not invented fills. */
export const KNOWN_MINTS: Record<string, KnownMint> = {
  [SOL_MINT]: {
    mint: SOL_MINT,
    symbol: "SOL",
    name: "Solana",
    imageUrl: dexLogo(SOL_MINT),
  },
  [USDC_MINT]: {
    mint: USDC_MINT,
    symbol: "USDC",
    name: "USD Coin",
    imageUrl: dexLogo(USDC_MINT),
  },
  [BONK_MINT]: {
    mint: BONK_MINT,
    symbol: "BONK",
    name: "Bonk",
    imageUrl: dexLogo(BONK_MINT),
  },
  [JUP_MINT]: {
    mint: JUP_MINT,
    symbol: "JUP",
    name: "Jupiter",
    imageUrl: dexLogo(JUP_MINT),
  },
  [WIF_MINT]: {
    mint: WIF_MINT,
    symbol: "WIF",
    name: "dogwifhat",
    imageUrl: dexLogo(WIF_MINT),
  },
  [TRUMP_MINT]: {
    mint: TRUMP_MINT,
    symbol: "TRUMP",
    name: "OFFICIAL TRUMP",
    imageUrl: dexLogo(TRUMP_MINT),
  },
  [MUSE_FOMO_CA]: {
    mint: MUSE_FOMO_CA,
    symbol: MUSE_FOMO_SYMBOL,
    name: MUSE_FOMO_NAME,
    imageUrl: MUSE_FOMO_LOGO,
    chain: "robinhood",
    pairAddress: MUSE_FOMO_PAIR,
  },
};

export function dexLogo(mint: string): string {
  return `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`;
}

export function resolveMintRef(raw: string): string {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const aliased = LIQUID_MINT_ALIASES[lower] ?? PINNED_CA_ALIASES[lower];
  if (aliased) return aliased;
  if (looksLikeEvm(trimmed)) return trimmed.toLowerCase();
  return trimmed;
}

export function knownMint(raw: string): KnownMint | null {
  const mint = resolveMintRef(raw);
  return KNOWN_MINTS[mint] ?? (looksLikeEvm(mint) && mint === MUSE_FOMO_CA ? KNOWN_MINTS[MUSE_FOMO_CA] : null);
}

export function knownTokenMarket(raw: string): TokenMarket | null {
  const known = knownMint(raw);
  if (!known) return looksLikeEvm(raw) && resolveMintRef(raw) === MUSE_FOMO_CA ? pinnedTokenMarket() : null;
  if (known.chain === "robinhood") return pinnedTokenMarket();
  return {
    mint: known.mint,
    symbol: known.symbol,
    name: known.name,
    imageUrl: known.imageUrl,
    priceUsd: null,
    priceChange24h: null,
    volume24h: null,
    liquidityUsd: null,
    marketCap: null,
    fdv: null,
    pairAddress: known.pairAddress ?? null,
    dexId: null,
    decimals: known.mint === SOL_MINT ? 9 : null,
    buys24h: null,
    sells24h: null,
    buyVolume24h: null,
    sellVolume24h: null,
    chain: known.chain,
  };
}

export function overlayKnownMarket(market: TokenMarket): TokenMarket {
  const known = knownMint(market.mint);
  const mint = known?.mint ?? market.mint;
  return {
    ...market,
    mint,
    symbol: preferLabel(market.symbol, known?.symbol ?? null, mint),
    name: preferLabel(market.name, known?.name ?? null, mint),
    imageUrl: asHttpsLogo(market.imageUrl) ?? known?.imageUrl ?? (looksLikeEvm(mint) ? null : dexLogo(mint)),
    pairAddress: market.pairAddress ?? known?.pairAddress ?? null,
    chain: market.chain ?? known?.chain,
  };
}

export function overlayKnownRow(row: DiscoverTokenRow): DiscoverTokenRow {
  const known = knownMint(row.mint);
  const mint = known?.mint ?? row.mint;
  return {
    ...row,
    mint,
    symbol: preferLabel(row.symbol, known?.symbol ?? null, mint),
    name: preferLabel(row.name, known?.name ?? null, mint),
    imageUrl: asHttpsLogo(row.imageUrl) ?? known?.imageUrl ?? (looksLikeEvm(mint) ? null : dexLogo(mint)),
  };
}

export function overlayKnownRows(rows: DiscoverTokenRow[]): DiscoverTokenRow[] {
  return rows.map(overlayKnownRow);
}
