"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import type { MuseMind } from "@/types/world";
import { MIND_NODES } from "@/types/world";

const ANCHORS: Record<string, [number, number, number]> = {
  ATTENTION: [0.35, 0.55, 0.1],
  MEMORY: [-0.4, 0.35, 0.15],
  CURIOSITY: [0.05, 0.7, -0.2],
  FOMO: [0.45, 0.2, -0.15],
  RISK: [-0.35, 0.05, -0.2],
  CONVICTION: [0.15, 0.1, 0.35],
  BOREDOM: [-0.15, -0.15, 0.25],
  SOCIAL: [0.5, 0.4, 0.35],
  GROK: [0, 0.45, -0.45],
  ACTION: [0, -0.05, 0],
};

export function MuseMindField({
  mind,
  visible,
}: {
  mind: MuseMind;
  visible: boolean;
}) {
  const group = useRef<Group>(null);
  const links = useMemo(() => {
    const pairs: [string, string][] = [
      ["ATTENTION", "CURIOSITY"],
      ["CURIOSITY", "FOMO"],
      ["MEMORY", "ATTENTION"],
      ["GROK", "RISK"],
      ["RISK", "CONVICTION"],
      ["CONVICTION", "ACTION"],
      ["SOCIAL", "FOMO"],
      ["BOREDOM", "ACTION"],
    ];
    return pairs;
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    group.current.visible = visible;
    group.current.rotation.y = state.clock.elapsedTime * 0.12;
  });

  if (!visible) {
    return null;
  }

  return (
    <group ref={group} position={[0, 1.35, 0]}>
      {MIND_NODES.map((id) => {
        const pos = ANCHORS[id];
        const value = mind.nodes[id];
        return (
          <mesh key={id} position={pos}>
            <sphereGeometry args={[0.035 + value * 0.05, 12, 12]} />
            <meshStandardMaterial
              color={id === "GROK" ? "#d7b56a" : "#f0e6d2"}
              emissive={id === "GROK" ? "#b0893a" : "#7a6a4a"}
              emissiveIntensity={0.25 + value * 1.1}
              transparent
              opacity={0.82}
            />
          </mesh>
        );
      })}
      {links.map(([a, b]) => {
        const from = ANCHORS[a];
        const to = ANCHORS[b];
        const mid: [number, number, number] = [
          (from[0] + to[0]) / 2,
          (from[1] + to[1]) / 2,
          (from[2] + to[2]) / 2,
        ];
        const len = Math.hypot(from[0] - to[0], from[1] - to[1], from[2] - to[2]);
        return (
          <mesh key={`${a}-${b}`} position={mid}>
            <cylinderGeometry args={[0.004, 0.004, len, 4]} />
            <meshBasicMaterial color="#d8c9a4" transparent opacity={0.28} />
          </mesh>
        );
      })}
    </group>
  );
}
