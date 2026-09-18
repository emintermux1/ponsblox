import { runDiscover, runLeaderboard } from "@/lib/discovery";
import { getMuseLeaderboard } from "@/lib/muse-board";
import type { LeaderboardPayload, LeaderboardWindow } from "@/lib/types";

export { getLeaderboardPeople } from "@/lib/services/people";

export async function getDiscover() {
  return runDiscover();
}

export async function getLeaderboard(window: LeaderboardWindow) {
  return runLeaderboard(window);
}

export async function getMuseRanks(window: LeaderboardWindow) {
  return getMuseLeaderboard(window);
}

export function emptyLeaderboardPayload(window: LeaderboardWindow): LeaderboardPayload {
  return {
    window,
    capturedAt: Date.now(),
    muse: { source: "muse-confirmed", window, count: 0, entries: [] },
    fomo: null,
    fomoUnavailable: null,
    directory: [],
  };
}
