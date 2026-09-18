"use client";

import { MotionConfig } from "framer-motion";
import { SpectatorHud } from "@/components/hud";
import { SceneGate } from "@/components/watch/scene-gate";
import { DexScreenerHud } from "@/components/world/dex-hud";
import { MuseWorld } from "@/components/world/muse-world";
import { WatchMode } from "@/components/world/watch-mode";
import { PerfProvider } from "@/components/world/perf-context";
import { TapeProvider } from "@/components/world/tape-context";
import { useLivingWorld } from "@/components/world/use-living-world";
import { usePerfBudget } from "@/components/world/use-perf";

export function SpectatorFrame() {
  const living = useLivingWorld();
  const { budget, ready, markWebglLost } = usePerfBudget();
  const compact = budget.tier === "phone";

  return (
    <PerfProvider value={budget}>
      <TapeProvider tape={living.tape}>
      <MotionConfig reducedMotion="user">
        <SpectatorHud
          world={living.world}
          introLine={budget.reducedMotion || compact ? null : living.introLine}
          mode={budget.mode}
          compact={compact}
          onPreset={living.setCamera}
          onSelect={living.select}
          onInspect={living.inspect}
          onEnterMind={living.toggleMind}
          onWakeGrok={living.wakeGrok}
        />
        <DexScreenerHud />
        <SceneGate
          onFail={markWebglLost}
          fallback={
            <WatchMode
              world={living.world}
              pulse={living.pulse}
              onSelect={living.select}
              onInspect={living.inspect}
              onWakeGrok={living.wakeGrok}
            />
          }
        >
          <MuseWorld
            world={living.world}
            pulse={living.pulse}
            introDone={living.introDone}
            onIntroDone={() => living.setIntroDone(true)}
            onSelect={living.select}
            onInspect={living.inspect}
            onWakeGrok={living.wakeGrok}
            ready={ready}
            markWebglLost={markWebglLost}
          />
        </SceneGate>
      </MotionConfig>
      </TapeProvider>
    </PerfProvider>
  );
}
