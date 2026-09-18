import { askGrok } from "@/lib/adapters/grok";
import { peekMarketPulse } from "@/lib/adapters/market";
import { applyActivity, pickTicker, setThought, tickSnapshot } from "@/lib/sim/tick";
import { getWorld, patchWorld } from "@/lib/world/store";
import type { WorldSnapshot } from "@/types/world";

export async function tickWorld(): Promise<WorldSnapshot> {
  const pulse = await peekMarketPulse();
  return patchWorld((world) =>
    tickSnapshot(world, {
      kind: pulse.kind,
      ticker: pulse.ticker,
    }),
  );
}

export async function runGrokTick(): Promise<void> {
  const world = getWorld();
  const ticker = pickTicker(
    world.muses.trader.mind.watching ?? world.muses.scroller.mind.watching,
  );
  const asked = applyActivity(
    {
      ...world.muses.trader,
      mind: {
        ...world.muses.trader.mind,
        grok: `requesting context on ${ticker}`,
        nodes: { ...world.muses.trader.mind.nodes, GROK: 0.78 },
      },
    },
    "THINKING",
    ticker,
  );
  const reply = await askGrok({
    museId: "trader",
    goal: asked.mind.goal,
    observation: `${ticker} is in the room`,
  });
  const after = setThought(
    {
      ...asked,
      mind: {
        ...asked.mind,
        grok: reply.summary,
        action: reply.bias === "pass" ? "PASS" : "WATCH",
        watching: ticker,
        nodes: {
          ...asked.mind.nodes,
          GROK: 0.4,
          RISK: reply.bias === "pass" ? 0.66 : 0.44,
          CONVICTION: reply.bias === "buy" ? 0.7 : 0.38,
        },
      },
    },
    "send to grok",
  );
  patchWorld((current) => ({
    ...current,
    muses: { ...current.muses, trader: after },
    events: [
      {
        id: `ev_${Date.now().toString(36)}`,
        kind: reply.source === "sim" ? ("GROK_REQUESTED" as const) : ("GROK_RESPONSE" as const),
        museId: "trader" as const,
        text: `${after.name} → GROK · ${reply.summary}`,
        at: Date.now(),
        source: reply.source,
      },
      ...current.events,
    ].slice(0, 24),
  }));
}
