"use client";

import { Billboard, Text } from "@react-three/drei";

export function NameTag({
  name,
  mark,
  y = 1.2,
}: {
  name: string;
  mark?: string;
  y?: number;
}) {
  return (
    <Billboard position={[0, y, 0]} follow>
      <Text
        fontSize={0.09}
        color="#f6edd8"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.012}
        outlineColor="#1a120c"
        letterSpacing={0.08}
      >
        {name}
      </Text>
      {mark ? (
        <Text
          position={[0, -0.08, 0]}
          fontSize={0.048}
          color="#c9ae7a"
          anchorX="center"
          anchorY="top"
          outlineWidth={0.008}
          outlineColor="#1a120c"
          letterSpacing={0.12}
        >
          {mark}
        </Text>
      ) : null}
    </Billboard>
  );
}
