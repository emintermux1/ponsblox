import { timeAgo } from "@/lib/format";
import { assertNever } from "@/lib/never";
import type { AgentStatus, DirectoryActivityKind, DirectoryAgent } from "@/lib/types";

/** For You never lists directory Muses — claimed or unclaimed. Connect/People still can. */
export function forYouAgents(_listed?: DirectoryAgent[]): DirectoryAgent[] {
  return [];
}

export function directoryStatusLabel(status: AgentStatus): string {
  switch (status) {
    case "pending_claim":
      return "Unclaimed";
    case "claimed":
      return "Claimed";
    case "revoked":
      return "Revoked";
    default:
      return assertNever(status, "agent.status");
  }
}

export function pickLastActivity(input: {
  createdAt: string;
  lastFillAt: string | null;
  lastThesisAt: string | null;
  lastFollowAt: string | null;
}): { at: string; kind: DirectoryActivityKind } {
  const candidates: Array<{ at: string; kind: DirectoryActivityKind }> = [];
  if (input.lastFillAt) candidates.push({ at: input.lastFillAt, kind: "fill" });
  if (input.lastThesisAt) candidates.push({ at: input.lastThesisAt, kind: "thesis" });
  if (input.lastFollowAt) candidates.push({ at: input.lastFollowAt, kind: "follow" });
  if (!candidates.length) return { at: input.createdAt, kind: "listed" };
  candidates.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.kind.localeCompare(b.kind));
  return candidates[0] ?? { at: input.createdAt, kind: "listed" };
}

export function lastActivityLabel(kind: DirectoryActivityKind, at: string): string {
  const ago = timeAgo(at);
  switch (kind) {
    case "fill":
      return ago ? `Last fill ${ago}` : "Last fill";
    case "thesis":
      return ago ? `Thesis ${ago}` : "Thesis";
    case "follow":
      return ago ? `Follow ${ago}` : "Follow";
    case "listed":
      return ago ? `Listed ${ago}` : "Listed";
    default:
      return assertNever(kind, "directory.activity");
  }
}

export function toDirectoryAgent(input: {
  id: string;
  handle: string;
  displayName: string | null;
  bio: string | null;
  status: AgentStatus;
  createdAt: string;
  claimedAt: string | null;
  lastFillAt: string | null;
  lastThesisAt: string | null;
  lastFollowAt: string | null;
}): DirectoryAgent {
  const activity = pickLastActivity(input);
  return {
    id: input.id,
    handle: input.handle,
    displayName: input.displayName,
    bio: input.bio,
    status: input.status,
    createdAt: input.createdAt,
    claimedAt: input.claimedAt,
    lastActivityAt: activity.at,
    lastActivityKind: activity.kind,
  };
}
