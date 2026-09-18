import {
  loftCaptionFromText,
  SIM_LITERARY_STUBS,
} from "@/lib/adapters/parse";
import { isSimGrokText } from "@/lib/world/cast";
import { formatChange, type TapeView } from "@/lib/world/tape";
import type { GrokSource, GrokWakeState, WorldEvent, WorldEventKind } from "@/types/world";
import { assertNever } from "@/types/world";

export const FEED_CARD_H = 232;

export type StoryRing = {
  handle: string;
  hue: string;
};

export type FeedCard = {
  handle: string;
  title: string;
  body: string;
  wash: string;
};

export type GrokBubble = {
  role: "muse" | "grok";
  mark: "REAL" | "SIM";
  text: string;
};

export type GrokChatView = {
  honesty: "REAL" | "SIM";
  header: string;
  bubbles: readonly GrokBubble[];
};

const RINGS: readonly StoryRing[] = [
  { handle: "loft", hue: "#e8c56a" },
  { handle: "tape", hue: "#7ec8b0" },
  { handle: "hush", hue: "#c9ae7a" },
  { handle: "desk", hue: "#d8c6a6" },
  { handle: "night", hue: "#9bb6c8" },
];

const WASHES = ["#3a2a1c", "#2a2420", "#32281e", "#241e1a", "#2c261c"] as const;

/** Room tape / SIM social — not Instagram official, not Snapchat. */
export function simSocialMark(): string {
  return "SIM social";
}

export function storyRings(): readonly StoryRing[] {
  return RINGS;
}

export function feedCards(tape: TapeView): FeedCard[] {
  const rows = tape.rows.filter((row) => row.ticker);
  if (rows.length > 0) {
    return rows.map((row, index) => ({
      handle: RINGS[index % RINGS.length]?.handle ?? "loft",
      title: row.ticker,
      body: formatChange(row.changePct) ?? "room tape",
      wash: WASHES[index % WASHES.length] ?? "#2a2420",
    }));
  }
  return SIM_LITERARY_STUBS.map((stub, index) => ({
    handle: RINGS[index % RINGS.length]?.handle ?? "loft",
    title: stub,
    body: "room tape",
    wash: WASHES[index % WASHES.length] ?? "#2a2420",
  }));
}

export function feedScrollOffset(nowMs: number): number {
  const loop = FEED_CARD_H * Math.max(1, SIM_LITERARY_STUBS.length);
  const travel = ((nowMs % (loop * 80)) * 0.045 + loop) % loop;
  return travel;
}

export function feedCardY(index: number, scrollY: number, count: number): number {
  const loop = Math.max(1, count) * FEED_CARD_H;
  let y = index * FEED_CARD_H - (scrollY % loop);
  if (y < -FEED_CARD_H) {
    y += loop;
  }
  return y;
}

function isRealGrokSource(source: GrokSource | WorldEvent["source"]): boolean {
  switch (source) {
    case "bot":
    case "xai":
      return true;
    case "sim":
    case "world":
      return false;
    default:
      return assertNever(source);
  }
}

function isGrokResponse(kind: WorldEventKind): boolean {
  switch (kind) {
    case "GROK_RESPONSE":
      return true;
    case "GROK_REQUESTED":
    case "TREND_SPIKE":
    case "NEW_DISCOVERY":
    case "POSITION_OPENED":
    case "POSITION_CLOSED":
    case "THESIS_CREATED":
    case "VIRAL_POST":
    case "BOREDOM":
    case "SOCIAL_REACTION":
      return false;
    default:
      return assertNever(kind);
  }
}

function captionFromEventText(text: string): string | null {
  const parts = text.split(" · ");
  const raw = parts.length > 1 ? parts.slice(1).join(" · ") : text;
  if (isSimGrokText(raw) || isSimGrokText(text)) {
    return null;
  }
  return loftCaptionFromText(raw);
}

export function lastRealGrokCaption(
  events: readonly WorldEvent[],
  wake: GrokWakeState,
): string | null {
  if (wake.honesty === "REAL" && wake.source && isRealGrokSource(wake.source) && wake.summary) {
    if (!isSimGrokText(wake.summary)) {
      const fromWake = loftCaptionFromText(wake.summary);
      if (fromWake) {
        return fromWake;
      }
    }
  }
  for (const event of events) {
    if (!isGrokResponse(event.kind) || !isRealGrokSource(event.source)) {
      continue;
    }
    const caption = captionFromEventText(event.text);
    if (caption) {
      return caption;
    }
  }
  return null;
}

export function emptyGrokChat(): GrokChatView {
  return {
    honesty: "SIM",
    header: "Grok / xAI · SIM",
    bubbles: SIM_LITERARY_STUBS.slice(0, 3).map((stub) => ({
      role: "grok" as const,
      mark: "SIM" as const,
      text: stub,
    })),
  };
}

export function grokChatView(
  events: readonly WorldEvent[],
  wake: GrokWakeState,
  _now = Date.now(),
): GrokChatView {
  const real = lastRealGrokCaption(events, wake);
  if (real) {
    return {
      honesty: "REAL",
      header: "Grok / xAI · REAL",
      bubbles: [{ role: "grok", mark: "REAL", text: real }],
    };
  }
  return emptyGrokChat();
}
