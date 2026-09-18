import { GROK_ORB_POS } from "@/lib/world/layout";
import type { MuseId, MuseState } from "@/types/world";
import { assertNever } from "@/types/world";

/** Cream hooded plush only. Never a hard plastic orb. */
export const MUSE_SPECIES = "muse" as const;
/** Glossy white sphere, two vertical pill-slot eyes. Never fluff. */
export const GROK_SPECIES = "grok" as const;

export type Species = typeof MUSE_SPECIES | typeof GROK_SPECIES;
export type MuseCostume = "wave" | "cap" | "scarf" | "halo";

/** 3D cream beans occupy the loft. Official stills are for watch/HUD. */
export const MUSE_SPRITES_IN_WORLD = false;

export const GROK_SPRITE = "/muse/grok-orb.png";
export const GROK_STILL = "/muse/grok-orb.jpg";
export const HUG_MUSE_SPRITE = "/muse/hug-muse.png";

const FUR = "#f3eee4";

export type CostumeCard = {
  name: string;
  role: string;
  costume: MuseCostume;
  still: string;
  sprite: string;
  ears: boolean;
};

export const COSTUME: Record<MuseId, CostumeCard> = {
  scroller: {
    name: "Pip",
    role: "WAVE",
    costume: "wave",
    still: "/muse/wave.jpg",
    sprite: "/muse/wave.jpg",
    ears: true,
  },
  trader: {
    name: "Tape",
    role: "CAP",
    costume: "cap",
    still: "/muse/cap.jpg",
    sprite: "/muse/cap.jpg",
    ears: true,
  },
  chill: {
    name: "Sable",
    role: "SCARF",
    costume: "scarf",
    still: "/muse/sable.jpg",
    sprite: "/muse/sable.jpg",
    ears: true,
  },
  builder: {
    name: "Halo",
    role: "HALO",
    costume: "halo",
    still: "/muse/halo.jpg",
    sprite: "/muse/halo.jpg",
    ears: true,
  },
};

export function museCostume(id: MuseId): MuseCostume {
  switch (id) {
    case "scroller":
      return "wave";
    case "trader":
      return "cap";
    case "chill":
      return "scarf";
    case "builder":
      return "halo";
    default:
      return assertNever(id);
  }
}

export function museSprite(id: MuseId): string {
  return COSTUME[id].sprite;
}

export function museStill(id: MuseId): string {
  return COSTUME[id].still;
}

export function museHasEars(id: MuseId): boolean {
  return COSTUME[id].ears;
}

export function speciesOfActor(kind: "muse" | "grok"): Species {
  switch (kind) {
    case "muse":
      return MUSE_SPECIES;
    case "grok":
      return GROK_SPECIES;
    default:
      return assertNever(kind);
  }
}

export function grokIsFluff(): false {
  return false;
}

export function museFurHex(): string {
  return FUR;
}

export function distanceToGrok(position: readonly [number, number, number]): number {
  const dx = position[0] - GROK_ORB_POS[0];
  const dy = position[1] - GROK_ORB_POS[1];
  const dz = position[2] - GROK_ORB_POS[2];
  return Math.hypot(dx, dy, dz);
}

export function museHugsGrok(muse: MuseState, wakingMuseId: MuseId | null): boolean {
  if (distanceToGrok(muse.position) < 1.35) {
    return true;
  }
  return wakingMuseId === muse.id;
}
