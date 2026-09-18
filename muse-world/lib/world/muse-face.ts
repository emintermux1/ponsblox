import { museSprite, museStill } from "@/lib/world/species";
import type { MuseId } from "@/types/world";
import { assertNever } from "@/types/world";

export const MUSE_PLUSH_JPG = "/muse/wave.jpg";
export const MUSE_PLUSH_HALO_JPG = "/muse/halo.jpg";

export function musePlushPhoto(id: MuseId): string {
  switch (id) {
    case "scroller":
    case "trader":
    case "chill":
    case "builder":
      return museSprite(id);
    default:
      return assertNever(id);
  }
}

export function musePlushStill(id: MuseId): string {
  return museStill(id);
}

export function musePlushTint(id: MuseId): string {
  switch (id) {
    case "scroller":
      return "transparent";
    case "trader":
      return "transparent";
    case "chill":
      return "transparent";
    case "builder":
      return "transparent";
    default:
      return assertNever(id);
  }
}

export function isMusePlushSrc(src: string): boolean {
  return src.startsWith("/muse/") && !src.includes("grok");
}
