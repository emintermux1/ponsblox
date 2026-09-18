"use client";

import { Html } from "@react-three/drei";
import { asCaption } from "@/components/watch/copy";
import type { MuseState } from "@/types/world";

export function ThoughtChip({ muse }: { muse: MuseState }) {
  const caption = asCaption(muse.thought);
  if (!caption) {
    return null;
  }
  return (
    <Html
      position={[muse.position[0], muse.position[1] + 1.42, muse.position[2]]}
      center
      distanceFactor={7}
      style={{ pointerEvents: "none" }}
    >
      <span className="thought-caption">{caption}</span>
    </Html>
  );
}
