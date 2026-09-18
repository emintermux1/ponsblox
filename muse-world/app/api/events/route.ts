import { runGrokTick, tickWorld } from "@/lib/sim/loop";
import { getWorld } from "@/lib/world/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await tickWorld();
  } catch {
    /* market adapters fail-open; the room keeps living */
  }
  try {
    if (Math.random() < 0.28) {
      await runGrokTick();
    }
  } catch {
    /* Grok wake/xAI fail-open; never invent a Bot reply here */
  }
  return Response.json(getWorld());
}
