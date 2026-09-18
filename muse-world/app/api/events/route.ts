import { applyGrokWakeToWorld } from "@/lib/adapters/apply";
import { isIntervalWakeDue, noteIntervalWake, wakeGrok } from "@/lib/adapters/grok";
import { tickWorld } from "@/lib/sim/loop";
import { getWorld, patchWorld } from "@/lib/world/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await tickWorld();
  } catch {
    /* market adapters fail-open; the room keeps living */
  }
  try {
    if (isIntervalWakeDue()) {
      noteIntervalWake();
      const world = getWorld();
      const museId = "trader" as const;
      const watching =
        world.muses.trader.mind.watching ?? world.muses.scroller.mind.watching;
      const wake = await wakeGrok({
        museId,
        goal: world.muses[museId].mind.goal,
        observation: watching ? `${watching} is in the room` : "the loft is quiet",
      });
      patchWorld((current) => applyGrokWakeToWorld(current, museId, wake));
    }
  } catch {
    /* Grok wake/xAI fail-open; never invent a Bot reply here */
  }
  return Response.json(getWorld());
}
