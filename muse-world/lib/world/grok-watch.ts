import { asCaption, mostAwakeId } from "@/components/watch/copy";
import { SIM_GROK_SUMMARY } from "@/lib/adapters/source";
import type {
  GrokHonesty,
  MuseId,
  SpatialPacket,
  WorldSnapshot,
} from "@/types/world";
import { assertNever } from "@/types/world";

export const ASK_GROK = "ask Grok";
export const SIM_GROK_STUB = SIM_GROK_SUMMARY;

export function grokAttendId(world: WorldSnapshot): MuseId {
  if (world.grokWake.museId) {
    return world.grokWake.museId;
  }
  if (world.selected) {
    return world.selected;
  }
  return mostAwakeId(world);
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
    const live = asCaption(world.grokWake.summary);
    if (live) {
      return live;
    }
  }
  return SIM_GROK_STUB;
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
