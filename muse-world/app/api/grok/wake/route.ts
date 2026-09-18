import { askGrok } from "@/lib/adapters/grok";
import type { MuseId } from "@/types/world";

export const dynamic = "force-dynamic";

const MUSES: MuseId[] = ["scroller", "trader", "chill", "builder"];

function isMuseId(value: unknown): value is MuseId {
  return typeof value === "string" && MUSES.includes(value as MuseId);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    museId?: unknown;
    goal?: unknown;
    observation?: unknown;
  };
  if (!isMuseId(body.museId)) {
    return Response.json({ error: "museId required" }, { status: 400 });
  }
  const reply = await askGrok({
    museId: body.museId,
    goal: typeof body.goal === "string" ? body.goal : "context",
    observation: typeof body.observation === "string" ? body.observation : "",
  });
  return Response.json(reply);
}
