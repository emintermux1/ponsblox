import { handleQuote } from "@/lib/api";
import { QUOTE_BUDGET_MS } from "@/lib/constants";
import { raceOr } from "@/lib/fast-fetch";
import { jsonError } from "@/lib/http";

export const maxDuration = 8;

export async function POST(request: Request) {
  return raceOr(
    handleQuote(request),
    jsonError(504, "QUOTE_FAILED", "Quote timed out"),
    QUOTE_BUDGET_MS,
  );
}
