"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { ACESFilmicToneMapping } from "three";
import { PerfProvider, usePerf } from "@/components/world/perf-context";
import { WatchMode } from "@/components/world/watch-mode";
import type { RenderMode } from "@/lib/world/perf";
import type { MuseId, ScreenId, WorldSnapshot } from "@/types/world";
import { assertNever } from "@/types/world";

const Canvas = dynamic(
  () => import("@react-three/fiber").then((mod) => mod.Canvas),
  { ssr: false },
);

const LivingScene = dynamic(
  () => import("@/components/world/scene").then((mod) => mod.LivingScene),
  { ssr: false },
);

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

export function MuseWorld({
  world,
  introDone,
  onIntroDone,
  onSelect,
  onInspect,
  onWakeGrok,
  ready,
  markWebglLost,
}: {
  world: WorldSnapshot;
  introDone: boolean;
  onIntroDone: () => void;
  onSelect: (id: MuseId) => void;
  onInspect: (id: ScreenId) => void;
  onWakeGrok: () => void;
  ready: boolean;
  markWebglLost: () => void;
}) {
  const budget = usePerf();
  const webgl = isWebglMode(budget.mode);

  useEffect(() => {
    if (budget.reducedMotion) {
      onIntroDone();
    }
  }, [budget.reducedMotion, onIntroDone]);

  return (
    <main
      className="relative h-dvh w-full overflow-hidden bg-transparent"
      data-loft-mode={ready ? budget.mode : "boot"}
      data-loft-tier={budget.tier}
    >
      {ready && webgl ? (
        <Canvas
          className="absolute inset-0 touch-none"
          style={{ touchAction: "none", pointerEvents: "auto" }}
          shadows={budget.shadows ? "percentage" : false}
          dpr={budget.dpr}
          frameloop={budget.frameloop}
          camera={{
            position: [1.35, 3.4, 13.1],
            fov: budget.tier === "phone" ? 52 : 36,
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
          onContextMenu={(event) => {
            event.preventDefault();
          }}
          onPointerMissed={() => undefined}
          onCreated={({ gl }) => {
            gl.domElement.style.touchAction = "none";
            gl.domElement.style.pointerEvents = "auto";
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
              onIntroDone={onIntroDone}
              onSelect={onSelect}
              onInspect={onInspect}
              onWakeGrok={onWakeGrok}
            />
          </PerfProvider>
        </Canvas>
      ) : null}
      {ready && !webgl ? (
        <WatchMode
          world={world}
          onSelect={onSelect}
          onInspect={onInspect}
          onWakeGrok={onWakeGrok}
        />
      ) : null}
    </main>
  );
}
