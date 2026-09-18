"use client";

import { Text } from "@react-three/drei";
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
    <Text
      position={[muse.position[0], muse.position[1] + 1.38, muse.position[2]]}
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
      {muse.thought}
    </Text>
  );
}
