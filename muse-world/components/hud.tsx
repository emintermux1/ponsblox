"use client";

import { SpectatorChrome } from "@/components/watch/chrome";
import type { RenderMode } from "@/lib/world/perf";
import type { CameraPreset, MuseId, ScreenId, WorldSnapshot } from "@/types/world";

export type SpectatorHudProps = {
  world: WorldSnapshot;
  introLine: string | null;
  mode: RenderMode;
  onPreset: (preset: CameraPreset) => void;
  onSelect: (id: MuseId | null) => void;
  onInspect: (id: ScreenId | null) => void;
  onEnterMind: () => void;
};

export function SpectatorHud({
  world,
  introLine,
  mode,
  onPreset,
  onSelect,
  onInspect,
  onEnterMind,
}: SpectatorHudProps) {
  return (
    <SpectatorChrome
      world={world}
      introLine={introLine}
      mode={mode}
      onPreset={onPreset}
      onSelect={onSelect}
      onInspect={onInspect}
      onEnterMind={onEnterMind}
    />
  );
}
