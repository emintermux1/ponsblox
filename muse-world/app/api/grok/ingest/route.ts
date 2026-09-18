import { applyGrokIngestToWorld } from "@/lib/adapters/apply";
import { claimsExecutedFill, loftCaptionFromText } from "@/lib/adapters/parse";
import {
  GROK_ENV_NAMES,
  assertSource,
  authorizeMuseIngest,
  grokIngestEventSource,
  readEnvName,
} from "@/lib/adapters/source";
import { patchWorld } from "@/lib/world/store";
import { isMuseId } from "@/types/world";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = readEnvName(GROK_ENV_NAMES.ingestSecret);
  const header = request.headers.get("x-muse-ingest");
  if (!authorizeMuseIngest(header, secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  assertSource("real");
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
  if (!loftCaptionFromText(summary)) {
    return Response.json({ error: "not a loft caption" }, { status: 400 });
  }
  const museId = body.museId;
  const source = grokIngestEventSource();
  try {
    patchWorld((world) => applyGrokIngestToWorld(world, museId, summary));
  } catch {
    return Response.json({ error: "do not invent fills" }, { status: 400 });
  }
  return Response.json({ ok: true, source });
}
