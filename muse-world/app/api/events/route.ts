import { runGrokTick, tickWorld } from "@/lib/sim/loop";
import { getWorld } from "@/lib/world/store";

export const dynamic = "force-dynamic";

export async function GET() {
  await tickWorld();
  if (Math.random() < 0.28) {
    await runGrokTick();
  }
  return Response.json(getWorld());
}
