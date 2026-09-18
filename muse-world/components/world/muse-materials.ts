"use client";

import {
  CanvasTexture,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
} from "three";
import type { GlassQuality } from "@/lib/world/perf";
import { assertNever } from "@/types/world";

export const FUR = "#f1e7d2";
export const FUR_LIGHT = "#f9f2e1";
export const FUR_SHADE = "#e3d3b8";
export const FACE_PLATE = "#f7f0df";
export const BEAD = "#191411";
export const BLUSH = "#e59a83";
export const NOSE = "#c99f86";
export const BOT_SHELL = "#f6f5f1";
export const BOT_FACE = "#0b0c10";
export const BOT_EYE = "#dcf3ff";

function step(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

let fleece: CanvasTexture | null = null;

/**
 * Nubby fleece bump map — thousands of soft flecks over neutral grey.
 * Shared by every plush material; never disposed (one small texture).
 */
export function fleeceBump(): CanvasTexture | null {
  if (typeof document === "undefined") {
    return null;
  }
  if (fleece) {
    return fleece;
  }
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.fillStyle = "#8c8c8c";
  ctx.fillRect(0, 0, size, size);
  let seed = 20260918;
  for (let i = 0; i < 4200; i += 1) {
    seed = step(seed);
    const x = (seed / 4294967296) * size;
    seed = step(seed);
    const y = (seed / 4294967296) * size;
    seed = step(seed);
    const radius = 0.6 + (seed / 4294967296) * 1.4;
    seed = step(seed);
    const bright = seed / 4294967296 > 0.5;
    seed = step(seed);
    const alpha = 0.14 + (seed / 4294967296) * 0.26;
    const tone = bright ? "235,235,235" : "60,60,60";
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(${tone},${alpha})`);
    glow.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(5.5, 5.5);
  texture.needsUpdate = true;
  fleece = texture;
  return texture;
}

export type MuseMats = {
  fur: MeshStandardMaterial;
  furLight: MeshStandardMaterial;
  furShade: MeshStandardMaterial;
  facePlate: MeshStandardMaterial;
  bead: MeshStandardMaterial;
  blush: MeshStandardMaterial;
  nose: MeshStandardMaterial;
  botShell: MeshStandardMaterial;
  botFace: MeshStandardMaterial;
};

const MATS = new Map<GlassQuality, MuseMats>();

function furMaterial(quality: GlassQuality, color: string): MeshStandardMaterial {
  const bump = fleeceBump();
  switch (quality) {
    case "physical": {
      const mat = new MeshPhysicalMaterial({
        color,
        roughness: 0.96,
        metalness: 0,
        sheen: 1,
        sheenRoughness: 0.55,
        sheenColor: "#fff6e2",
      });
      if (bump) {
        mat.bumpMap = bump;
        mat.bumpScale = 0.38;
      }
      return mat;
    }
    case "standard": {
      const mat = new MeshStandardMaterial({ color, roughness: 0.97, metalness: 0 });
      if (bump) {
        mat.bumpMap = bump;
        mat.bumpScale = 0.32;
      }
      return mat;
    }
    default:
      return assertNever(quality);
  }
}

function shellMaterial(quality: GlassQuality): MeshStandardMaterial {
  switch (quality) {
    case "physical":
      return new MeshPhysicalMaterial({
        color: BOT_SHELL,
        roughness: 0.2,
        metalness: 0.04,
        clearcoat: 1,
        clearcoatRoughness: 0.14,
      });
    case "standard":
      return new MeshStandardMaterial({
        color: BOT_SHELL,
        roughness: 0.16,
        metalness: 0.08,
      });
    default:
      return assertNever(quality);
  }
}

/** Shared, cached materials — one set per quality tier for all four muses. */
export function museMaterials(quality: GlassQuality): MuseMats {
  const cached = MATS.get(quality);
  if (cached) {
    return cached;
  }
  const bump = fleeceBump();
  const facePlate = new MeshStandardMaterial({
    color: FACE_PLATE,
    roughness: 0.55,
    metalness: 0.02,
  });
  if (bump) {
    facePlate.bumpMap = bump;
    facePlate.bumpScale = 0.07;
  }
  const mats: MuseMats = {
    fur: furMaterial(quality, FUR),
    furLight: furMaterial(quality, FUR_LIGHT),
    furShade: furMaterial(quality, FUR_SHADE),
    facePlate,
    bead: new MeshStandardMaterial({ color: BEAD, roughness: 0.14, metalness: 0.1 }),
    blush: new MeshStandardMaterial({
      color: BLUSH,
      roughness: 0.85,
      emissive: "#7c3a28",
      emissiveIntensity: 0.22,
    }),
    nose: new MeshStandardMaterial({ color: NOSE, roughness: 0.7, metalness: 0 }),
    botShell: shellMaterial(quality),
    botFace: new MeshStandardMaterial({
      color: BOT_FACE,
      roughness: 0.12,
      metalness: 0.25,
    }),
  };
  MATS.set(quality, mats);
  return mats;
}
