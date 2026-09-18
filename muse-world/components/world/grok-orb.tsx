"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { loftPickHandlers } from "@/components/world/loft-cursor";
import { NameTag } from "@/components/world/name-tag";
import { usePerf } from "@/components/world/perf-context";
import { GROK_NAME } from "@/lib/world/cast";
import { damp } from "@/lib/world/camera";
import { GROK_ORB_POS } from "@/lib/world/layout";
import type { GrokHonesty } from "@/types/world";
import { assertNever } from "@/types/world";

export const GROK_DESK = GROK_ORB_POS;

function pillEye(x: number) {
  return (
    <mesh position={[x, 0.03, 0.168]} rotation={[0.12, 0, 0]} scale={[0.38, 1, 0.38]}>
      <capsuleGeometry args={[0.028, 0.055, 6, 10]} />
      <meshStandardMaterial color="#111111" roughness={0.22} />
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
  const { glass, pauseExtras, shadows } = usePerf();
  const physical = (() => {
    switch (glass) {
      case "physical":
        return true;
      case "standard":
        return false;
      default:
        return assertNever(glass);
    }
  })();

  useFrame((state, delta) => {
    if (!root.current) {
      return;
    }
    const t = pauseExtras ? 0 : state.clock.elapsedTime;
    const bob = 0.03 * Math.sin(t * 1.4);
    const spin = 0.12 * Math.sin(t * 0.55);
    root.current.position.y = damp(root.current.position.y, GROK_ORB_POS[1] + bob, 4.2, delta);
    root.current.rotation.y = damp(root.current.rotation.y, spin, 3.4, delta);
    root.current.rotation.z = damp(root.current.rotation.z, Math.sin(t * 0.8) * 0.06, 3.4, delta);
    const body = root.current.children.find((child): child is Mesh => "isMesh" in child && child.isMesh);
    if (body && "emissiveIntensity" in body.material) {
      const pulse = waking && !pauseExtras ? 0.12 + Math.abs(Math.sin(t * 3.2)) * 0.16 : 0.03;
      body.material.emissiveIntensity = honesty === "REAL" ? 0.08 : pulse;
    }
  });

  return (
    <group ref={root} position={GROK_ORB_POS} {...loftPickHandlers(onWake)}>
      <mesh visible={false}>
        <sphereGeometry args={[0.34, 12, 12]} />
      </mesh>
      <mesh castShadow={shadows}>
        <sphereGeometry args={[0.2, 32, 24]} />
        {physical ? (
          <meshPhysicalMaterial
            color="#ffffff"
            roughness={0.08}
            metalness={0.12}
            clearcoat={1}
            clearcoatRoughness={0.08}
            emissive="#ffffff"
            emissiveIntensity={0.03}
          />
        ) : (
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.12}
            metalness={0.18}
            emissive="#ffffff"
            emissiveIntensity={0.03}
          />
        )}
      </mesh>
      {pillEye(-0.055)}
      {pillEye(0.055)}
      <NameTag name={GROK_NAME} mark={honesty ?? "SIM"} y={0.34} />
    </group>
  );
}
