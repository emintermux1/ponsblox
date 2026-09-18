import { cleanTicker } from "@/lib/adapters/parse";
import { PACKET_HOLD_MS, WALL_SLOT_COUNT } from "@/lib/world/layout";
import { sanitizeWallPinLabel } from "@/lib/world/wall-copy";
import type {
  MuseId,
  MuseState,
  SpatialPacket,
  WallPin,
  WorldEvent,
  WorldEventKind,
} from "@/types/world";

export const STORY_COOLDOWN_MS = {
  NEW_DISCOVERY: 18_000,
  THESIS_CREATED: 24_000,
  SOCIAL_REACTION: 22_000,
  BOREDOM: 32_000,
} as const;

export type StoryBeat =
  | { type: "discovery"; ticker: string }
  | { type: "thesis"; ticker: string; slot: number }
  | { type: "ask_card"; ticker: string }
  | { type: "share_builder"; ticker: string }
  | { type: "wave_chill"; ticker: string }
  | { type: "boredom"; ticker: string | null };

export type StoryInput = {
  muses: Record<MuseId, MuseState>;
  events: WorldEvent[];
  packet: SpatialPacket | null;
  wallPins: WallPin[];
  spiked: boolean;
  pulseTicker: string | null;
  now: number;
  random: () => number;
};

export function cooled(
  events: WorldEvent[],
  kind: WorldEventKind,
  windowMs: number,
  now: number,
): boolean {
  return !events.some((event) => event.kind === kind && now - event.at < windowMs);
}

export function packetLive(packet: SpatialPacket | null, now: number): boolean {
  return Boolean(packet && now - packet.t < PACKET_HOLD_MS);
}

export function nextWallSlot(pins: WallPin[]): number {
  for (let slot = 0; slot < WALL_SLOT_COUNT; slot += 1) {
    if (!pins.some((pin) => pin.slot === slot)) {
      return slot;
    }
  }
  return pins.reduce((oldest, pin) => (pin.at < oldest.at ? pin : oldest), pins[0]!).slot;
}

export function upsertWallPin(pins: WallPin[], label: string, slot: number, now: number): WallPin[] {
  const safe = sanitizeWallPinLabel(label, slot);
  const pin: WallPin = {
    id: `pin_${now.toString(36)}_${safe.toLowerCase().replace(/\s+/g, "_")}`,
    label: safe,
    slot,
    at: now,
  };
  return [...pins.filter((item) => item.slot !== slot), pin].slice(-WALL_SLOT_COUNT);
}

export function storySubject(
  pulseTicker: string | null,
  muses: Record<MuseId, MuseState>,
): string | null {
  return (
    cleanTicker(pulseTicker) ??
    cleanTicker(muses.trader.mind.watching) ??
    cleanTicker(muses.scroller.mind.watching)
  );
}

export function pickStoryBeat(input: StoryInput): StoryBeat | null {
  const { muses, events, packet, wallPins, spiked, pulseTicker, now, random } = input;
  const busy = packetLive(packet, now);
  const subject = storySubject(pulseTicker, muses);

  if (
    subject &&
    spiked &&
    !busy &&
    cooled(events, "NEW_DISCOVERY", STORY_COOLDOWN_MS.NEW_DISCOVERY, now) &&
    random() < 0.38
  ) {
    return { type: "discovery", ticker: subject };
  }

  if (
    subject &&
    muses.builder.activity === "RESEARCHING" &&
    !busy &&
    cooled(events, "THESIS_CREATED", STORY_COOLDOWN_MS.THESIS_CREATED, now) &&
    random() < 0.22
  ) {
    return { type: "thesis", ticker: subject, slot: nextWallSlot(wallPins) };
  }

  if (
    subject &&
    muses.trader.mind.watching === subject &&
    muses.builder.activity === "RESEARCHING" &&
    !busy &&
    cooled(events, "SOCIAL_REACTION", STORY_COOLDOWN_MS.SOCIAL_REACTION, now) &&
    random() < 0.16
  ) {
    return { type: "ask_card", ticker: subject };
  }

  if (
    subject &&
    muses.scroller.mind.nodes.ATTENTION > 0.45 &&
    !busy &&
    cooled(events, "SOCIAL_REACTION", STORY_COOLDOWN_MS.SOCIAL_REACTION, now) &&
    random() < 0.12
  ) {
    return { type: "share_builder", ticker: subject };
  }

  if (
    subject &&
    muses.chill.mind.nodes.BOREDOM > 0.55 &&
    !busy &&
    cooled(events, "SOCIAL_REACTION", STORY_COOLDOWN_MS.SOCIAL_REACTION, now) &&
    random() < 0.12
  ) {
    return { type: "wave_chill", ticker: subject };
  }

  if (
    muses.chill.mind.nodes.BOREDOM > 0.72 &&
    cooled(events, "BOREDOM", STORY_COOLDOWN_MS.BOREDOM, now) &&
    random() < 0.28
  ) {
    return { type: "boredom", ticker: subject };
  }

  return null;
}
