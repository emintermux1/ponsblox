import type { MindNodeId, MuseMind } from "@/types/world";

export const MIND_LIFT = 1.05;

export const DESK_SIGNAL: [number, number, number] = [3.42, 1.2, -1.13];

export const MIND_ANCHORS: Record<MindNodeId, [number, number, number]> = {
  ATTENTION: [0.35, 0.55, 0.1],
  MEMORY: [-0.4, 0.35, 0.15],
  CURIOSITY: [0.05, 0.7, -0.2],
  FOMO: [0.45, 0.2, -0.15],
  RISK: [-0.35, 0.05, -0.2],
  CONVICTION: [0.15, 0.1, 0.35],
  BOREDOM: [-0.15, -0.15, 0.25],
  SOCIAL: [0.5, 0.4, 0.35],
  GROK: [0, 0.45, -0.45],
  ACTION: [0, -0.05, 0],
};

export const MIND_LINKS: ReadonlyArray<readonly [MindNodeId, MindNodeId]> = [
  ["ATTENTION", "CURIOSITY"],
  ["CURIOSITY", "FOMO"],
  ["MEMORY", "ATTENTION"],
  ["GROK", "RISK"],
  ["RISK", "CONVICTION"],
  ["CONVICTION", "ACTION"],
  ["SOCIAL", "FOMO"],
  ["BOREDOM", "ACTION"],
  ["GROK", "CURIOSITY"],
  ["GROK", "ACTION"],
];

export const MIND_SHORT: Record<MindNodeId, string> = {
  ATTENTION: "ATT",
  MEMORY: "MEM",
  CURIOSITY: "CUR",
  FOMO: "FMO",
  RISK: "RSK",
  CONVICTION: "CNV",
  BOREDOM: "BOR",
  SOCIAL: "SOC",
  GROK: "GRK",
  ACTION: "ACT",
};

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function phaseFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 33 + id.charCodeAt(i)) % 1000;
  }
  return (hash / 1000) * Math.PI * 2;
}

export function nodePulse(value: number, time: number, phase: number): number {
  const v = clamp01(value);
  const rate = 0.65 + v * 2.35;
  const breath = 0.5 + 0.5 * Math.sin(time * rate + phase);
  return 0.5 + v * 0.75 + breath * (0.1 + v * 0.28);
}

export function signalCadence(value: number, live: boolean): number {
  const v = clamp01(value);
  if (live) {
    return 0.55 + (1 - v) * 0.85;
  }
  return 2.2 + (1 - v) * 3.0;
}

export function grokSignalLive(mind: MuseMind): boolean {
  return mind.nodes.GROK > 0.32 || mind.grok !== "idle";
}

export function projectMindNode(
  id: MindNodeId,
  width: number,
  height: number,
): { x: number; y: number } {
  const [x, y] = MIND_ANCHORS[id];
  return {
    x: width * 0.5 + x * width * 0.78,
    y: height * 0.52 - y * height * 0.72,
  };
}
