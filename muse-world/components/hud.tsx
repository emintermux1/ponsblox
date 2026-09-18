"use client";

import { SpectatorChrome } from "@/components/watch/chrome";
import type { RenderMode } from "@/lib/world/perf";
import type { CameraPreset, MuseId, WorldSnapshot } from "@/types/world";

export type SpectatorHudProps = {
  world: WorldSnapshot;
  introLine: string | null;
  mode: RenderMode;
  compact?: boolean;
  onPreset: (preset: CameraPreset) => void;
  onSelect: (id: MuseId | null) => void;
  onEnterMind: () => void;
};

export function SpectatorHud({
  world,
  introLine,
  mode,
  compact = false,
  onPreset,
  onSelect,
  onEnterMind,
}: SpectatorHudProps) {
  return (
    <SpectatorChrome
      world={world}
      introLine={introLine}
      mode={mode}
      compact={compact}
      onPreset={onPreset}
      onSelect={onSelect}
      onEnterMind={onEnterMind}
    />
  );
}
