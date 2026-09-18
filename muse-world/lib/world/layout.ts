import type { PacketEndpoint, ScreenId } from "@/types/world";
import { assertNever } from "@/types/world";

/** Hero Grok sits on the trader desk, slightly above the wood. */
export const GROK_ORB_POS: [number, number, number] = [4.18, 1.12, -0.18];

export const SCREEN_POS: Record<ScreenId, [number, number, number]> = {
  tape: [2.82, 1.2, -1.13],
  notes: [4.02, 1.2, -1.13],
};

export const SEAT = {
  scroller: { position: [-3.52, 0.54, 1.52] as [number, number, number], facing: 0.62 },
  trader: { position: [2.78, 0.58, 0.28] as [number, number, number], facing: Math.PI },
  builder: { position: [4.08, 0.58, 0.28] as [number, number, number], facing: Math.PI },
  chill: { position: [-1.78, 0.54, 3.36] as [number, number, number], facing: -0.55 },
} as const;

export const PACKET_TRAVEL_MS = 2200;
export const PACKET_HOLD_MS = 2400;

export const IDEA_WALL_ORIGIN: [number, number, number] = [7.55, 1.8, 2.6];

export const IDEA_WALL_CARDS = [
  { key: "thesis", x: -0.7, y: 0.55 },
  { key: "flow", x: 0.15, y: 0.9 },
  { key: "ref", x: 0.85, y: 0.4 },
  { key: "risk", x: -0.25, y: -0.15 },
  { key: "ask", x: 0.55, y: -0.35 },
] as const;

export const WALL_SLOT_COUNT = IDEA_WALL_CARDS.length;

export function wallSlotLocal(slot: number): [number, number, number] {
  const card = IDEA_WALL_CARDS[((slot % WALL_SLOT_COUNT) + WALL_SLOT_COUNT) % WALL_SLOT_COUNT];
  return [card.x, card.y, 0.06];
}

export function wallSlotWorld(slot: number): [number, number, number] {
  const [lx, ly, lz] = wallSlotLocal(slot);
  return [IDEA_WALL_ORIGIN[0] - lz, IDEA_WALL_ORIGIN[1] + ly, IDEA_WALL_ORIGIN[2] + lx];
}

export function worldToWallLocal(position: [number, number, number]): [number, number, number] {
  return [
    position[2] - IDEA_WALL_ORIGIN[2],
    position[1] - IDEA_WALL_ORIGIN[1],
    IDEA_WALL_ORIGIN[0] - position[0],
  ];
}

export function chillHome(now: number): [number, number, number] {
  const cycle = Math.floor(now / 14000) % 3;
  if (cycle === 0) return [-1.6, 0.62, 3.5];
  if (cycle === 1) return [-5.4, 0.62, 2.2];
  return [-3.1, 0.62, 4.2];
}

export function packetAccent(endpoint: PacketEndpoint): string {
  switch (endpoint) {
    case "scroller":
      return "#d8c6a6";
    case "trader":
      return "#c8c4bc";
    case "chill":
      return "#3f7a4a";
    case "builder":
      return "#c9b48a";
    case "wall":
      return "#e6d7bc";
    case "grok":
      return "#f5f5f2";
    default:
      return assertNever(endpoint);
  }
}
