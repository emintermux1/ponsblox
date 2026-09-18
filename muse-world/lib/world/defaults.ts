import { CAST } from "@/lib/world/cast";
import { STATIONS } from "@/lib/world/layout";
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
    action: "WATCH",
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
      position: STATIONS.scrollerSofa.position,
      facing: STATIONS.scrollerSofa.facing,
      heading: null,
      mind: emptyMind("notice what is actually moving"),
    },
    trader: {
      id: "trader",
      name: CAST.trader.name,
      role: CAST.trader.role,
      activity: "TRADING",
      thought: null,
      thoughtUntil: 0,
      position: STATIONS.traderDesk.position,
      facing: STATIONS.traderDesk.facing,
      heading: null,
      mind: emptyMind("find asymmetric setups"),
    },
    chill: {
      id: "chill",
      name: CAST.chill.name,
      role: CAST.chill.role,
      activity: "CHILLING",
      thought: null,
      thoughtUntil: 0,
      position: STATIONS.chillArmchair.position,
      facing: STATIONS.chillArmchair.facing,
      heading: null,
      mind: emptyMind("be bored on purpose"),
    },
    builder: {
      id: "builder",
      name: CAST.builder.name,
      role: CAST.builder.role,
      activity: "RESEARCHING",
      thought: null,
      thoughtUntil: 0,
      position: STATIONS.builderWall.position,
      facing: STATIONS.builderWall.facing,
      heading: null,
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
