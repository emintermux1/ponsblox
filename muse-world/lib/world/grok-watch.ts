import { asCaption, mostAwakeId } from "@/components/watch/copy";
import type {
  GrokHonesty,
  MuseActivity,
  MuseId,
  MuseState,
  SpatialPacket,
  WorldSnapshot,
} from "@/types/world";
import { assertNever, isMuseId } from "@/types/world";

export const ASK_GROK = "ask Grok";

function isDeskChatActivity(activity: MuseActivity): boolean {
  switch (activity) {
    case "TRADING":
    case "RESEARCHING":
    case "WATCHING":
    case "THINKING":
      return true;
    case "IDLE":
    case "WALKING":
    case "SCROLLING":
    case "TALKING":
    case "CHILLING":
    case "SMOKING":
    case "REACTING":
      return false;
    default:
      return assertNever(activity);
  }
}

function deskInChat(muse: MuseState): boolean {
  switch (muse.id) {
    case "trader":
    case "builder":
      return isDeskChatActivity(muse.activity);
    case "scroller":
    case "chill":
      return false;
    default:
      return assertNever(muse.id);
  }
}

export function inChatMuseId(world: WorldSnapshot): MuseId | null {
  if (world.grokWake.museId && world.grokWake.phase !== "idle") {
    return world.grokWake.museId;
  }
  if (world.packet && (world.packet.to === "grok" || world.packet.from === "grok")) {
    const other = world.packet.to === "grok" ? world.packet.from : world.packet.to;
    if (isMuseId(other)) {
      return other;
    }
  }
  const trader = deskInChat(world.muses.trader);
  const builder = deskInChat(world.muses.builder);
  if (trader && builder) {
    return world.muses.trader.mind.nodes.GROK >= world.muses.builder.mind.nodes.GROK
      ? "trader"
      : "builder";
  }
  if (trader) {
    return "trader";
  }
  if (builder) {
    return "builder";
  }
  return null;
}

export function grokAttendId(world: WorldSnapshot): MuseId {
  return inChatMuseId(world) ?? world.selected ?? mostAwakeId(world);
}

export function grokLookAt(world: WorldSnapshot): [number, number, number] {
  const muse = world.muses[grokAttendId(world)];
  return [muse.position[0], muse.position[1] + 0.82, muse.position[2]];
}

export function grokCompanyLine(world: WorldSnapshot): string | null {
  if (world.grokWake.honesty !== "REAL" || !world.grokWake.museId) {
    return null;
  }
  return `Grok is with ${world.muses[world.grokWake.museId].name}`;
}

export function grokSupportCaption(world: WorldSnapshot): string {
  if (world.grokWake.phase === "waking") {
    return "waking";
  }
  if (world.grokWake.honesty === "REAL") {
    return asCaption(world.grokWake.summary) ?? "";
  }
  return "";
}

export function grokAskPacket(museId: MuseId, now: number): SpatialPacket {
  return {
    from: museId,
    to: "grok",
    label: "ask",
    t: now,
    kind: "NOTE",
  };
}

export function grokWakePacket(
  museId: MuseId,
  honesty: GrokHonesty,
  now: number,
): SpatialPacket {
  switch (honesty) {
    case "REAL":
      return {
        from: "grok",
        to: museId,
        label: "note",
        t: now,
        kind: "NOTE",
      };
    case "SIM":
      return grokAskPacket(museId, now);
    default:
      return assertNever(honesty);
  }
}
