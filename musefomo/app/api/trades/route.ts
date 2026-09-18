import { handleTradesList } from "@/lib/api";
import { PUBLIC_GET_MS } from "@/lib/constants";
import { raceOr } from "@/lib/fast-fetch";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  return raceOr(
    handleTradesList(request),
    jsonError(504, "TIMEOUT", "Request timed out"),
    PUBLIC_GET_MS,
  );
}
