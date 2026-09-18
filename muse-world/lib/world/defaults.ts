import { CAST } from "@/lib/world/cast";
import type { MuseId, MuseMind, MuseState, WorldSnapshot } from "@/types/world";

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
      position: [-4.2, 0.62, 1.1],
      facing: 0.4,
      mind: emptyMind("notice what is actually moving"),
    },
    trader: {
      id: "trader",
      name: CAST.trader.name,
      role: CAST.trader.role,
      activity: "WATCHING",
      thought: null,
      thoughtUntil: 0,
      position: [3.35, 0.62, -0.15],
      facing: Math.PI,
      mind: emptyMind("find asymmetric setups"),
    },
    chill: {
      id: "chill",
      name: CAST.chill.name,
      role: CAST.chill.role,
      activity: "CHILLING",
      thought: null,
      thoughtUntil: 0,
      position: [-1.8, 0.62, 3.4],
      facing: -0.6,
      mind: emptyMind("be bored on purpose"),
    },
    builder: {
      id: "builder",
      name: CAST.builder.name,
      role: CAST.builder.role,
      activity: "RESEARCHING",
      thought: null,
      thoughtUntil: 0,
      position: [6.4, 0.62, 2.8],
      facing: -2.1,
      mind: emptyMind("write a thesis worth sending"),
    },
  };
}

export function seedWorld(): WorldSnapshot {
  return {
    live: true,
    startedAt: Date.now(),
    selected: null,
    mindOpen: false,
    camera: "ROOM",
    muses: seedMuses(),
    events: [],
    packet: null,
    wallPins: [],
  };
}
