import { handleCreateThesis } from "@/lib/api";
import { cachedThesisPage } from "@/lib/feed";
import { jsonOk } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 8;

export async function GET() {
  const page = await cachedThesisPage();
  return jsonOk(
    {
      items: page.items,
      count: page.count,
      thesisCount: page.count,
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600" } },
  );
}

export async function POST(request: Request) {
  return handleCreateThesis(request);
}
