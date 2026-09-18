"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MotionConfig } from "framer-motion";
import { ACESFilmicToneMapping } from "three";
import { WorldHud } from "@/components/world/hud";
import { PerfProvider } from "@/components/world/perf-context";
import { useLivingWorld } from "@/components/world/use-living-world";
import { usePerfBudget } from "@/components/world/use-perf";
import { WatchMode } from "@/components/world/watch-mode";
import { INTRO_CLEAR_MS, INTRO_COPY_AT_MS } from "@/lib/world/camera";
import type { RenderMode } from "@/lib/world/perf";
import { assertNever } from "@/types/world";

const INTRO_COPY = [
  "MUSE WORLD",
  "They don't wait for prompts",
  "Watch them live.",
] as const;

function isWebglMode(mode: RenderMode): boolean {
  switch (mode) {
    case "webgl":
      return true;
    case "watch":
      return false;
    default:
      return assertNever(mode);
  }
}

const Canvas = dynamic(
  () => import("@react-three/fiber").then((mod) => mod.Canvas),
  { ssr: false },
);

const LivingScene = dynamic(
  () => import("@/components/world/scene").then((mod) => mod.LivingScene),
  { ssr: false },
);

function useIntroCopy() {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setBeat(1), INTRO_COPY_AT_MS[1]),
      window.setTimeout(() => setBeat(2), INTRO_COPY_AT_MS[2]),
      window.setTimeout(() => setBeat(-1), INTRO_CLEAR_MS),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  return beat < 0 ? null : INTRO_COPY[beat];
}

export function MuseWorld() {
  const { world, introDone, setIntroDone, select, setCamera, toggleMind } =
    useLivingWorld();
  const { budget, ready, markWebglLost } = usePerfBudget();
  const webgl = isWebglMode(budget.mode);
  const introLine = useIntroCopy();

  useEffect(() => {
    if (budget.reducedMotion) {
      setIntroDone(true);
    }
  }, [budget.reducedMotion, setIntroDone]);

  return (
    <PerfProvider value={budget}>
      <MotionConfig reducedMotion="user">
        <main className="relative h-dvh w-full overflow-hidden bg-[#15202c]">
          {ready && webgl ? (
            <Canvas
              className="absolute inset-0"
              shadows={budget.shadows ? "percentage" : false}
              dpr={budget.dpr}
              frameloop={budget.frameloop}
              camera={{
                position: [1.1, 3.15, 11.4],
                fov: 36,
                near: 0.1,
                far: budget.cameraFar,
              }}
              gl={{
                antialias: budget.antialias,
                alpha: false,
                powerPreference: budget.powerPreference,
                stencil: false,
                preserveDrawingBuffer: true,
                toneMapping: ACESFilmicToneMapping,
              }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener("webglcontextlost", (event) => {
                  event.preventDefault();
                  markWebglLost();
                });
              }}
            >
              <PerfProvider value={budget}>
                <LivingScene
                  world={world}
                  introDone={introDone}
                  onIntroDone={() => setIntroDone(true)}
                  onSelect={select}
                />
              </PerfProvider>
            </Canvas>
          ) : null}
          {ready && !webgl ? <WatchMode world={world} onSelect={select} /> : null}
          <WorldHud
            world={world}
            introLine={budget.reducedMotion ? null : introLine}
            mode={budget.mode}
            onPreset={setCamera}
            onSelect={select}
            onEnterMind={toggleMind}
          />
        </main>
      </MotionConfig>
    </PerfProvider>
  );
}
