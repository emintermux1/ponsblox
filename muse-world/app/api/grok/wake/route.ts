import { wakeGrok } from "@/lib/adapters/grok";
import { grokReplyFromWake, makeGrokEvent } from "@/lib/adapters/parse";
import { patchWorld } from "@/lib/world/store";
import { isMuseId, type MuseId } from "@/types/world";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    museId?: unknown;
    goal?: unknown;
    observation?: unknown;
  };
  if (!isMuseId(body.museId)) {
    return Response.json({ error: "museId required" }, { status: 400 });
  }
  const museId: MuseId = body.museId;
  const ask = {
    museId,
    goal: typeof body.goal === "string" ? body.goal : "context",
    observation: typeof body.observation === "string" ? body.observation : "",
  };
  const wake = await wakeGrok(ask);
  const reply = grokReplyFromWake(wake);
  const kind = wake.xai ? ("GROK_RESPONSE" as const) : ("GROK_REQUESTED" as const);
  const source = wake.xai ? ("xai" as const) : ("sim" as const);
  patchWorld((world) => ({
    ...world,
    muses: {
      ...world.muses,
      [museId]: {
        ...world.muses[museId],
        mind: {
          ...world.muses[museId].mind,
          grok: wake.xai ? wake.xai.summary : reply.summary,
          nodes: {
            ...world.muses[museId].mind.nodes,
            GROK: wake.xai ? 0.55 : 0.72,
          },
        },
      },
    },
    events: [
      makeGrokEvent({
        kind,
        museId,
        museName: world.muses[museId].name,
        source,
        summary: reply.summary,
      }),
      ...world.events,
    ].slice(0, 24),
  }));
  return Response.json({
    woken: wake.woken,
    pendingIngest: wake.pendingIngest,
    xai: wake.xai,
    reply,
  });
}
