import { assertNever } from "@/types/world";

export const ART = {
  fur: "/materials/fur.jpg",
  walnutFloor: "/materials/walnut-floor.jpg",
  walnutWall: "/materials/walnut-wall.jpg",
  cityDusk: "/materials/city-dusk.jpg",
  lcdTape: "/screens/lcd-tape.jpg",
  lcdTv: "/screens/lcd-tv.jpg",
  wood: "/materials/walnut-wall.jpg",
  concrete: "/materials/walnut-floor.jpg",
  facade: "/materials/city-dusk.jpg",
} as const;

export type ArtKey = keyof typeof ART;

export function artSrc(key: ArtKey): string {
  return ART[key];
}

export const MUSE_ART = {
  hug: "/muse/hug.jpg",
  grok: "/muse/grok.jpg",
  banner: "/muse/banner.jpg",
  halo: "/muse/halo.jpg",
  laptop: "/muse/laptop.jpg",
} as const;

export type MuseArtId = keyof typeof MUSE_ART;

export const MUSE_ART_IDS: MuseArtId[] = ["hug", "grok", "banner", "halo", "laptop"];

export function museArtSrc(id: MuseArtId): string {
  switch (id) {
    case "hug":
      return MUSE_ART.hug;
    case "grok":
      return MUSE_ART.grok;
    case "banner":
      return MUSE_ART.banner;
    case "halo":
      return MUSE_ART.halo;
    case "laptop":
      return MUSE_ART.laptop;
    default:
      return assertNever(id);
  }
}
