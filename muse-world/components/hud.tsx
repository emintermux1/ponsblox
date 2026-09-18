"use client";

import { useEffect, useState } from "react";
import { SpectatorChrome } from "@/components/watch/chrome";
import { FIRST_PAINT_MS } from "@/components/watch/copy";
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

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function SpectatorHud({
  world,
  mode,
  compact = false,
  onPreset,
  onSelect,
  onEnterMind,
}: SpectatorHudProps) {
  const skipWait = compact || prefersReducedMotion();
  const [settled, setSettled] = useState(skipWait);

  useEffect(() => {
    if (skipWait) {
      setSettled(true);
      return;
    }
    const id = window.setTimeout(() => setSettled(true), FIRST_PAINT_MS);
    return () => window.clearTimeout(id);
  }, [skipWait]);

  return (
    <div data-entry-veil="off" data-first-paint={settled ? "hud" : "watch"}>
      {settled ? (
        <SpectatorChrome
          world={world}
          mode={mode}
          compact={compact}
          onPreset={onPreset}
          onSelect={onSelect}
          onEnterMind={onEnterMind}
        />
      ) : null}
    </div>
  );
}
