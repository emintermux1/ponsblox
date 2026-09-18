import { CAST } from "@/lib/world/cast";
import { SEAT } from "@/lib/world/layout";
import { emptyGrokWake } from "@/lib/world/pick";
import type { MuseId, MuseMind, MuseState, WorldSnapshot } from "@/types/world";
import { assertNever } from "@/types/world";

export function museGivenName(id: MuseId): string {
  switch (id) {
    case "scroller":
      return CAST.scroller.name;
    case "trader":
      return CAST.trader.name;
    case "chill":
      return CAST.chill.name;
    case "builder":
      return CAST.builder.name;
    default:
      return assertNever(id);
  }
}

export function emptyMind(goal: string): MuseMind {
  return {
    nodes: {
      ATTENTION: 0.22,
      MEMORY: 0.18,
      CURIOSITY: 0.3,
      FOMO: 0.08,
      RISK: 0.2,
      CONVICTION: 0.15,
      BOREDOM: 0.35,
      SOCIAL: 0.2,
      GROK: 0.05,
      ACTION: 0.12,
    },
    observed: "room hush",
    memory: "nothing sticky",
    goal,
    grok: "idle",
    action: "IDLE",
    watching: null,
  };
}

export function seedMuses(): Record<MuseId, MuseState> {
  return {
    scroller: {
      id: "scroller",
      name: CAST.scroller.name,
      role: CAST.scroller.role,
      activity: "SCROLLING",
      thought: null,
      thoughtUntil: 0,
      position: SEAT.scroller.position,
      facing: SEAT.scroller.facing,
      mind: emptyMind("notice what is actually moving"),
    },
    trader: {
      id: "trader",
      name: CAST.trader.name,
      role: CAST.trader.role,
      activity: "WATCHING",
      thought: null,
      thoughtUntil: 0,
      position: SEAT.trader.position,
      facing: SEAT.trader.facing,
      mind: emptyMind("find asymmetric setups"),
    },
    chill: {
      id: "chill",
      name: CAST.chill.name,
      role: CAST.chill.role,
      activity: "CHILLING",
      thought: null,
      thoughtUntil: 0,
      position: SEAT.chill.position,
      facing: SEAT.chill.facing,
      mind: emptyMind("be bored on purpose"),
    },
    builder: {
      id: "builder",
      name: CAST.builder.name,
      role: CAST.builder.role,
      activity: "RESEARCHING",
      thought: null,
      thoughtUntil: 0,
      position: SEAT.builder.position,
      facing: SEAT.builder.facing,
      mind: emptyMind("write a thesis worth sending"),
    },
  };
}

export function seedWorld(): WorldSnapshot {
  return {
    live: true,
    startedAt: Date.now(),
    selected: null,
    inspecting: null,
    grokWake: emptyGrokWake(),
    mindOpen: false,
    camera: "ROOM",
    muses: seedMuses(),
    events: [],
    packet: null,
    wallPins: [],
  };
}
