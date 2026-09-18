"use client";

import { MotionConfig } from "framer-motion";
import { SpectatorHud } from "@/components/hud";
import { SceneGate } from "@/components/watch/scene-gate";
import { MuseWorld } from "@/components/world/muse-world";
import { PerfProvider } from "@/components/world/perf-context";
import { useLivingWorld } from "@/components/world/use-living-world";
import { usePerfBudget } from "@/components/world/use-perf";

export function SpectatorFrame() {
  const living = useLivingWorld();
  const { budget, ready, markWebglLost } = usePerfBudget();

  return (
    <PerfProvider value={budget}>
      <MotionConfig reducedMotion="user">
        <SpectatorHud
          world={living.world}
          introLine={budget.reducedMotion ? null : living.introLine}
          mode={budget.mode}
          onPreset={living.setCamera}
          onSelect={living.select}
          onEnterMind={living.toggleMind}
        />
        <SceneGate>
          <MuseWorld
            world={living.world}
            pulse={living.pulse}
            introDone={living.introDone}
            onIntroDone={() => living.setIntroDone(true)}
            onSelect={living.select}
            ready={ready}
            markWebglLost={markWebglLost}
          />
        </SceneGate>
      </MotionConfig>
    </PerfProvider>
  );
}
