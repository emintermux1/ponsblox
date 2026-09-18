"use client";

import dynamic from "next/dynamic";
import { WorldHud } from "@/components/world/hud";
import { useLivingWorld } from "@/components/world/use-living-world";

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

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0b0c10]">
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [0.2, 3.8, 16.4], fov: 38, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
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
        onPreset={setCamera}
        onSelect={select}
        onEnterMind={toggleMind}
      />
    </main>
  );
}
