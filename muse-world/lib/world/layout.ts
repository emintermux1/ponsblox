import type { PacketEndpoint } from "@/types/world";
import { assertNever } from "@/types/world";

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

/**
 * Furniture footprints where a muse reads as seated.
 * The sim keeps muse anchors at y=0.62; the plush body is dropped from that
 * anchor to the floor — or onto a cushion when the anchor sits over one.
 */
type SeatZone = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** world Y of the cushion top */
  seatTop: number;
};

const SEAT_ZONES: SeatZone[] = [
  { minX: -5.9, maxX: -2.4, minZ: 0.7, maxZ: 2.0, seatTop: 0.5 },
  { minX: -2.3, maxX: -1.35, minZ: 3.0, maxZ: 3.85, seatTop: 0.38 },
];

/** Local Y of the plush head centre above the grounded body origin. */
export const PLUSH_HEAD_LOCAL_Y = 1.02;
/** Local Y of the plush seat (body underside) above the grounded body origin. */
const PLUSH_SEAT_LOCAL_Y = 0.1;

export function seatTopAt(
  position: readonly [number, number, number],
): number | null {
  for (const zone of SEAT_ZONES) {
    if (
      position[0] >= zone.minX &&
      position[0] <= zone.maxX &&
      position[2] >= zone.minZ &&
      position[2] <= zone.maxZ
    ) {
      return zone.seatTop;
    }
  }
  return null;
}

export function museSeated(position: readonly [number, number, number]): boolean {
  return seatTopAt(position) !== null;
}

/** Vertical offset from the sim anchor down to the grounded plush origin. */
export function museGroundDrop(
  position: readonly [number, number, number],
): number {
  const seat = seatTopAt(position);
  if (seat !== null) {
    return seat + 0.015 - position[1] - PLUSH_SEAT_LOCAL_Y;
  }
  return 0.015 - position[1];
}

/** World Y of the plush head centre for a muse anchored at `position`. */
export function museHeadY(position: readonly [number, number, number]): number {
  return position[1] + museGroundDrop(position) + PLUSH_HEAD_LOCAL_Y;
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
    default:
      return assertNever(endpoint);
  }
}
