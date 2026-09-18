import { isPaidTicker } from "@/lib/adapters/parse";
import type { SpatialPacket, WallPin } from "@/types/world";
import { assertNever } from "@/types/world";

export { isPaidTicker };

const TICKER_SLOP = /^\$?[A-Z]{2,5}$/;

export const WALL_NOTES = [
  "the tape leaned",
  "let it go",
  "same structure",
  "thin book",
  "later",
] as const;

export type PacketBeatNote = "discovery" | "thesis" | "ask_card" | "share_builder" | "wave_chill";

export function isTickerSlopHeadline(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  if (isPaidTicker(trimmed)) {
    return true;
  }
  return TICKER_SLOP.test(trimmed);
}

export function wallNoteForSlot(slot: number): string {
  const index = ((slot % WALL_NOTES.length) + WALL_NOTES.length) % WALL_NOTES.length;
  return WALL_NOTES[index] ?? "";
}

/** Visible wall / packet chrome. Never $PAID, PAID, or 2–5 letter ticker slop. */
export function wallCardText(label: string | null | undefined): string | null {
  if (!label) {
    return null;
  }
  const trimmed = label.trim();
  if (!trimmed || isPaidTicker(trimmed) || isTickerSlopHeadline(trimmed)) {
    return null;
  }
  return trimmed;
}

export function packetCardText(label: string | null | undefined): string | null {
  return wallCardText(label);
}

export function sanitizeWallPinLabel(label: string, slot: number): string {
  return wallCardText(label) ?? wallNoteForSlot(slot);
}

export function sanitizeWallPins(pins: WallPin[]): WallPin[] {
  return pins.map((pin) => ({
    ...pin,
    label: sanitizeWallPinLabel(pin.label, pin.slot),
  }));
}

export function packetNoteForBeat(type: PacketBeatNote, slot = 0): string {
  switch (type) {
    case "discovery":
      return "look";
    case "thesis":
      return wallNoteForSlot(slot);
    case "ask_card":
      return "card";
    case "share_builder":
      return "note";
    case "wave_chill":
      return "later";
    default:
      return assertNever(type);
  }
}

export function sanitizePacket(packet: SpatialPacket | null): SpatialPacket | null {
  if (!packet) {
    return null;
  }
  const label = packetCardText(packet.label) ?? "note";
  if (label === packet.label) {
    return packet;
  }
  return { ...packet, label };
}
