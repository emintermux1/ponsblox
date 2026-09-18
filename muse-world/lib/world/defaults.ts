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
    action: "WATCH",
    watching: null,
  };
}

export function seedMuses(): Record<MuseId, MuseState> {
  return {
    scroller: {
      id: "scroller",
      name: "MUSE 01",
      role: "SCROLLER",
      activity: "SCROLLING",
      thought: null,
      thoughtUntil: 0,
      position: [-4.2, 0.4, 1.48],
      facing: 0.18,
      mind: emptyMind("notice what is actually moving"),
    },
    trader: {
      id: "trader",
      name: "MUSE 02",
      role: "TRADER",
      activity: "TRADING",
      thought: null,
      thoughtUntil: 0,
      position: [3.28, 0.42, 0],
      facing: Math.PI,
      mind: emptyMind("find asymmetric setups"),
    },
    chill: {
      id: "chill",
      name: "MUSE 03",
      role: "CHILL",
      activity: "CHILLING",
      thought: null,
      thoughtUntil: 0,
      position: [-1.8, 0.34, 3.5],
      facing: -0.55,
      mind: emptyMind("be bored on purpose"),
    },
    builder: {
      id: "builder",
      name: "MUSE 04",
      role: "BUILDER",
      activity: "RESEARCHING",
      thought: null,
      thoughtUntil: 0,
      position: [6.42, 0.62, 2.68],
      facing: 1.64,
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
