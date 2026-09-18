"use client";

import { useEffect, useState } from "react";
import { SpectatorChrome } from "@/components/watch/chrome";
import { FIRST_PAINT_MS, WORDMARK } from "@/components/watch/copy";
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
  onWakeGrok: () => void;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function SpectatorHud({
  world,
  introLine,
  mode,
  compact = false,
  onPreset,
  onSelect,
  onInspect,
  onEnterMind,
  onWakeGrok,
}: SpectatorHudProps) {
  const [settled, setSettled] = useState(() => compact || prefersReducedMotion());

  useEffect(() => {
    if (compact || prefersReducedMotion()) {
      setSettled(true);
      return;
    }
    const id = window.setTimeout(() => setSettled(true), FIRST_PAINT_MS);
    return () => window.clearTimeout(id);
  }, [compact]);

  if (!settled) {
    return (
      <div data-entry-veil="off" data-first-paint="wordmark" className="loft-chrome">
        <header className="loft-chrome-top">
          <p className="loft-wordmark">{WORDMARK}</p>
        </header>
      </div>
    );
  }

  return (
    <div data-entry-veil="off" data-first-paint="hud" className="loft-chrome-in">
      <SpectatorChrome
        world={world}
        introLine={compact ? null : introLine}
        mode={mode}
        compact={compact}
        onPreset={onPreset}
        onSelect={onSelect}
        onInspect={onInspect}
        onEnterMind={onEnterMind}
        onWakeGrok={onWakeGrok}
      />
    </div>
  );
}
