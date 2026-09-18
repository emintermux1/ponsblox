import { cachePeek, cacheWrapIf } from "@/lib/cache";
import { PUBLIC_DB_MS } from "@/lib/constants";
import { listDirectoryAgents } from "@/lib/db";
import { raceTimeout } from "@/lib/fast-fetch";
import type { DirectoryAgent } from "@/lib/types";

const PEOPLE_KEY = "leaderboard:people:muse-db";
const PEOPLE_TTL_MS = 15_000;

function refreshPeople(): Promise<DirectoryAgent[]> {
  return cacheWrapIf(
    PEOPLE_KEY,
    PEOPLE_TTL_MS,
    () => raceTimeout(listDirectoryAgents().catch(() => [] as DirectoryAgent[]), [], PUBLIC_DB_MS),
    (rows) => rows.length > 0,
  );
}

/** People / Connect list. Unclaimed stay. Homepage and For You must not call this. */
export async function getLeaderboardPeople(): Promise<DirectoryAgent[]> {
  const peek = cachePeek<DirectoryAgent[]>(PEOPLE_KEY);
  if (peek?.value?.length) {
    if (!peek.fresh) void refreshPeople();
    return peek.value;
  }
  void refreshPeople();
  return [];
}
