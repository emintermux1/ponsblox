import { isPaidTicker } from "@/lib/adapters/parse";
import type {
  GrokHonesty,
  MuseActivity,
  MuseId,
  MuseState,
  SpatialPacket,
  WallPin,
  WorldSnapshot,
} from "@/types/world";
import { assertNever, MUSE_IDS } from "@/types/world";

export { isPaidTicker };

const TICKER_SLOP = /^\$?[A-Z]{2,5}$/;
const NUMBERED_MUSE = /muse\s*0*\d+/i;
const DOLLAR_TICKER = /\$[A-Za-z]{2,10}/g;
const FILL_WORD = /\bfills?\b/gi;

export const WALL_NOTES = [
  "the tape leaned",
  "let it go",
  "same structure",
  "thin book",
  "later",
] as const;

export const WALL_ROTATE_MS_MIN = 8_000;
export const WALL_ROTATE_MS_MAX = 14_000;
export const WALL_FRESH_MS = 14_000;
export const WALL_LINE_WORD_MAX = 4;
export const WALL_LINE_CHAR_MAX = 36;

const ROOM_NOTES = [
  "room hush",
  "window watch",
  "thread this",
  "thesis forming",
  "card it",
] as const;

let rememberedPulseName: string | null = null;

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

export function resetPulseNameForTests(): void {
  rememberedPulseName = null;
}

export function rememberPulseName(name: string | null | undefined): string | null {
  rememberedPulseName = pulseNameForWall(name);
  return rememberedPulseName;
}

export function currentPulseName(): string | null {
  return rememberedPulseName;
}

export function pulseNameForWall(name: string | null | undefined): string | null {
  if (!name) {
    return null;
  }
  const cleaned = name.replace(DOLLAR_TICKER, "").replace(FILL_WORD, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || /\$/.test(cleaned) || isPaidTicker(cleaned) || isTickerSlopHeadline(cleaned)) {
    return null;
  }
  return wallCardText(cleaned);
}

export function clipWallLine(text: string): string {
  const cleaned = text
    .replace(DOLLAR_TICKER, "")
    .replace(FILL_WORD, " ")
    .replace(/\s+/g, " ")
    .trim();
  const sentence = (cleaned.split(/[.!?]/)[0] ?? cleaned).trim();
  const words = sentence.split(" ").filter((word) => word && !/^[—\u2013\u2014-]+$/.test(word));
  if (words.length === 0) {
    return "";
  }
  const clipped =
    words.length <= WALL_LINE_WORD_MAX
      ? words.join(" ")
      : words.slice(0, WALL_LINE_WORD_MAX).join(" ");
  if (clipped.length <= WALL_LINE_CHAR_MAX) {
    return clipped;
  }
  return words.slice(0, Math.max(2, WALL_LINE_WORD_MAX - 1)).join(" ");
}

export function wrapWallInk(
  text: string,
  measure?: (line: string) => number,
  maxWidth = 22,
): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const fits = (line: string): boolean => {
    if (measure) {
      return measure(line) <= maxWidth;
    }
    return line.length <= maxWidth;
  };
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && !fits(next)) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.slice(0, 3);
}

export function wallRotateMs(slot: number): number {
  const span = WALL_ROTATE_MS_MAX - WALL_ROTATE_MS_MIN;
  return WALL_ROTATE_MS_MIN + ((((slot % 8) + 8) * 1663) % (span + 1));
}

export function wallRotateTick(now: number, slot: number): number {
  return Math.floor(now / wallRotateMs(slot));
}

export function isFreshWallPin(pin: WallPin, now: number): boolean {
  return now - pin.at >= 0 && now - pin.at < WALL_FRESH_MS;
}

export type WallCopySource = {
  pins: WallPin[];
  muses: Pick<MuseState, "id" | "name" | "activity" | "thought">[];
  grokHonesty: GrokHonesty | null;
  grokSummary: string | null;
  pulseName: string | null;
  now: number;
  count: number;
};

function activityVerb(activity: MuseActivity): string {
  switch (activity) {
    case "IDLE":
      return "quiet";
    case "WALKING":
      return "crossing";
    case "SCROLLING":
      return "scrolling";
    case "THINKING":
      return "thinking";
    case "RESEARCHING":
      return "threading";
    case "TALKING":
      return "talking";
    case "WATCHING":
      return "watching";
    case "TRADING":
      return "at the tape";
    case "CHILLING":
      return "later";
    case "SMOKING":
      return "window";
    case "REACTING":
      return "reacting";
    default:
      return assertNever(activity);
  }
}

function safeLine(value: string | null | undefined, slot: number): string {
  const clipped = value ? clipWallLine(value) : "";
  return wallCardText(clipped) ?? wallNoteForSlot(slot);
}

function museLine(muse: Pick<MuseState, "name" | "activity" | "thought">): string | null {
  const name = muse.name.trim();
  if (!name || NUMBERED_MUSE.test(name) || isTickerSlopHeadline(name) || isPaidTicker(name)) {
    return null;
  }
  const thought = wallCardText(muse.thought);
  if (thought) {
    const words = clipWallLine(thought).split(" ").filter(Boolean);
    if (words.length > 0 && words.length <= 3) {
      return wallCardText(clipWallLine(`${name} ${words.join(" ")}`));
    }
  }
  return wallCardText(clipWallLine(`${name} ${activityVerb(muse.activity)}`));
}

function grokLine(honesty: GrokHonesty | null, summary: string | null): string | null {
  const raw = summary?.replace(/^no Grok key\s*[—\u2013\u2014-]\s*/i, "").trim() ?? "";
  const body = raw ? wallCardText(clipWallLine(raw)) : null;
  if (body) {
    return body;
  }
  switch (honesty) {
    case "REAL":
      return "REAL note";
    case "SIM":
      return "SIM hush";
    case null:
      return null;
    default:
      return assertNever(honesty);
  }
}

function pulseLine(name: string | null): string | null {
  const safe = pulseNameForWall(name);
  if (!safe) {
    return null;
  }
  const words = safe.split(" ").filter(Boolean);
  if (words.length >= 2) {
    return wallCardText(clipWallLine(safe));
  }
  return wallCardText(clipWallLine(`${safe} leaned`));
}

function pushUnique(pool: string[], line: string | null): void {
  const safe = line ? wallCardText(clipWallLine(line)) : null;
  if (!safe || pool.includes(safe)) {
    return;
  }
  pool.push(safe);
}

export function livingWallLines(source: WallCopySource): string[] {
  const count = Math.min(10, Math.max(6, source.count));
  const pool: string[] = [];
  for (const muse of source.muses) {
    pushUnique(pool, museLine(muse));
  }
  pushUnique(pool, grokLine(source.grokHonesty, source.grokSummary));
  pushUnique(pool, pulseLine(source.pulseName ?? rememberedPulseName));
  for (const note of WALL_NOTES) {
    pushUnique(pool, note);
  }
  for (const note of ROOM_NOTES) {
    pushUnique(pool, note);
  }
  if (pool.length === 0) {
    pushUnique(pool, WALL_NOTES[0]);
  }

  const bySlot = new Map<number, WallPin>();
  for (const pin of source.pins) {
    bySlot.set(pin.slot, pin);
  }

  const lines: string[] = [];
  for (let slot = 0; slot < count; slot += 1) {
    const pin = bySlot.get(slot);
    if (pin && isFreshWallPin(pin, source.now)) {
      lines.push(safeLine(pin.label, slot));
      continue;
    }
    const tick = wallRotateTick(source.now, slot);
    const pick = pool[(slot + tick * 3) % pool.length] ?? wallNoteForSlot(slot);
    lines.push(safeLine(pick, slot));
  }
  return lines;
}

export function wallCopyFromWorld(world: WorldSnapshot, now: number, count: number): string[] {
  return livingWallLines({
    pins: world.wallPins ?? [],
    muses: MUSE_IDS.map((id: MuseId) => world.muses[id]),
    grokHonesty: world.grokWake.honesty,
    grokSummary: world.grokWake.summary,
    pulseName: currentPulseName(),
    now,
    count,
  });
}
