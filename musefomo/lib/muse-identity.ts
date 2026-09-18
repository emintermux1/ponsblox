import { BRAND } from "@/lib/brand";

/** Transparent Telegram-pack cutouts — same Muse, different poses. */
export const MUSE_IDENTITIES = [
  { id: "wave", src: BRAND.idleStand, label: "Wave" },
  { id: "leap", src: BRAND.jumpStand, label: "Leap" },
  { id: "desk", src: BRAND.laptopStand, label: "Desk" },
  { id: "street", src: BRAND.hoodie, label: "Street" },
  { id: "float", src: BRAND.mark, label: "Float" },
  { id: "cheer", src: BRAND.empty, label: "Cheer" },
  { id: "hi", src: BRAND.jumpHi, label: "Hi" },
  { id: "shades", src: BRAND.laptop, label: "Shades" },
  { id: "bounce", src: BRAND.idle, label: "Bounce" },
] as const;

export type MuseIdentityId = (typeof MUSE_IDENTITIES)[number]["id"];
export type MuseIdentity = (typeof MUSE_IDENTITIES)[number];

export function museIdentity(agentId: string | null | undefined, fallback = "muse"): MuseIdentity {
  const key = (agentId?.trim() || fallback).toLowerCase();
  return MUSE_IDENTITIES[hashId(key) % MUSE_IDENTITIES.length];
}

function hashId(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
