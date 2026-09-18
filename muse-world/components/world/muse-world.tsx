"use client";

import dynamic from "next/dynamic";
import type { MuseId, WorldSnapshot } from "@/types/world";

const Canvas = dynamic(
  () => import("@react-three/fiber").then((mod) => mod.Canvas),
  { ssr: false },
);

const LivingScene = dynamic(
  () => import("@/components/world/scene").then((mod) => mod.LivingScene),
  { ssr: false },
);

export function MuseWorld({
  world,
  introDone,
  onIntroDone,
  onSelect,
}: {
  world: WorldSnapshot;
  introDone: boolean;
  onIntroDone: () => void;
  onSelect: (id: MuseId) => void;
}) {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-transparent">
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [0.2, 3.8, 16.4], fov: 38, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <LivingScene
          world={world}
          introDone={introDone}
          onIntroDone={onIntroDone}
          onSelect={onSelect}
        />
      </Canvas>
    </main>
  );
}
