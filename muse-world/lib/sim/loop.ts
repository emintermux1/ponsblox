import { askGrok } from "@/lib/adapters/grok";
import { grokReplyFromWake, makeGrokEvent } from "@/lib/adapters/parse";
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
  const previousGrok = world.muses.trader.mind.grok;
  const wake = await askGrok({
    museId: "trader",
    goal: asked.mind.goal,
    observation: `${ticker} is in the room`,
  });
  const reply = grokReplyFromWake(wake);
  const after = setThought(
    {
      ...asked,
      mind: {
        ...asked.mind,
        grok: wake.xai ? wake.xai.summary : previousGrok,
        action: reply.bias === "pass" ? "PASS" : "WATCH",
        watching: ticker,
        nodes: {
          ...asked.mind.nodes,
          GROK: wake.xai ? 0.4 : 0.72,
          RISK: reply.bias === "pass" ? 0.66 : 0.44,
          CONVICTION: reply.bias === "buy" ? 0.7 : 0.38,
        },
      },
    },
    "send to grok",
  );
  const kind = wake.xai ? ("GROK_RESPONSE" as const) : ("GROK_REQUESTED" as const);
  const source = wake.xai ? ("xai" as const) : ("sim" as const);
  patchWorld((current) => ({
    ...current,
    muses: { ...current.muses, trader: after },
    events: [
      makeGrokEvent({
        kind,
        museId: "trader",
        museName: after.name,
        source,
        summary: reply.summary,
      }),
      ...current.events,
    ].slice(0, 24),
  }));
}
