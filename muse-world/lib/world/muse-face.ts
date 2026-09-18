import { CAST, castPortrait } from "@/lib/world/cast";
import type { MuseId } from "@/types/world";
import { assertNever } from "@/types/world";

export function musePlushPhoto(id: MuseId): string {
  return castPortrait(id);
}

export function musePlushTint(id: MuseId): string {
  switch (id) {
    case "scroller":
      return "#fff6ea";
    case "trader":
      return "#f4f1ea";
    case "chill":
      return "#f7f0e4";
    case "builder":
      return "#fff8ec";
    default:
      return assertNever(id);
  }
}

export function musePlushFocus(id: MuseId): string {
  return CAST[id].focus;
}
