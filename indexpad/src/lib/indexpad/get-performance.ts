import type { AdapterCode, IndexPerformance } from "@/types";
import { indexApiConfigured, indexApiFetch } from "./http";
import { getIndexPerformance } from "./performance";
import { parsePerformancePoints } from "./parse";
import {
  PERFORMANCE_TIMEFRAMES,
  type IndexPerformanceView,
  type PerformanceTimeframe,
} from "./view";

function emptySeries(
  indexId: string,
  timeframe: PerformanceTimeframe,
  status: AdapterCode | "ok",
  message: string | null,
  snapshot?: Pick<IndexPerformance, "valueQuote" | "change24hBps" | "componentReturns" | "asOf">,
): IndexPerformanceView {
  return {
    indexId,
    timeframe,
    asOf: snapshot?.asOf ?? Date.now(),
    valueQuote: snapshot?.valueQuote ?? null,
    change24hBps: snapshot?.change24hBps ?? null,
    change7dBps: null,
    points: [],
    status,
    message,
    componentReturns: snapshot?.componentReturns ?? [],
  };
}

function isTimeframe(value: string): value is PerformanceTimeframe {
  return (PERFORMANCE_TIMEFRAMES as string[]).includes(value);
}

async function seriesForTimeframe(
  indexId: string,
  timeframe: PerformanceTimeframe,
  snapshot: IndexPerformance,
): Promise<IndexPerformanceView> {
  const base = emptySeries(indexId, timeframe, "ok", null, snapshot);
  if (!indexApiConfigured()) {
    return {
      ...base,
      status: "not_configured",
      message: "INDEXPAD_API_BASE is unset. Performance is unavailable until the real endpoint is wired.",
    };
  }

  try {
    const path = `/indexes/${encodeURIComponent(indexId)}/performance?timeframe=${timeframe}`;
    const body = await indexApiFetch<unknown>(path);
    if (!body || typeof body !== "object") return base;
    const record = body as Record<string, unknown>;
    const points = parsePerformancePoints(record.points ?? record.series);
    const tf =
      typeof record.timeframe === "string" && isTimeframe(record.timeframe)
        ? record.timeframe
        : timeframe;
    return {
      ...base,
      timeframe: tf,
      points,
      change7dBps: typeof record.change7dBps === "number" ? record.change7dBps : null,
      valueQuote: typeof record.valueQuote === "string" ? record.valueQuote : base.valueQuote,
      change24hBps:
        typeof record.change24hBps === "number" ? record.change24hBps : base.change24hBps,
    };
  } catch {
    return base;
  }
}

export async function loadIndexPerformanceSeries(
  indexId: string,
  timeframe: PerformanceTimeframe = "ALL",
): Promise<IndexPerformanceView> {
  const result = await getIndexPerformance(indexId);
  if (!result.ok) {
    return emptySeries(indexId, timeframe, result.code, result.message);
  }
  return seriesForTimeframe(indexId, timeframe, result.data);
}

export async function getIndexPerformanceMap(
  indexId: string,
): Promise<Record<PerformanceTimeframe, IndexPerformanceView>> {
  const result = await getIndexPerformance(indexId);

  if (!result.ok) {
    const rows = PERFORMANCE_TIMEFRAMES.map(
      (timeframe) =>
        [
          timeframe,
          emptySeries(indexId, timeframe, result.code, result.message),
        ] as const,
    );
    return Object.fromEntries(rows) as Record<PerformanceTimeframe, IndexPerformanceView>;
  }

  const entries = await Promise.all(
    PERFORMANCE_TIMEFRAMES.map(async (timeframe) => {
      const series = await seriesForTimeframe(indexId, timeframe, result.data);
      return [timeframe, series] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<PerformanceTimeframe, IndexPerformanceView>;
}
