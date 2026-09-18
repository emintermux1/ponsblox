import {
  assertSource,
  authorizeMuseIngest,
  grokIngestEventSource,
} from "@/lib/adapters/source";
import { patchWorld } from "@/lib/world/store";
import type { MuseId } from "@/types/world";

export const dynamic = "force-dynamic";

const MUSES: MuseId[] = ["scroller", "trader", "chill", "builder"];

function isMuseId(value: unknown): value is MuseId {
  return typeof value === "string" && MUSES.includes(value as MuseId);
}

export async function POST(request: Request) {
  const secret = process.env.GROK_INGEST_SECRET;
  const header = request.headers.get("x-muse-ingest");
  if (!authorizeMuseIngest(header, secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  assertSource("real");
  const body = (await request.json().catch(() => ({}))) as {
    museId?: unknown;
    summary?: unknown;
  };
  const museId = isMuseId(body.museId) ? body.museId : "trader";
  const summary =
    typeof body.summary === "string" && body.summary.trim()
      ? body.summary.trim().slice(0, 160)
      : null;
  if (!summary) {
    return Response.json({ error: "summary required" }, { status: 400 });
  }
  const source = grokIngestEventSource();
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
      {
        id: `in_${Date.now().toString(36)}`,
        kind: "GROK_RESPONSE" as const,
        museId,
        text: `${world.muses[museId].name} ← GROK · ${summary}`,
        at: Date.now(),
        source,
      },
      ...world.events,
    ].slice(0, 24),
  }));
  return Response.json({ ok: true });
}
