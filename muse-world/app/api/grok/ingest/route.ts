import { claimsExecutedFill, ingestAuthorized, makeGrokEvent } from "@/lib/adapters/parse";
import { patchWorld } from "@/lib/world/store";
import { isMuseId } from "@/types/world";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.GROK_INGEST_SECRET;
  const header = request.headers.get("x-muse-ingest") ?? request.headers.get("authorization");
  const auth = ingestAuthorized(secret, header);
  if (auth === "missing_secret") {
    return Response.json({ error: "ingest not configured" }, { status: 503 });
  }
  if (auth === "unauthorized") {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    museId?: unknown;
    summary?: unknown;
  };
  if (!isMuseId(body.museId)) {
    return Response.json({ error: "museId required" }, { status: 400 });
  }
  const summary =
    typeof body.summary === "string" && body.summary.trim()
      ? body.summary.trim().slice(0, 160)
      : null;
  if (!summary) {
    return Response.json({ error: "summary required" }, { status: 400 });
  }
  if (claimsExecutedFill(summary)) {
    return Response.json({ error: "do not invent fills" }, { status: 400 });
  }
  const museId = body.museId;
  patchWorld((world) => ({
    ...world,
    muses: {
      ...world.muses,
      [museId]: {
        ...world.muses[museId],
        mind: {
          ...world.muses[museId].mind,
          grok: summary,
          nodes: { ...world.muses[museId].mind.nodes, GROK: 0.55 },
        },
      },
    },
    events: [
      makeGrokEvent({
        kind: "GROK_RESPONSE",
        museId,
        museName: world.muses[museId].name,
        source: "bot",
        summary,
      }),
      ...world.events,
    ].slice(0, 24),
  }));
  return Response.json({ ok: true, source: "bot" });
}
