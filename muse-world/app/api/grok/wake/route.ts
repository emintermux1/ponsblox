import { applyGrokWakeToWorld } from "@/lib/adapters/apply";
import { wakeGrok } from "@/lib/adapters/grok";
import { grokReplyFromWake } from "@/lib/adapters/parse";
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
  const world = patchWorld((current) => applyGrokWakeToWorld(current, museId, wake));
  const muse = world.muses[museId];
  return Response.json({
    reason: "click",
    woken: wake.woken,
    pendingIngest: wake.pendingIngest,
    xai: wake.xai,
    reply,
    thought: muse.thought,
    source: wake.xai ? "xai" : "sim",
  });
}
