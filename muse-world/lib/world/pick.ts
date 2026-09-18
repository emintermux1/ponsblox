import { makeGrokEvent } from "@/lib/adapters/parse";
import { honestyFromLabel, SIM_GROK_SUMMARY } from "@/lib/adapters/source";
import { presetForMuse } from "@/lib/world/camera";
import type {
  GrokHonesty,
  GrokSource,
  GrokWakeState,
  MuseId,
  ScreenId,
  WorldSnapshot,
} from "@/types/world";
import { assertNever } from "@/types/world";

export type WakePayload = {
  woken?: unknown;
  pendingIngest?: unknown;
  reply?: {
    source?: unknown;
    summary?: unknown;
  };
};

export function emptyGrokWake(): GrokWakeState {
  return {
    phase: "idle",
    museId: null,
    source: null,
    honesty: null,
    summary: null,
    woken: false,
    pendingIngest: false,
  };
}

export function asGrokSource(value: unknown): GrokSource {
  switch (value) {
    case "bot":
    case "xai":
    case "sim":
      return value;
    default:
      return "sim";
  }
}

export function grokHonestyMark(source: GrokSource): GrokHonesty {
  return honestyFromLabel(source) === "real" ? "REAL" : "SIM";
}

export function applyMuseSelect(world: WorldSnapshot, id: MuseId | null): WorldSnapshot {
  return {
    ...world,
    selected: id,
    inspecting: null,
    mindOpen: id ? world.mindOpen : false,
    camera: id ? presetForMuse(id) : "ROOM",
  };
}

export function applyScreenInspect(
  world: WorldSnapshot,
  id: ScreenId | null,
): WorldSnapshot {
  if (!id) {
    return { ...world, inspecting: null };
  }
  return {
    ...world,
    inspecting: id,
    mindOpen: false,
    camera: "TRADER",
  };
}

export function applyGrokFocus(world: WorldSnapshot, museId: MuseId): WorldSnapshot {
  return {
    ...world,
    selected: null,
    inspecting: null,
    mindOpen: false,
    camera: "GROK",
    grokWake: {
      ...emptyGrokWake(),
      phase: "waking",
      museId,
    },
  };
}

export function applyGrokWake(
  world: WorldSnapshot,
  payload: WakePayload | null,
  museId: MuseId,
  now = Date.now(),
): WorldSnapshot {
  const source = asGrokSource(payload?.reply?.source);
  const honesty = grokHonestyMark(source);
  const raw = typeof payload?.reply?.summary === "string" ? payload.reply.summary.trim() : "";
  const summary = raw || SIM_GROK_SUMMARY;
  const woken = payload?.woken === true;
  const pendingIngest = payload?.pendingIngest === true;
  const muse = world.muses[museId];
  const kind = source === "xai" ? "GROK_RESPONSE" : "GROK_REQUESTED";
  return {
    ...world,
    camera: "GROK",
    inspecting: null,
    grokWake: {
      phase: "done",
      museId,
      source,
      honesty,
      summary,
      woken,
      pendingIngest,
    },
    muses: {
      ...world.muses,
      [museId]: {
        ...muse,
        mind: {
          ...muse.mind,
          grok: summary,
          nodes: {
            ...muse.mind.nodes,
            GROK: source === "xai" ? 0.55 : 0.72,
          },
        },
      },
    },
    events: [
      makeGrokEvent({
        kind,
        museId,
        museName: muse.name,
        source,
        summary,
        now,
      }),
      ...world.events,
    ].slice(0, 24),
  };
}

export function inspectCopy(
  world: WorldSnapshot,
  id: ScreenId,
): { title: string; lines: string[] } {
  switch (id) {
    case "tape": {
      const trader = world.muses.trader;
      return {
        title: "Tape",
        lines: [
          trader.mind.watching
            ? "looking, without an outside name"
            : "the tape is lit. no outside name.",
          `ACT ${trader.mind.action}`,
        ],
      };
    }
    case "notes": {
      const builder = world.muses.builder;
      const memory = builder.mind.memory.trim();
      const lines: string[] = [];
      if (memory && memory !== "nothing sticky") {
        lines.push(memory);
      }
      if (builder.mind.goal.trim()) {
        lines.push(builder.mind.goal);
      }
      return {
        title: "Notes",
        lines: lines.length > 0 ? lines : ["the desk is lit. no card yet."],
      };
    }
    default:
      return assertNever(id);
  }
}
