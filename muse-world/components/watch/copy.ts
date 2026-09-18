import { grokPresence } from "@/lib/world/cast";
import { isPaidTicker, isTickerSlopHeadline } from "@/lib/world/wall-copy";
import type {
  CameraPreset,
  MuseActivity,
  MuseId,
  WorldEvent,
  WorldEventKind,
  WorldSnapshot,
} from "@/types/world";
import { assertNever, MUSE_IDS } from "@/types/world";

export const WORDMARK = "Muse Grok";
export const WORLD_MARK = "musegrok.world";
export const SITE_ORIGIN = "https://musegrok.world";
export const PAGE_DESCRIPTION = "Euterpe, Urania, Thalia, Calliope and GROK in a living loft.";
export const FIRST_PAINT_MS = 3000;
export const ENTRY_CAPTION = "the penthouse is occupied";
export const INTRO_COPY = [
  WORDMARK,
  "They don't wait for prompts",
  "Watch them live.",
] as const;
export const ENTER_MIND = "mind";
export const LEAVE_MIND = "close";
export const MIND_HINT = "mind";
export const EMPTY_ROOM = "the loft has not spoken";
export const EMPTY_SELECTION = "watch";

export const ROOM_PRESETS: CameraPreset[] = [
  "ROOM",
  "LOUNGE",
  "TRADER",
  "BUILDER",
  "SCROLLER",
  "GROK",
];

const COT_MARK =
  /\b(because|therefore|firstly|secondly|step\s+\d|chain of thought|let me think|as an ai|reasoning)\b/i;

export function activityLine(activity: MuseActivity): string {
  switch (activity) {
    case "IDLE":
      return "still";
    case "WALKING":
      return "crossing the floor";
    case "SCROLLING":
      return "on the feed";
    case "THINKING":
      return "paused";
    case "RESEARCHING":
      return "at the desk";
    case "TALKING":
      return "speaking";
    case "WATCHING":
      return "looking";
    case "TRADING":
      return "at the tape";
    case "CHILLING":
      return "on the sofa";
    case "SMOKING":
      return "at the window";
    case "REACTING":
      return "turned";
    default:
      return assertNever(activity);
  }
}

export function isAwake(activity: MuseActivity): boolean {
  switch (activity) {
    case "IDLE":
    case "CHILLING":
    case "SMOKING":
      return false;
    case "WALKING":
    case "SCROLLING":
    case "THINKING":
    case "RESEARCHING":
    case "TALKING":
    case "WATCHING":
    case "TRADING":
    case "REACTING":
      return true;
    default:
      return assertNever(activity);
  }
}

export function locationLabel(preset: CameraPreset): string {
  switch (preset) {
    case "ROOM":
      return "Room";
    case "LOUNGE":
      return "Lounge";
    case "TRADER":
      return "Desk";
    case "BUILDER":
      return "Bench";
    case "SCROLLER":
      return "Window";
    case "GROK":
      return "Grok";
    case "MIND":
      return "Mind";
    default:
      return assertNever(preset);
  }
}

export function asCaption(thought: string | null): string | null {
  if (!thought) {
    return null;
  }
  const trimmed = thought.replace(/\s+/g, " ").trim();
  if (!trimmed || isPaidTicker(trimmed) || isTickerSlopHeadline(trimmed)) {
    return null;
  }
  if (trimmed.includes("\n") || COT_MARK.test(trimmed) || trimmed.length > 64) {
    const clause = trimmed.split(/[.!?;]/)[0]?.trim() ?? "";
    if (clause && clause.length <= 40 && !COT_MARK.test(clause)) {
      return clause;
    }
    return null;
  }
  return trimmed;
}

export function mostAwakeId(world: WorldSnapshot): MuseId {
  let best: MuseId = "chill";
  let score = -1;
  for (const id of MUSE_IDS) {
    const value = activityWeight(world.muses[id].activity);
    if (value > score) {
      score = value;
      best = id;
    }
  }
  return best;
}

function activityWeight(activity: MuseActivity): number {
  switch (activity) {
    case "RESEARCHING":
    case "TRADING":
      return 5;
    case "SCROLLING":
    case "THINKING":
    case "REACTING":
    case "TALKING":
      return 4;
    case "WATCHING":
      return 3;
    case "WALKING":
      return 2;
    case "SMOKING":
    case "CHILLING":
      return 1;
    case "IDLE":
      return 0;
    default:
      return assertNever(activity);
  }
}

function eventKindLine(kind: WorldEventKind): string {
  switch (kind) {
    case "TREND_SPIKE":
      return "something leaned";
    case "NEW_DISCOVERY":
      return "a name passed between them";
    case "GROK_REQUESTED":
      return "one of them reached for Grok";
    case "GROK_RESPONSE":
      return "a Grok note returned";
    case "POSITION_OPENED":
      return "a position was marked";
    case "POSITION_CLOSED":
      return "a position was released";
    case "THESIS_CREATED":
      return "a card was pinned";
    case "VIRAL_POST":
      return "the feed swelled";
    case "BOREDOM":
      return "one of them looked away";
    case "SOCIAL_REACTION":
      return "the room answered itself";
    default:
      return assertNever(kind);
  }
}

function isSimGrokText(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("no grok key") ||
    lower.includes("sim context") ||
    lower.includes("waiting on ingest")
  );
}

export function roomNote(event: WorldEvent | undefined): string {
  if (!event) {
    return EMPTY_ROOM;
  }
  switch (event.source) {
    case "sim":
      return "SIM — the room is speaking to itself";
    case "world":
      return eventKindLine(event.kind);
    case "bot":
      if (isSimGrokText(event.text)) {
        return "SIM — Grok Bot was not heard";
      }
      return "Grok Bot — a note returned";
    case "xai":
      if (isSimGrokText(event.text)) {
        return "SIM — xAI did not answer";
      }
      return "xAI — a short tool note";
    default:
      return assertNever(event.source);
  }
}

export function watchingLine(
  watching: string | null,
  streetTicker: string | null,
): string | null {
  if (!watching || isPaidTicker(watching) || isTickerSlopHeadline(watching)) {
    return watching ? "looking, without an outside name" : null;
  }
  if (
    streetTicker &&
    watching === streetTicker &&
    !isPaidTicker(streetTicker) &&
    !isTickerSlopHeadline(streetTicker)
  ) {
    return `held on ${watching}`;
  }
  return "looking, without an outside name";
}

export function hudMark(mark: "REAL" | "SIM" | "—"): "REAL" | "SIM" {
  return mark === "REAL" ? "REAL" : "SIM";
}

export function grokHonestyMark(events: WorldEvent[]): "GROK LIVE" | "SIM" {
  return grokPresence(events) === "LIVE" ? "GROK LIVE" : "SIM";
}

export function grokLine(grok: string): string | null {
  const trimmed = grok.trim();
  if (!trimmed || trimmed === "idle") {
    return null;
  }
  if (isSimGrokText(trimmed)) {
    return null;
  }
  return asCaption(trimmed);
}

export function latestCaption(world: WorldSnapshot): string | null {
  let newest: { text: string; until: number } | null = null;
  for (const id of MUSE_IDS) {
    const muse = world.muses[id];
    const text = asCaption(muse.thought);
    if (!text) {
      continue;
    }
    if (!newest || muse.thoughtUntil > newest.until) {
      newest = { text, until: muse.thoughtUntil };
    }
  }
  return newest?.text ?? null;
}
