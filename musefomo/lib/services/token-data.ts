import { PROVIDER_BUDGET_MS } from "@/lib/constants";
import { publicJson, raceTimeout } from "@/lib/fast-fetch";
import { looksLikeEvm } from "@/lib/format";
import { knownTokenMarket, overlayKnownMarket } from "@/lib/known-mints";
import { isPinnedCa, MUSE_FOMO_PAIR } from "@/lib/pinned-tokens";
import { parseTimeframe } from "@/lib/market";
import { getSolUsd, getTokenChart, getTokenMarket } from "@/lib/market";
import { type ChartPairHit, emptyTokenChart, resolveChartPair } from "@/lib/ohlcv";
import { getTokenActivity } from "@/lib/providers/solscan";
import { getTokenMarketData } from "@/lib/services/market-data";
import { asHttpsLogo, mapJupiterMints } from "@/lib/token-logo";
import type { ChartTimeframe, TokenChart, TokenMarket } from "@/lib/types";

const PAGE_BUDGET_MS = PROVIDER_BUDGET_MS;

export async function getTokenPage(raw: string, timeframe: ChartTimeframe = "1D", hintPair?: string | null) {
  const evm = looksLikeEvm(raw);
  const pairHint = hintPair ?? (isPinnedCa(raw) ? MUSE_FOMO_PAIR : null);
  const known = knownTokenMarket(raw) ?? emptyKnown(raw);
  const [market, pairHit, solUsd, jup] = await Promise.all([
    raceTimeout(getTokenMarket(raw), known, PAGE_BUDGET_MS),
    raceTimeout(
      resolveChartPair(raw, pairHint),
      { mint: raw, pair: null, candidates: [] as ChartPairHit[] },
      PAGE_BUDGET_MS,
    ),
    raceTimeout(getSolUsd().catch(() => null), null, PAGE_BUDGET_MS),
    evm
      ? Promise.resolve({ symbol: null, name: null, imageUrl: null })
      : raceTimeout(jupiterLook(raw), { symbol: null, name: null, imageUrl: null }, PAGE_BUDGET_MS),
  ]);
  const merged = overlayKnownMarket(
    mergePairMarket(
      {
        ...known,
        ...market,
        mint: market.mint || pairHit.mint || known.mint,
        symbol: market.symbol ?? pairHit.pair?.symbol ?? jup.symbol ?? known.symbol,
        name: market.name ?? pairHit.pair?.name ?? jup.name ?? known.name,
        imageUrl: asHttpsLogo(market.imageUrl) ?? asHttpsLogo(pairHit.pair?.imageUrl) ?? jup.imageUrl ?? known.imageUrl,
      },
      pairHit.pair,
      pairHint,
    ),
  );
  const pairAddress = merged.pairAddress ?? pairHit.pair?.pairAddress ?? pairHint ?? null;
  const resolved = pairAddress && !merged.pairAddress ? { ...merged, pairAddress } : merged;
  return {
    market: overlayKnownMarket(resolved),
    candles: [] as TokenChart["candles"],
    chart: emptyTokenChart(timeframe, pairAddress, "Chart still loading."),
    prints: [],
    solUsd,
  };
}

function mergePairMarket(base: TokenMarket, pair: ChartPairHit | null, hintPair?: string | null): TokenMarket {
  if (!pair) {
    return { ...base, pairAddress: base.pairAddress ?? hintPair ?? null };
  }
  const buys = base.buys24h ?? pair.buys24h;
  const sells = base.sells24h ?? pair.sells24h;
  const volume = base.volume24h ?? pair.volume24h;
  const totalTx = (buys ?? 0) + (sells ?? 0);
  return {
    ...base,
    symbol: base.symbol ?? pair.symbol,
    name: base.name ?? pair.name,
    imageUrl: asHttpsLogo(base.imageUrl) ?? asHttpsLogo(pair.imageUrl),
    priceUsd: base.priceUsd ?? pair.priceUsd,
    priceChange24h: base.priceChange24h ?? pair.priceChange24h,
    volume24h: base.volume24h ?? pair.volume24h,
    liquidityUsd:
      base.liquidityUsd ?? (pair.liquidity > 0 && pair.liquidity < 1e15 ? pair.liquidity : null),
    marketCap: base.marketCap ?? pair.marketCap,
    fdv: base.fdv ?? pair.fdv ?? pair.marketCap,
    pairAddress: base.pairAddress ?? pair.pairAddress ?? hintPair ?? null,
    dexId: base.dexId ?? pair.dexId,
    buys24h: buys ?? null,
    sells24h: sells ?? null,
    buyVolume24h: base.buyVolume24h ?? (totalTx && volume ? volume * ((buys ?? 0) / totalTx) : null),
    sellVolume24h: base.sellVolume24h ?? (totalTx && volume ? volume * ((sells ?? 0) / totalTx) : null),
  };
}

async function jupiterLook(mint: string): Promise<{
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
}> {
  const rows = await publicJson<unknown>(
    `https://lite-api.jup.ag/tokens/v2/search?query=${encodeURIComponent(mint)}`,
    PAGE_BUDGET_MS,
  );
  const hit = mapJupiterMints(Array.isArray(rows) ? rows : []).find((row) => row.mint === mint);
  return {
    symbol: hit?.symbol ?? null,
    name: hit?.name ?? null,
    imageUrl: asHttpsLogo(hit?.imageUrl),
  };
}

function emptyKnown(raw: string): TokenMarket {
  return (
    knownTokenMarket(raw) ?? {
      mint: raw,
      symbol: null,
      name: null,
      imageUrl: null,
      priceUsd: null,
      priceChange24h: null,
      volume24h: null,
      liquidityUsd: null,
      marketCap: null,
      fdv: null,
      pairAddress: null,
      dexId: null,
      decimals: null,
      buys24h: null,
      sells24h: null,
      buyVolume24h: null,
      sellVolume24h: null,
    }
  );
}

export async function getTokenChartData(raw: string, timeframe: string | null | undefined): Promise<TokenChart> {
  return getTokenChart(raw, parseTimeframe(timeframe));
}

export async function getTokenIdentity(mint: string): Promise<TokenMarket> {
  return getTokenMarket(mint);
}

export async function getNormalizedToken(mint: string) {
  return getTokenMarketData(mint);
}

export async function getTokenDefiActivity(mint: string) {
  const activity = await getTokenActivity(mint);
  return activity.ok ? activity.data : [];
}
