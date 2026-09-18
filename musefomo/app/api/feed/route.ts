import { handleFeed } from "@/lib/api";
import { cachedHomeFeed, emptyHomeFeed, parseFeedTab } from "@/lib/feed";
import { peekLastGoodTrending } from "@/lib/home-paint";
import { jsonOk } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 8;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tab = parseFeedTab(url.searchParams.get("tab"));
  try {
    if (tab === "following") return handleFeed(request);
    const feed = await cachedHomeFeed({
      tab,
      before: url.searchParams.get("before") ?? undefined,
      followeeIds: [],
      authenticated: false,
    });
    return jsonOk(feed, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600" },
    });
  } catch {
    const trending = peekLastGoodTrending();
    return jsonOk(
      { ...emptyHomeFeed(tab), trending, count: trending.length },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } },
    );
  }
}
