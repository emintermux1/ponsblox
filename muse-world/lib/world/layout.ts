import type { MuseActivity, MuseId, PacketEndpoint, ScreenId } from "@/types/world";
import { assertNever } from "@/types/world";

export const GROK_ORB_POS: [number, number, number] = [4.22, 1.12, -0.62];

export const SCREEN_POS: Record<ScreenId, [number, number, number]> = {
  tape: [2.82, 1.2, -1.13],
  notes: [4.02, 1.2, -1.13],
};

export const PACKET_TRAVEL_MS = 2200;
export const PACKET_HOLD_MS = 2400;

export const IDEA_WALL_ORIGIN: [number, number, number] = [7.55, 1.8, 2.6];

export const STAND_Y = 0.62;

export type MuseStation = {
  position: [number, number, number];
  facing: number;
};

export const STATIONS = {
  scrollerSofa: { position: [-4.2, 0.4, 1.48], facing: 0.18 } satisfies MuseStation,
  scrollerWindow: { position: [-6.35, STAND_Y, -2.55], facing: Math.PI } satisfies MuseStation,
  traderDesk: { position: [3.28, 0.42, 0], facing: Math.PI } satisfies MuseStation,
  builderWall: { position: [6.42, STAND_Y, 2.68], facing: 1.64 } satisfies MuseStation,
  builderDesk: { position: [4.12, 0.42, 0], facing: Math.PI } satisfies MuseStation,
  chillArmchair: { position: [-1.8, 0.34, 3.5], facing: -0.55 } satisfies MuseStation,
} as const;

export const SEAT = {
  scroller: STATIONS.scrollerSofa,
  trader: STATIONS.traderDesk,
  builder: STATIONS.builderDesk,
  chill: STATIONS.chillArmchair,
} as const;

export const IDEA_WALL_CARDS = [
  { key: "thesis", x: -1.22, y: 0.74 },
  { key: "flow", x: -0.38, y: 0.92 },
  { key: "ref", x: 0.48, y: 0.7 },
  { key: "pulse", x: 1.28, y: 0.86 },
  { key: "risk", x: -1.08, y: 0.08 },
  { key: "ask", x: -0.18, y: -0.12 },
  { key: "grok", x: 0.68, y: 0.06 },
  { key: "room", x: 1.22, y: -0.28 },
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

export function nearXZ(
  a: [number, number, number],
  b: [number, number, number],
  eps = 0.12,
): boolean {
  return Math.hypot(a[0] - b[0], a[2] - b[2]) < eps;
}

export function chillHome(_now?: number): [number, number, number] {
  return STATIONS.chillArmchair.position;
}

export function stationFor(id: MuseId, activity: MuseActivity): MuseStation {
  switch (id) {
    case "scroller":
      return activity === "WATCHING" ? STATIONS.scrollerWindow : STATIONS.scrollerSofa;
    case "trader":
      return STATIONS.traderDesk;
    case "chill":
      return STATIONS.chillArmchair;
    case "builder":
      return activity === "THINKING" ? STATIONS.builderDesk : STATIONS.builderWall;
    default:
      return assertNever(id);
  }
}

export function arriveActivity(id: MuseId, desired: MuseActivity): MuseActivity {
  if (desired !== "WALKING") {
    return desired;
  }
  switch (id) {
    case "chill":
      return "CHILLING";
    case "scroller":
      return "SCROLLING";
    case "trader":
      return "TRADING";
    case "builder":
      return "RESEARCHING";
    default:
      return assertNever(id);
  }
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
