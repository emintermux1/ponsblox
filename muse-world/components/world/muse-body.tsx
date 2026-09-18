"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { MuseId, MuseState } from "@/types/world";
import { assertNever } from "@/types/world";

function accent(id: MuseId): string {
  switch (id) {
    case "scroller":
      return "#d8c6a6";
    case "trader":
      return "#1a1a1a";
    case "chill":
      return "#3f7a4a";
    case "builder":
      return "#c9b48a";
    default:
      return assertNever(id);
  }
}

export function MuseBody({
  muse,
  selected,
  onSelect,
}: {
  muse: MuseState;
  selected: boolean;
  onSelect: () => void;
}) {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const breathe = Math.sin(state.clock.elapsedTime * 1.6 + muse.position[0]) * 0.012;
    group.current.position.set(muse.position[0], muse.position[1] + breathe, muse.position[2]);
    group.current.rotation.y = muse.facing;
    if (muse.activity === "SCROLLING") {
      group.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.03;
    }
  });

  return (
    <group
      ref={group}
      position={muse.position}
      rotation={[0, muse.facing, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <mesh castShadow position={[0, 0.42, 0]}>
        <capsuleGeometry args={[0.28, 0.38, 8, 16]} />
        <meshStandardMaterial color="#f3efe6" roughness={0.78} />
      </mesh>
      <mesh castShadow position={[0, 0.98, 0.02]}>
        <sphereGeometry args={[0.27, 24, 24]} />
        <meshStandardMaterial color="#f7f3ea" roughness={0.72} />
      </mesh>
      <mesh position={[-0.07, 1.02, 0.22]}>
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshStandardMaterial color="#1b1b1b" />
      </mesh>
      <mesh position={[0.07, 1.02, 0.22]}>
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshStandardMaterial color="#1b1b1b" />
      </mesh>
      {muse.id === "scroller" ? (
        <mesh position={[0.22, 0.62, 0.22]} rotation={[-0.6, 0.4, 0.2]}>
          <boxGeometry args={[0.12, 0.2, 0.02]} />
          <meshStandardMaterial color="#111" emissive="#334" emissiveIntensity={0.4} />
        </mesh>
      ) : null}
      {muse.id === "trader" ? (
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.2, 0.22, 0.1, 16]} />
          <meshStandardMaterial color={accent(muse.id)} roughness={0.45} />
        </mesh>
      ) : null}
      {muse.id === "chill" ? (
        <mesh position={[0, 0.78, 0]} rotation={[0.2, 0, 0]}>
          <torusGeometry args={[0.2, 0.045, 10, 18]} />
          <meshStandardMaterial color={accent(muse.id)} roughness={0.7} />
        </mesh>
      ) : null}
      {muse.id === "builder" ? (
        <mesh position={[0.3, 0.7, 0.12]} rotation={[0.2, -0.4, 0.1]}>
          <boxGeometry args={[0.16, 0.12, 0.01]} />
          <meshStandardMaterial color={accent(muse.id)} />
        </mesh>
      ) : null}
      {selected ? (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.44, 32]} />
          <meshBasicMaterial color="#e6d3a8" transparent opacity={0.55} />
        </mesh>
      ) : null}
    </group>
  );
}
