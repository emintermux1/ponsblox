"use client";

import { SpectatorChrome } from "@/components/watch/chrome";
import type { RenderMode } from "@/lib/world/perf";
import type { CameraPreset, MuseId, WorldSnapshot } from "@/types/world";

export type SpectatorHudProps = {
  world: WorldSnapshot;
  introLine: string | null;
  mode: RenderMode;
  onPreset: (preset: CameraPreset) => void;
  onSelect: (id: MuseId | null) => void;
  onEnterMind: () => void;
};

export function SpectatorHud({
  world,
  introLine,
  mode,
  onPreset,
  onSelect,
  onEnterMind,
}: SpectatorHudProps) {
  return (
    <SpectatorChrome
      world={world}
      introLine={introLine}
      mode={mode}
      onPreset={onPreset}
      onSelect={onSelect}
      onEnterMind={onEnterMind}
    />
  );
}
