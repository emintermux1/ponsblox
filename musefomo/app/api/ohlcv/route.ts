import { CHART_TIMEFRAMES } from "@/lib/constants";
import { raceTimeout } from "@/lib/fast-fetch";
import { jsonError, jsonOk } from "@/lib/http";
import {
  CHART_BUDGET_MS,
  emptyTokenChart,
  fetchPairCandles,
  loadMintChart,
  OHLCV_TTL_MS,
} from "@/lib/ohlcv";
import type { ChartTimeframe } from "@/lib/types";

function parseTf(value: string | null): ChartTimeframe {
  const next = CHART_TIMEFRAMES.find((item) => item === value);
  return next ?? "1D";
}

export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": `public, s-maxage=${Math.floor(OHLCV_TTL_MS / 1000)}, stale-while-revalidate=60`,
};

const MISS_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=0, must-revalidate",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pair = url.searchParams.get("pair")?.trim() || null;
  const mint = url.searchParams.get("mint")?.trim() || null;
  if ((!pair || pair.length < 32) && (!mint || mint.length < 32)) {
    return jsonError(400, "invalid_pair", "mint or pair is required.");
  }
  const timeframe = parseTf(url.searchParams.get("tf"));

  if (mint && mint.length >= 32) {
    const chart = await raceTimeout(
      loadMintChart(mint, timeframe, pair),
      emptyTokenChart(timeframe, pair, "Chart still loading."),
      2_000,
    );
    return jsonOk(
      {
        candles: chart.candles,
        candleSource: chart.candleSource,
        pairSource: chart.pairSource,
        pairAddress: chart.pairAddress,
        timeframe: chart.timeframe,
        reason: chart.reason,
        budgetMs: CHART_BUDGET_MS,
      },
      { headers: chart.candles.length ? CACHE_HEADERS : MISS_HEADERS },
    );
  }

  const bars = await raceTimeout(
    fetchPairCandles(pair as string, timeframe),
    { candles: [], candleSource: null },
    2_000,
  );
  return jsonOk(
    {
      candles: bars.candles,
      candleSource: bars.candleSource,
      pairSource: bars.candles.length ? "geckoterminal" : null,
      pairAddress: pair,
      timeframe,
      reason: bars.candles.length ? null : "Edge OHLCV hosts returned no public bars for this pair.",
      budgetMs: CHART_BUDGET_MS,
    },
    { headers: bars.candles.length ? CACHE_HEADERS : MISS_HEADERS },
  );
}
