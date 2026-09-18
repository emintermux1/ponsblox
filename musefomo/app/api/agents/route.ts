import { PUBLIC_DB_MS } from "@/lib/constants";
import { raceTimeout } from "@/lib/fast-fetch";
import { jsonOk } from "@/lib/http";
import { getLeaderboardPeople } from "@/lib/services/people";

export const dynamic = "force-dynamic";
export const maxDuration = 8;

export async function GET() {
  const agents = await raceTimeout(getLeaderboardPeople().catch(() => []), [], PUBLIC_DB_MS);
  return jsonOk({ agents, count: agents.length });
}
