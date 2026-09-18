import type { AdapterResult, IndexPerformance } from "@/types";
import { indexApiConfigured, indexApiFetch, notConfigured } from "./http";

const MISSING_PERF_API =
  "INDEXPAD_API_BASE is unset. Performance is unavailable until the real endpoint is wired.";

function parsePerformance(indexId: string, raw: unknown): IndexPerformance | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const componentReturns = Array.isArray(row.componentReturns)
    ? row.componentReturns.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const rec = item as Record<string, unknown>;
        if (typeof rec.symbol !== "string") return [];
        return [
          {
            symbol: rec.symbol,
            change24hBps: typeof rec.change24hBps === "number" ? rec.change24hBps : null,
          },
        ];
      })
    : [];
  return {
    indexId: typeof row.indexId === "string" ? row.indexId : indexId,
    asOf: typeof row.asOf === "number" ? row.asOf : Date.now(),
    valueQuote: typeof row.valueQuote === "string" ? row.valueQuote : null,
    change24hBps: typeof row.change24hBps === "number" ? row.change24hBps : null,
    componentReturns,
  };
}

export async function getIndexPerformance(indexId: string): Promise<AdapterResult<IndexPerformance>> {
  const id = indexId.trim();
  if (!id) return { ok: false, code: "invalid", message: "indexId is required" };
  if (!indexApiConfigured()) return notConfigured(MISSING_PERF_API);

  try {
    const body = await indexApiFetch<unknown>(`/indexes/${encodeURIComponent(id)}/performance`);
    const parsed = parsePerformance(id, body);
    if (!parsed) {
      return { ok: false, code: "upstream", message: "Index API returned an unrecognized performance payload" };
    }
    return { ok: true, data: parsed };
  } catch (error) {
    return {
      ok: false,
      code: "upstream",
      message: error instanceof Error ? error.message : "Index performance read failed",
    };
  }
}
