"use client";

import { SpectatorChrome } from "@/components/watch";
import type { CameraPreset, MuseId, WorldSnapshot } from "@/types/world";

export type SpectatorHudProps = {
  world: WorldSnapshot;
  introLine: string | null;
  onPreset: (preset: CameraPreset) => void;
  onSelect: (id: MuseId | null) => void;
  onEnterMind: () => void;
};

export function SpectatorHud({
  world,
  onPreset,
  onSelect,
}: SpectatorHudProps) {
  return (
    <SpectatorChrome world={world} onPreset={onPreset} onSelect={onSelect} />
  );
}
