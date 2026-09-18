"use client";

import { Html } from "@react-three/drei";
import type { MuseState } from "@/types/world";

export function ThoughtChip({
  muse,
  hush = false,
}: {
  muse: MuseState;
  hush?: boolean;
}) {
  if (hush || !muse.thought) {
    return null;
  }

  return (
    <Html
      position={[muse.position[0], muse.position[1] + 1.42, muse.position[2]]}
      center
      distanceFactor={14}
      style={{ pointerEvents: "none" }}
    >
      <span className="whitespace-nowrap font-serif text-[10px] tracking-[0.2em] text-[#efe6d4]/50">
        {muse.thought}
      </span>
    </Html>
  );
}
