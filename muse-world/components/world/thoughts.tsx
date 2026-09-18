"use client";

import { useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { usePerf } from "@/components/world/perf-context";
import type { MuseState } from "@/types/world";

export function ThoughtChip({
  muse,
  selected = false,
}: {
  muse: MuseState;
  selected?: boolean;
}) {
  const { htmlThoughts, thoughtDistance, pauseExtras } = usePerf();
  const near = useRef(true);
  const [show, setShow] = useState(true);

  useFrame(({ camera }) => {
    if (pauseExtras) {
      if (!near.current) {
        near.current = true;
        setShow(true);
      }
      return;
    }
    const dx = camera.position.x - muse.position[0];
    const dy = camera.position.y - muse.position[1];
    const dz = camera.position.z - muse.position[2];
    const next = Math.hypot(dx, dy, dz) < thoughtDistance;
    if (next !== near.current) {
      near.current = next;
      setShow(next);
    }
  });

  if (!muse.thought || !show) {
    return null;
  }
  if (!htmlThoughts && !selected) {
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
