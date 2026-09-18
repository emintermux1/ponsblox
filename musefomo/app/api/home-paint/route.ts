import { peekLastGoodTrending, seedHomeMemes } from "@/lib/home-paint";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const peeked = peekLastGoodTrending();
    const tokens = peeked.length ? peeked : seedHomeMemes();
    return Response.json(
      { tokens, count: tokens.length },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45" } },
    );
  } catch {
    const tokens = seedHomeMemes();
    return Response.json(
      { tokens, count: tokens.length },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
