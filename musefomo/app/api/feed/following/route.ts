import { handleFollowingFeed } from "@/lib/api";

export async function GET(request: Request) {
  return handleFollowingFeed(request);
}
