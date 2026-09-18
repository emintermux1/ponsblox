"use client";

import { useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { asCaption } from "@/components/watch/copy";
import { usePerf } from "@/components/world/perf-context";
import { museHeadY } from "@/lib/world/layout";
import type { MuseState } from "@/types/world";

export function ThoughtChip({
  muse,
  hush = false,
}: {
  muse: MuseState;
  hush?: boolean;
}) {
  const { thoughtDistance, pauseExtras } = usePerf();
  const near = useRef(true);
  const [show, setShow] = useState(true);
  const caption = asCaption(muse.thought);

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

  if (hush || !caption || !show) {
    return null;
  }

  return (
    <Text
      position={[muse.position[0], museHeadY(muse.position) + 0.52, muse.position[2]]}
      fontSize={0.048}
      letterSpacing={0.08}
      color="#efe6d4"
      fillOpacity={0.42}
      anchorX="center"
      anchorY="bottom"
      maxWidth={1.6}
      overflowWrap="break-word"
      textAlign="center"
    >
      {caption}
    </Text>
  );
}
