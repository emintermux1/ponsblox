"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { MotionConfig } from "framer-motion";
import { WorldHud } from "@/components/world/hud";
import { PerfProvider } from "@/components/world/perf-context";
import { useLivingWorld } from "@/components/world/use-living-world";
import { usePerfBudget } from "@/components/world/use-perf";
import { WatchMode } from "@/components/world/watch-mode";
import type { RenderMode } from "@/lib/world/perf";
import { assertNever } from "@/types/world";

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

export function MuseWorld() {
  const { world, introDone, introLine, setIntroDone, select, setCamera, toggleMind } =
    useLivingWorld();
  const { budget, ready, markWebglLost } = usePerfBudget();
  const webgl = isWebglMode(budget.mode);

  useEffect(() => {
    if (budget.reducedMotion) {
      setIntroDone(true);
    }
  }, [budget.reducedMotion, setIntroDone]);

  return (
    <PerfProvider value={budget}>
      <MotionConfig reducedMotion="user">
        <main className="relative h-dvh w-full overflow-hidden bg-[#0b0c10]">
          {ready && webgl ? (
            <Canvas
              shadows={budget.shadows}
              dpr={budget.dpr}
              frameloop={budget.frameloop}
              camera={{
                position: [0.2, 3.8, 16.4],
                fov: 38,
                near: 0.1,
                far: budget.cameraFar,
              }}
              gl={{
                antialias: budget.antialias,
                alpha: false,
                powerPreference: budget.powerPreference,
                stencil: false,
              }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener("webglcontextlost", (event) => {
                  event.preventDefault();
                  markWebglLost();
                });
              }}
            >
              <LivingScene
                world={world}
                introDone={introDone}
                onIntroDone={() => setIntroDone(true)}
                onSelect={select}
              />
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
