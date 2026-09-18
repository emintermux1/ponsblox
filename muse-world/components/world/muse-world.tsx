"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { WorldHud } from "@/components/world/hud";
import { useLivingWorld } from "@/components/world/use-living-world";
import { INTRO_CLEAR_MS, INTRO_COPY_AT_MS } from "@/lib/world/camera";

const INTRO_COPY = [
  "MUSE WORLD",
  "They don't wait for prompts",
  "Watch them live.",
] as const;

const Canvas = dynamic(
  () => import("@react-three/fiber").then((mod) => mod.Canvas),
  { ssr: false },
);

const LivingScene = dynamic(
  () => import("@/components/world/scene").then((mod) => mod.LivingScene),
  { ssr: false },
);

function useIntroCopy(active: boolean) {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }
    const timers = [
      window.setTimeout(() => setBeat(1), INTRO_COPY_AT_MS[1]),
      window.setTimeout(() => setBeat(2), INTRO_COPY_AT_MS[2]),
      window.setTimeout(() => setBeat(-1), INTRO_CLEAR_MS),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [active]);

  return beat < 0 ? null : INTRO_COPY[beat];
}

export function MuseWorld() {
  const { world, introDone, setIntroDone, select, setCamera, toggleMind } =
    useLivingWorld();
  const [booted, setBooted] = useState(false);
  const introLine = useIntroCopy(booted);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0b0c10]">
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [0.2, 3.8, 16.4], fov: 38, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={() => setBooted(true)}
      >
        <LivingScene
          world={world}
          introDone={introDone}
          onIntroDone={() => setIntroDone(true)}
          onSelect={select}
        />
      </Canvas>
      <WorldHud
        world={world}
        introLine={introLine}
        introDone={introDone}
        onPreset={setCamera}
        onSelect={select}
        onEnterMind={toggleMind}
      />
    </main>
  );
}
