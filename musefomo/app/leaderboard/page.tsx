import { emptyLeaderboardPayload, getLeaderboard } from "@/lib/services/leaderboard";
import { getLeaderboardPeople } from "@/lib/services/people";

import { LeaderboardView } from "./leaderboard-view";

export const dynamic = "force-dynamic";
export const maxDuration = 8;

export default async function LeaderboardPage() {
  const [directory, rawBoard] = await Promise.all([
    getLeaderboardPeople(),
    getLeaderboard("24h").catch(() => emptyLeaderboardPayload("24h")),
  ]);
  return <LeaderboardView initialBoard={rawBoard} initialDirectory={directory} />;
}
