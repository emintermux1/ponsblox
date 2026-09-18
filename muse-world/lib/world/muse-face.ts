import type { MuseId } from "@/types/world";
import { assertNever } from "@/types/world";

/** Official cream-fur Muse still. Shared by every loft muse. */
export const MUSE_PLUSH_JPG = "/muse/muse-plush.jpg";
/** Sky-cut billboard of the official still. */
export const MUSE_PLUSH_PNG = "/muse/muse-plush.png";
/** Fur albedo cropped from the official still. */
export const MUSE_FUR_JPG = "/materials/fur.jpg";

export function musePlushPhoto(id: MuseId): string {
  switch (id) {
    case "scroller":
    case "trader":
    case "chill":
    case "builder":
      return MUSE_PLUSH_JPG;
    default:
      return assertNever(id);
  }
}

export function musePlushBillboard(id: MuseId): string {
  switch (id) {
    case "scroller":
    case "trader":
    case "chill":
    case "builder":
      return MUSE_PLUSH_PNG;
    default:
      return assertNever(id);
  }
}

export function musePlushTint(id: MuseId): string {
  switch (id) {
    case "scroller":
    case "trader":
    case "chill":
    case "builder":
      return "#ffffff";
    default:
      return assertNever(id);
  }
}

export function isMusePlushSrc(src: string): boolean {
  if (src.includes("grok")) {
    return false;
  }
  return src === MUSE_PLUSH_JPG || src === MUSE_PLUSH_PNG || src === MUSE_FUR_JPG;
}
