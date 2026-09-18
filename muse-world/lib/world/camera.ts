import type { CameraPreset, MuseId } from "@/types/world";
import { assertNever } from "@/types/world";

export type Shot = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export const INTRO_SHOTS: Shot[] = [
  { position: [0.2, 3.8, 16.4], target: [0, 1.6, 0], fov: 38 },
  { position: [-1.4, 2.4, 8.2], target: [-3.2, 1.1, 1.2], fov: 36 },
  { position: [6.8, 2.6, 6.4], target: [3.2, 1.15, -0.2], fov: 34 },
  { position: [2.4, 4.6, 9.8], target: [0.4, 1.2, 1.2], fov: 40 },
];

export function shotForPreset(
  preset: CameraPreset,
  selected: MuseId | null,
  musePos: [number, number, number] | null,
): Shot {
  switch (preset) {
    case "LOUNGE":
      return { position: [-6.2, 2.5, 7.1], target: [-3.2, 0.9, 1.6], fov: 38 };
    case "SCROLLER":
      return { position: [-6.4, 1.9, 3.8], target: [-4.1, 0.95, 1.15], fov: 32 };
    case "TRADER":
      return { position: [6.6, 2.1, 3.4], target: [3.35, 1.05, -0.2], fov: 32 };
    case "BUILDER":
      return { position: [3.8, 2.2, 6.2], target: [6.3, 1.1, 2.8], fov: 34 };
    case "MIND": {
      const [x, y, z] = musePos ?? [0, 1, 0];
      return { position: [x + 1.35, y + 1.55, z + 2.1], target: [x, y + 1.05, z], fov: 28 };
    }
    case "ROOM":
      return { position: [2.4, 4.6, 9.8], target: [0.4, 1.2, 1.2], fov: 40 };
    default:
      return assertNever(preset);
  }
}

export function presetForMuse(id: MuseId): CameraPreset {
  switch (id) {
    case "scroller":
      return "SCROLLER";
    case "trader":
      return "TRADER";
    case "chill":
      return "LOUNGE";
    case "builder":
      return "BUILDER";
    default:
      return assertNever(id);
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}
