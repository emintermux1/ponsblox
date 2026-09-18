"use client";

import { Html } from "@react-three/drei";
import type { MuseState } from "@/types/world";

export function ThoughtChip({ muse }: { muse: MuseState }) {
  if (!muse.thought) {
    return null;
  }
  return (
    <Html
      position={[muse.position[0], muse.position[1] + 1.42, muse.position[2]]}
      center
      distanceFactor={7}
      style={{ pointerEvents: "none" }}
    >
      <span className="whitespace-nowrap font-serif text-[11px] tracking-[0.14em] text-[#efe6d4]/80">
        {muse.thought}
      </span>
    </Html>
  );
}
