import { handleLeaderboard } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 12;

export async function GET(request: Request): Promise<Response> {
  return handleLeaderboard(request);
}
