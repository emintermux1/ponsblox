"use client";

import { SpectatorHud } from "@/components/hud";
import { MuseWorld } from "@/components/world/muse-world";
import { useLivingWorld } from "@/components/world/use-living-world";
import { SceneGate } from "@/components/watch/scene-gate";

export function SpectatorFrame() {
  const living = useLivingWorld();

  return (
    <>
      <SpectatorHud
        world={living.world}
        introLine={living.introLine}
        onPreset={living.setCamera}
        onSelect={living.select}
        onEnterMind={living.toggleMind}
      />
      <SceneGate>
        <MuseWorld
          world={living.world}
          introDone={living.introDone}
          onIntroDone={() => living.setIntroDone(true)}
          onSelect={living.select}
        />
      </SceneGate>
    </>
  );
}
