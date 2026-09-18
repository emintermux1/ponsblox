import type { MuseId } from "@/types/world";
import { assertNever } from "@/types/world";

/** Official cream-fur Muse still. Shared face for every loft muse. */
export const MUSE_PLUSH_JPG = "/muse/muse-plush.jpg";
/** Same official still, kept as the builder halo file. */
export const MUSE_PLUSH_HALO_JPG = "/muse/muse-plush-halo.jpg";
/** Official still with sky punched — 3D billboard color+alpha. */
export const MUSE_PLUSH_PNG = "/muse/muse-plush.png";
/** Green-channel silhouette of the official still (Three alphaMap). */
export const MUSE_PLUSH_ALPHA = "/muse/muse-plush-alpha.png";
/** SHA-256 of owner JPG cf45eff6-4163-4972-9aa4-06a2e288a1b0.jpg */
export const OFFICIAL_PLUSH_SHA256 =
  "018d9885b77422c751bbc13854ed3eae7fa402c54f7f5ab46e04cf657165bd93";

export function musePlushPhoto(id: MuseId): string {
  switch (id) {
    case "builder":
      return MUSE_PLUSH_HALO_JPG;
    case "scroller":
    case "trader":
    case "chill":
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
      return musePlushPhoto(id);
    default:
      return assertNever(id);
  }
}

export function musePlushTint(id: MuseId): string {
  switch (id) {
    case "scroller":
      return "#fff3e4";
    case "trader":
      return "#ece6f6";
    case "chill":
      return "#e6f2e4";
    case "builder":
      return "#fff1cc";
    default:
      return assertNever(id);
  }
}

export function isMusePlushSrc(src: string): boolean {
  if (src.includes("grok")) {
    return false;
  }
  return (
    src === MUSE_PLUSH_JPG ||
    src === MUSE_PLUSH_HALO_JPG ||
    src === MUSE_PLUSH_PNG ||
    src === MUSE_PLUSH_ALPHA
  );
}
