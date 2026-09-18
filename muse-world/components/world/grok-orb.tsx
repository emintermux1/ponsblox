"use client";

import { useRef, type Ref } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, type Group } from "three";
import { loftPickHandlers } from "@/components/world/loft-cursor";
import { NameTag } from "@/components/world/name-tag";
import { usePerf } from "@/components/world/perf-context";
import { GROK_BODY_HEX, GROK_EYE_HEX } from "@/lib/sim/grok-patrol";
import { GROK_NAME } from "@/lib/world/cast";
import { damp } from "@/lib/world/camera";
import { GROK_ORB_POS } from "@/lib/world/layout";
import type { GrokHonesty } from "@/types/world";
import { assertNever } from "@/types/world";

export const GROK_DESK = GROK_ORB_POS;

function physicalGlass(glass: "physical" | "standard"): boolean {
  switch (glass) {
    case "physical":
      return true;
    case "standard":
      return false;
    default:
      return assertNever(glass);
  }
}

function PillSlot({ x }: { x: number }) {
  return (
    <mesh position={[x, 0.04, 0.214]} rotation={[0.18, 0, 0]} scale={[0.55, 1.42, 0.5]}>
      <capsuleGeometry args={[0.034, 0.092, 8, 16]} />
      <meshStandardMaterial color={GROK_EYE_HEX} roughness={0.16} metalness={0.02} />
    </mesh>
  );
}

function OrbSkin({
  radius,
  physical,
  shadows,
  meshRef,
}: {
  radius: number;
  physical: boolean;
  shadows: boolean;
  meshRef?: Ref<Mesh>;
}) {
  return (
    <mesh ref={meshRef} castShadow={shadows}>
      <sphereGeometry args={[radius, 40, 28]} />
      {physical ? (
        <meshPhysicalMaterial
          color={GROK_BODY_HEX}
          roughness={0.06}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.05}
          emissive={GROK_BODY_HEX}
          emissiveIntensity={0.03}
        />
      ) : (
        <meshStandardMaterial
          color={GROK_BODY_HEX}
          roughness={0.1}
          metalness={0.14}
          emissive={GROK_BODY_HEX}
          emissiveIntensity={0.03}
        />
      )}
    </mesh>
  );
}

function lookGroupAt(group: Group | null, target: [number, number, number]) {
  if (!group) {
    return;
  }
  group.lookAt(target[0], target[1], target[2]);
}

function pulseEmissive(mesh: Mesh | null, waking: boolean, honesty: GrokHonesty | null, t: number) {
  if (!mesh || !("emissiveIntensity" in mesh.material)) {
    return;
  }
  const pulse = waking ? 0.12 + Math.abs(Math.sin(t * 3.2)) * 0.16 : 0.03;
  mesh.material.emissiveIntensity = honesty === "REAL" ? 0.08 : pulse;
}

export function GrokOrb({
  waking,
  honesty,
  lookAt,
  position,
  mark,
  onWake,
}: {
  waking: boolean;
  honesty: GrokHonesty | null;
  lookAt: [number, number, number];
  position: [number, number, number];
  mark?: string;
  onWake: () => void;
}) {
  const root = useRef<Group>(null);
  const face = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const { glass, pauseExtras, shadows } = usePerf();
  const physical = physicalGlass(glass);

  useFrame((state, delta) => {
    if (!root.current) {
      return;
    }
    const t = pauseExtras ? 0 : state.clock.elapsedTime;
    const bob = pauseExtras ? 0 : 0.028 * Math.sin(t * 1.15);
    root.current.position.x = damp(root.current.position.x, position[0], 4.2, delta);
    root.current.position.y = damp(root.current.position.y, position[1] + bob, 4.2, delta);
    root.current.position.z = damp(root.current.position.z, position[2], 4.2, delta);
    lookGroupAt(face.current, lookAt);
    if (!pauseExtras) {
      pulseEmissive(body.current, waking, honesty, t);
    }
  });

  return (
    <group
      ref={root}
      position={position}
      userData={{ species: "grok", grok: "hero" }}
      {...loftPickHandlers(onWake)}
    >
      <mesh visible={false}>
        <sphereGeometry args={[0.4, 12, 12]} />
      </mesh>
      <OrbSkin radius={0.26} physical={physical} shadows={shadows} meshRef={body} />
      <group ref={face}>
        <PillSlot x={-0.068} />
        <PillSlot x={0.068} />
      </group>
      <NameTag name={GROK_NAME} mark={mark ?? (honesty === "REAL" ? "GROK LIVE" : "SIM")} y={0.42} />
    </group>
  );
}

export function GrokPresence({
  waking,
  honesty,
  lookAt,
  position,
  mark,
  onWake,
}: {
  waking: boolean;
  honesty: GrokHonesty | null;
  lookAt: [number, number, number];
  position: [number, number, number];
  mark?: string;
  onWake: () => void;
}) {
  return (
    <GrokOrb
      waking={waking}
      honesty={honesty}
      lookAt={lookAt}
      position={position}
      mark={mark}
      onWake={onWake}
    />
  );
}
