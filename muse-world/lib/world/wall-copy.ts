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
const COT_MARK =
  /\b(because|therefore|firstly|secondly|step\s+\d|chain of thought|let me think|as an ai|reasoning)\b/i;
const SMASHED_TOKEN =
  /(thesisforming|samestructure|threadthis|scrollerwaitit|catecoinleaned|laterer|builderder|waitit)/i;
const SMASHED_TAIL = /(leaned|forming|waitit|laterer)$/i;
const FAKE_GROK = /\b(REAL note|SIM hush)\b/i;
const SIM_GROK_MARK = /no grok key|sim context|waiting on ingest/i;

/** Curated literary SIM thoughts. One readable sentence, spaces required. */
export const WALL_NOTES = [
  "the tape feels loud tonight",
  "don't pin a name we don't know",
  "the room is holding its breath",
  "leave the thin book closed",
  "nothing here wants a ticker",
  "the window knows more than us",
  "keep the thesis in pencil",
  "quiet money, quieter room",
  "we can wait out the noise",
  "the feed is a soft lie",
  "pin the feeling, not the name",
  "later is a kind of answer",
  "the loft is thinking in ink",
  "same story, softer ending",
  "nobody asked for a headline",
  "the chair remembers the hush",
  "let the candle keep the time",
  "a good note does not shout",
  "the paper can hold a maybe",
  "not every spike is a thought",
  "the night is doing the work",
  "fold the rumor, keep the rest",
  "we owe the wall an honest line",
  "the loft prefers a slow yes",
] as const;

/** Who is scrolling, trading, or building — never smashed role+verb. */
export const STATE_WALL_LINES = [
  "Scroller is still on the feed",
  "Trader is watching the tape",
  "Builder keeps a pencil ready",
  "Chill is right. wait.",
  "someone is scrolling too hard",
  "the desk is trading in quiet",
  "Builder will pin it if it lasts",
  "Chill lets the room stay soft",
] as const;

export const WALL_ROTATE_MS_MIN = 8_000;
export const WALL_ROTATE_MS_MAX = 14_000;
export const WALL_FRESH_MS = 14_000;
export const WALL_LINE_WORD_MAX = 10;
export const WALL_LINE_CHAR_MAX = 42;
export const WALL_INK_WRAP_CHARS = 22;

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

export function looksLikeSmashedEnglish(token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return false;
  }
  if (SMASHED_TOKEN.test(trimmed)) {
    return true;
  }
  if (SMASHED_TAIL.test(trimmed) && trimmed.length > 8) {
    return true;
  }
  return /[a-z][A-Z]/.test(trimmed) && trimmed.length >= 8;
}

export function isSmashedWallLine(text: string): boolean {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return false;
  }
  if (!/\s/.test(trimmed) && looksLikeSmashedEnglish(trimmed)) {
    return true;
  }
  return trimmed.split(" ").some((word) => looksLikeSmashedEnglish(word));
}

export function isReadableWallSentence(text: string): boolean {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed.length > WALL_LINE_CHAR_MAX) {
    return false;
  }
  if (!/\s/.test(trimmed)) {
    return false;
  }
  if (/\$/.test(trimmed) || isPaidTicker(trimmed) || isTickerSlopHeadline(trimmed)) {
    return false;
  }
  if (COT_MARK.test(trimmed) || FAKE_GROK.test(trimmed) || SIM_GROK_MARK.test(trimmed)) {
    return false;
  }
  if (isSmashedWallLine(trimmed)) {
    return false;
  }
  const words = trimmed.split(" ").filter(Boolean);
  return words.length >= 3 && words.length <= WALL_LINE_WORD_MAX;
}

export function wallNoteForSlot(slot: number): string {
  const index = ((slot % WALL_NOTES.length) + WALL_NOTES.length) % WALL_NOTES.length;
  return WALL_NOTES[index] ?? WALL_NOTES[0];
}

/** Visible wall / packet chrome. Never $PAID, PAID, or 2–5 letter ticker slop. */
export function wallCardText(label: string | null | undefined): string | null {
  if (!label) {
    return null;
  }
  const trimmed = label.replace(/\s+/g, " ").trim();
  if (!trimmed || isPaidTicker(trimmed) || isTickerSlopHeadline(trimmed)) {
    return null;
  }
  if (isSmashedWallLine(trimmed) || COT_MARK.test(trimmed) || FAKE_GROK.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function packetCardText(label: string | null | undefined): string | null {
  return wallCardText(label);
}

export function sanitizeWallPinLabel(label: string, slot: number): string {
  const pulse = pulseNameForWall(label);
  if (pulse) {
    return pulseSentence(pulse, slot) ?? wallNoteForSlot(slot);
  }
  return asReadableSentence(label) ?? wallNoteForSlot(slot);
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
      return "look once, then look away";
    case "thesis":
      return wallNoteForSlot(slot);
    case "ask_card":
      return "don't pin a name we don't know";
    case "share_builder":
      return "Builder should see this first";
    case "wave_chill":
      return "Chill is right. wait.";
    default:
      return assertNever(type);
  }
}

export function sanitizePacket(packet: SpatialPacket | null): SpatialPacket | null {
  if (!packet) {
    return null;
  }
  const label = asReadableSentence(packet.label) ?? packetNoteForBeat("share_builder", packet.slot ?? 0);
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

export function pulseProperNoun(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function pulseNameForWall(name: string | null | undefined): string | null {
  if (!name) {
    return null;
  }
  const cleaned = name.replace(DOLLAR_TICKER, "").replace(FILL_WORD, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || /\$/.test(cleaned) || isPaidTicker(cleaned) || isTickerSlopHeadline(cleaned)) {
    return null;
  }
  if (looksLikeSmashedEnglish(cleaned) || isSmashedWallLine(cleaned) || COT_MARK.test(cleaned)) {
    return null;
  }
  if (/\s/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

export function pulseSentence(name: string, salt = 0): string | null {
  const noun = pulseProperNoun(name);
  if (!noun || isPaidTicker(noun) || isTickerSlopHeadline(noun) || looksLikeSmashedEnglish(noun)) {
    return null;
  }
  const options = [
    `${noun} is all anyone is watching`,
    `${noun} is loud on the tape`,
    `don't pin ${noun} just yet`,
    `${noun} can wait until morning`,
    `don't rush ${noun}`,
    `${noun} can wait`,
  ].filter((line) => isReadableWallSentence(line));
  if (options.length === 0) {
    return null;
  }
  return options[((salt % options.length) + options.length) % options.length] ?? null;
}

export function clipWallLine(text: string): string {
  const cleaned = text
    .replace(DOLLAR_TICKER, "")
    .replace(FILL_WORD, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return "";
  }
  if (cleaned.length <= WALL_LINE_CHAR_MAX) {
    return cleaned;
  }
  const clauses = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (clauses.length >= 2) {
    const pair = `${clauses[0]} ${clauses[1]}`.trim();
    if (pair.length <= WALL_LINE_CHAR_MAX) {
      return pair;
    }
    if (clauses[0] && clauses[0].length <= WALL_LINE_CHAR_MAX) {
      return clauses[0];
    }
  }
  const words = cleaned.split(" ").filter((word) => word && !/^[—\u2013\u2014-]+$/.test(word));
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > WALL_LINE_CHAR_MAX) {
      break;
    }
    line = next;
  }
  return line;
}

export function wrapWallInk(
  text: string,
  measure?: (line: string) => number,
  maxWidth = WALL_INK_WRAP_CHARS,
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

function asReadableSentence(value: string | null | undefined): string | null {
  const clipped = value ? clipWallLine(value) : "";
  const text = wallCardText(clipped);
  if (!text || !isReadableWallSentence(text)) {
    return null;
  }
  return text;
}

function wallRoleName(muse: Pick<MuseState, "id" | "name">): string | null {
  switch (muse.id) {
    case "scroller":
      return "Scroller";
    case "trader":
      return "Trader";
    case "chill":
      return "Chill";
    case "builder":
      return "Builder";
    default:
      return assertNever(muse.id);
  }
}

function activitySentence(name: string, activity: MuseActivity): string {
  switch (activity) {
    case "IDLE":
      return `${name} is letting it sit`;
    case "WALKING":
      return `${name} is crossing the loft`;
    case "SCROLLING":
      return `${name} is still on the feed`;
    case "THINKING":
      return `${name} is thinking it through`;
    case "RESEARCHING":
      return `${name} keeps a pencil ready`;
    case "TALKING":
      return `${name} is talking it out`;
    case "WATCHING":
      return `${name} is watching the room`;
    case "TRADING":
      return `${name} is watching the tape`;
    case "CHILLING":
      return `${name} is right. wait.`;
    case "SMOKING":
      return `${name} is at the window`;
    case "REACTING":
      return `${name} just felt the room`;
    default:
      return assertNever(activity);
  }
}

function stateAwareLines(muses: WallCopySource["muses"]): string[] {
  const lines: string[] = [];
  for (const muse of muses) {
    const name = wallRoleName(muse);
    if (!name || NUMBERED_MUSE.test(name)) {
      continue;
    }
    pushUnique(lines, activitySentence(name, muse.activity));
  }
  for (const line of STATE_WALL_LINES) {
    pushUnique(lines, line);
  }
  return lines.slice(0, 8);
}

function grokLine(honesty: GrokHonesty | null, summary: string | null): string | null {
  switch (honesty) {
    case "REAL": {
      const raw = summary?.replace(/^no Grok key\s*[—\u2013\u2014-]\s*/i, "").trim() ?? "";
      if (!raw || SIM_GROK_MARK.test(raw) || COT_MARK.test(raw)) {
        return null;
      }
      return asReadableSentence(raw);
    }
    case "SIM":
    case null:
      return null;
    default:
      return assertNever(honesty);
  }
}

function pulseLine(name: string | null, salt = 0): string | null {
  const safe = pulseNameForWall(name);
  if (!safe) {
    return null;
  }
  return pulseSentence(safe, salt);
}

function pushUnique(pool: string[], line: string | null): void {
  const safe = asReadableSentence(line);
  if (!safe || pool.includes(safe)) {
    return;
  }
  pool.push(safe);
}

function placePulse(lines: string[], pulse: string | null, reserved: Set<number>): void {
  if (!pulse || lines.includes(pulse)) {
    return;
  }
  for (let slot = lines.length - 1; slot >= 0; slot -= 1) {
    if (!reserved.has(slot)) {
      lines[slot] = pulse;
      return;
    }
  }
}

export function livingWallLines(source: WallCopySource): string[] {
  const count = Math.min(10, Math.max(6, source.count));
  const pulse = pulseLine(source.pulseName ?? rememberedPulseName, source.now);
  const pool: string[] = [];
  pushUnique(pool, pulse);
  for (const line of stateAwareLines(source.muses)) {
    pushUnique(pool, line);
  }
  pushUnique(pool, grokLine(source.grokHonesty, source.grokSummary));
  for (const note of WALL_NOTES) {
    pushUnique(pool, note);
  }
  if (pool.length === 0) {
    pushUnique(pool, WALL_NOTES[0]);
  }

  const bySlot = new Map<number, WallPin>();
  for (const pin of source.pins) {
    bySlot.set(pin.slot, pin);
  }

  const reserved = new Set<number>();
  const lines: string[] = [];
  for (let slot = 0; slot < count; slot += 1) {
    const pin = bySlot.get(slot);
    if (pin && isFreshWallPin(pin, source.now)) {
      reserved.add(slot);
      lines.push(asReadableSentence(pin.label) ?? wallNoteForSlot(slot));
      continue;
    }
    const tick = wallRotateTick(source.now, slot);
    const pick = pool[(slot + tick * 3) % pool.length] ?? wallNoteForSlot(slot);
    lines.push(asReadableSentence(pick) ?? wallNoteForSlot(slot));
  }
  placePulse(lines, pulse, reserved);
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
