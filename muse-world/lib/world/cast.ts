import type {
  MuseId,
  PacketEndpoint,
  WorldEvent,
  WorldEventKind,
} from "@/types/world";
import { assertNever } from "@/types/world";

export const GROK_NAME = "GROK";
export const GROK_ROLE = "tool";
export const GROK_PORTRAIT = "/cast/grok.jpg";

export type CastCard = {
  name: string;
  role: string;
  portrait: string;
  focus: string;
};

export const CAST: Record<MuseId, CastCard> = {
  scroller: {
    name: "Euterpe",
    role: "SCROLLER",
    portrait: "/muse/muse-plush.jpg",
    focus: "center 18%",
  },
  trader: {
    name: "Urania",
    role: "TRADER",
    portrait: "/muse/muse-plush.jpg",
    focus: "center 22%",
  },
  chill: {
    name: "Thalia",
    role: "CHILL",
    portrait: "/muse/muse-plush.jpg",
    focus: "center 28%",
  },
  builder: {
    name: "Calliope",
    role: "BUILDER",
    portrait: "/muse/muse-plush-halo.jpg",
    focus: "center 20%",
  },
};

export type GrokPresence = "LIVE" | "SIM";

export function museName(id: MuseId): string {
  return CAST[id].name;
}

export function museRole(id: MuseId): string {
  return CAST[id].role;
}

export function castName(id: MuseId): string {
  switch (id) {
    case "scroller":
      return CAST.scroller.name;
    case "trader":
      return CAST.trader.name;
    case "chill":
      return CAST.chill.name;
    case "builder":
      return CAST.builder.name;
    default:
      return assertNever(id);
  }
}

export function castPortrait(id: MuseId): string {
  switch (id) {
    case "scroller":
      return CAST.scroller.portrait;
    case "trader":
      return CAST.trader.portrait;
    case "chill":
      return CAST.chill.portrait;
    case "builder":
      return CAST.builder.portrait;
    default:
      return assertNever(id);
  }
}

export function castFocus(id: MuseId): string {
  switch (id) {
    case "scroller":
      return CAST.scroller.focus;
    case "trader":
      return CAST.trader.focus;
    case "chill":
      return CAST.chill.focus;
    case "builder":
      return CAST.builder.focus;
    default:
      return assertNever(id);
  }
}

export function isNumberedMuseName(name: string): boolean {
  return /muse\s*0*\d+/i.test(name.trim());
}

export function endpointName(endpoint: PacketEndpoint): string {
  switch (endpoint) {
    case "scroller":
    case "trader":
    case "chill":
    case "builder":
      return museName(endpoint);
    case "wall":
      return "wall";
    case "grok":
      return GROK_NAME;
    default:
      return assertNever(endpoint);
  }
}

export function packetLine(from: PacketEndpoint, to: PacketEndpoint, label: string): string {
  const note = label.trim();
  if (!note) {
    return `${endpointName(from)} → ${endpointName(to)}`;
  }
  return `${endpointName(from)} → ${endpointName(to)} · ${note}`;
}

function isGrokKind(kind: WorldEventKind): boolean {
  switch (kind) {
    case "GROK_REQUESTED":
    case "GROK_RESPONSE":
      return true;
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

function isRealGrokSource(source: WorldEvent["source"]): boolean {
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

export function grokPresence(events: WorldEvent[]): GrokPresence {
  for (const event of events) {
    if (isGrokKind(event.kind) && isRealGrokSource(event.source)) {
      return "LIVE";
    }
  }
  return "SIM";
}

export function grokPresenceLabel(presence: GrokPresence): string {
  switch (presence) {
    case "LIVE":
      return "GROK LIVE";
    case "SIM":
      return "SIM";
    default:
      return assertNever(presence);
  }
}
