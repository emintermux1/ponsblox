"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { loftPickHandlers } from "@/components/world/loft-cursor";
import { usePerf } from "@/components/world/perf-context";
import { GROK_ORB_POS } from "@/lib/world/layout";
import type { GrokHonesty } from "@/types/world";

const ORB = "#f5f5f2";
const EYE = "#141414";

function PillEye({ x }: { x: number }) {
  return (
    <mesh position={[x, 0.028, 0.168]} rotation={[0, 0, Math.PI / 2]}>
      <capsuleGeometry args={[0.016, 0.036, 4, 10]} />
      <meshStandardMaterial color={EYE} roughness={0.32} metalness={0.04} />
    </mesh>
  );
}

export function GrokOrb({
  waking,
  honesty,
  onWake,
}: {
  waking: boolean;
  honesty: GrokHonesty | null;
  onWake: () => void;
}) {
  const root = useRef<Group>(null);
  const face = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const { pauseExtras } = usePerf();

  useFrame(({ camera, clock }) => {
    if (!root.current) {
      return;
    }
    const bob = pauseExtras ? 0 : Math.sin(clock.elapsedTime * 1.05) * 0.032;
    root.current.position.set(GROK_ORB_POS[0], GROK_ORB_POS[1] + bob, GROK_ORB_POS[2]);
    if (face.current) {
      face.current.lookAt(camera.position);
    }
    if (body.current && "emissiveIntensity" in body.current.material) {
      const pulse = waking && !pauseExtras ? 0.12 + Math.abs(Math.sin(clock.elapsedTime * 3.2)) * 0.16 : 0.03;
      const live = honesty === "REAL" ? 0.08 : pulse;
      body.current.material.emissiveIntensity = live;
    }
  });

  return (
    <group ref={root} position={GROK_ORB_POS} {...loftPickHandlers(onWake)}>
      <mesh visible={false}>
        <sphereGeometry args={[0.34, 12, 12]} />
      </mesh>
      <mesh ref={body} castShadow>
        <sphereGeometry args={[0.2, 28, 22]} />
        <meshStandardMaterial
          color={ORB}
          roughness={0.2}
          metalness={0.08}
          emissive={ORB}
          emissiveIntensity={0.03}
        />
      </mesh>
      <group ref={face}>
        <PillEye x={-0.054} />
        <PillEye x={0.054} />
      </group>
    </group>
  );
}
