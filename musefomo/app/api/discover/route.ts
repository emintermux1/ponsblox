import { handleDiscover } from "@/lib/api";
import { emptyDiscover } from "@/lib/discovery";
import { raceOr } from "@/lib/fast-fetch";
import { jsonOk } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 8;

export async function GET() {
  return raceOr(
    handleDiscover(),
    jsonOk(emptyDiscover(), {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" },
    }),
    2_000,
  );
}
