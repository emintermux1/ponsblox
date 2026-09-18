"use client";

import { SpectatorChrome } from "@/components/watch/chrome";
import type { RenderMode } from "@/lib/world/perf";
import type { CameraPreset, MuseId, ScreenId, WorldSnapshot } from "@/types/world";

export type SpectatorHudProps = {
  world: WorldSnapshot;
  introLine: string | null;
  mode: RenderMode;
  compact?: boolean;
  onPreset: (preset: CameraPreset) => void;
  onSelect: (id: MuseId | null) => void;
  onInspect: (id: ScreenId | null) => void;
  onEnterMind: () => void;
};

export function SpectatorHud({
  world,
  introLine,
  mode,
  compact = false,
  onPreset,
  onSelect,
  onInspect,
  onEnterMind,
}: SpectatorHudProps) {
  return (
    <div data-entry-veil="off" data-first-paint="hud">
      <SpectatorChrome
        world={world}
        introLine={compact ? null : introLine}
        mode={mode}
        compact={compact}
        onPreset={onPreset}
        onSelect={onSelect}
        onInspect={onInspect}
        onEnterMind={onEnterMind}
      />
    </div>
  );
}
