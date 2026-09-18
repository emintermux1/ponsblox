import {
  grokReplyFromWake,
  labeledLoftThought,
  loftThoughtFromWake,
  makeGrokEvent,
  type GrokWakeResult,
} from "@/lib/adapters/parse";
import {
  assertSimNotReal,
  assertSource,
  grokIngestEventSource,
  honestyFromLabel,
} from "@/lib/adapters/source";
import { assignWakeTask } from "@/lib/sim/grok-patrol";
import type { MuseId, WorldSnapshot } from "@/types/world";

const LOFT_THOUGHT_MS = 8_000;

export function applyGrokWakeToWorld(
  world: WorldSnapshot,
  museId: MuseId,
  wake: GrokWakeResult,
  now = Date.now(),
): WorldSnapshot {
  const muse = world.muses[museId];
  const loft = loftThoughtFromWake(wake, now);
  const reply = grokReplyFromWake(wake);
  const kind = loft.source === "xai" ? ("GROK_RESPONSE" as const) : ("GROK_REQUESTED" as const);
  const honesty = loft.source === "xai" ? assertSource("real") : assertSource("sim");
  assertSimNotReal(honesty, loft.source);
  const grokField = wake.xai ? wake.xai.summary : muse.mind.grok;

  const woken: WorldSnapshot = {
    ...world,
    muses: {
      ...world.muses,
      [museId]: {
        ...muse,
        thought: loft.thought,
        thoughtUntil: now + LOFT_THOUGHT_MS,
        mind: {
          ...muse.mind,
          grok: grokField,
          action: reply.bias === "pass" ? "PASS" : "WATCH",
          nodes: {
            ...muse.mind.nodes,
            GROK: loft.source === "xai" ? 0.55 : 0.72,
            RISK: reply.bias === "pass" ? 0.66 : muse.mind.nodes.RISK,
            CONVICTION: reply.bias === "buy" ? 0.7 : muse.mind.nodes.CONVICTION,
          },
        },
      },
    },
    events: [
      makeGrokEvent({
        kind,
        museId,
        museName: muse.name,
        source: loft.source,
        summary: reply.summary,
        now,
      }),
      ...world.events,
    ].slice(0, 24),
  };
  const tasked = assignWakeTask(
    woken,
    museId,
    now,
    wake.xai?.summary ?? null,
    loft.source === "xai",
  );
  return {
    ...tasked,
    muses: {
      ...tasked.muses,
      [museId]: {
        ...tasked.muses[museId],
        thought: loft.thought,
        thoughtUntil: now + LOFT_THOUGHT_MS,
      },
    },
  };
}

export function applyGrokIngestToWorld(
  world: WorldSnapshot,
  museId: MuseId,
  summary: string,
  now = Date.now(),
): WorldSnapshot {
  const muse = world.muses[museId];
  const source = grokIngestEventSource();
  const thought = labeledLoftThought(source, summary);
  if (!thought) {
    throw new Error("ingest caption is not a loft line");
  }
  assertSource("real");
  if (honestyFromLabel(source) !== "real") {
    throw new Error("ingest source must be REAL");
  }

  return {
    ...world,
    muses: {
      ...world.muses,
      [museId]: {
        ...muse,
        thought,
        thoughtUntil: now + LOFT_THOUGHT_MS,
        mind: {
          ...muse.mind,
          grok: summary,
          nodes: { ...muse.mind.nodes, GROK: 0.55 },
        },
      },
    },
    events: [
      makeGrokEvent({
        kind: "GROK_RESPONSE",
        museId,
        museName: muse.name,
        source,
        summary,
        now,
      }),
      ...world.events,
    ].slice(0, 24),
  };
}
