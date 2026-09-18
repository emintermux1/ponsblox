"use client";

import { useRef, type Ref } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, type Group } from "three";
import { loftPickHandlers } from "@/components/world/loft-cursor";
import { NameTag } from "@/components/world/name-tag";
import { usePerf } from "@/components/world/perf-context";
import { GROK_NAME } from "@/lib/world/cast";
import { damp } from "@/lib/world/camera";
import { GROK_ORB_POS } from "@/lib/world/layout";
import type { GrokHonesty } from "@/types/world";
import { assertNever } from "@/types/world";

export const GROK_DESK = GROK_ORB_POS;

const ORB = "#f7f7f5";
const EYE = "#111111";

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

function PillEye({ x }: { x: number }) {
  return (
    <mesh position={[x, 0.028, 0.168]} rotation={[0.08, 0, 0]} scale={[0.42, 1, 0.42]}>
      <capsuleGeometry args={[0.026, 0.058, 6, 12]} />
      <meshStandardMaterial color={EYE} roughness={0.22} metalness={0.04} />
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
      <sphereGeometry args={[radius, 32, 24]} />
      {physical ? (
        <meshPhysicalMaterial
          color={ORB}
          roughness={0.08}
          metalness={0.14}
          clearcoat={1}
          clearcoatRoughness={0.06}
          emissive={ORB}
          emissiveIntensity={0.03}
        />
      ) : (
        <meshStandardMaterial
          color={ORB}
          roughness={0.12}
          metalness={0.18}
          emissive={ORB}
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
  onWake,
}: {
  waking: boolean;
  honesty: GrokHonesty | null;
  lookAt: [number, number, number];
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
    root.current.position.x = damp(root.current.position.x, GROK_ORB_POS[0], 3.4, delta);
    root.current.position.y = damp(root.current.position.y, GROK_ORB_POS[1] + bob, 3.4, delta);
    root.current.position.z = damp(root.current.position.z, GROK_ORB_POS[2], 3.4, delta);
    lookGroupAt(face.current, lookAt);
    if (!pauseExtras) {
      pulseEmissive(body.current, waking, honesty, t);
    }
  });

  return (
    <group
      ref={root}
      position={GROK_ORB_POS}
      userData={{ grok: "hero" }}
      {...loftPickHandlers(onWake)}
    >
      <mesh visible={false}>
        <sphereGeometry args={[0.34, 12, 12]} />
      </mesh>
      <OrbSkin radius={0.2} physical={physical} shadows={shadows} meshRef={body} />
      <group ref={face}>
        <PillEye x={-0.055} />
        <PillEye x={0.055} />
      </group>
      <NameTag name={GROK_NAME} mark={honesty === "REAL" ? "GROK LIVE" : "SIM"} y={0.36} />
    </group>
  );
}

export function GrokPresence({
  waking,
  honesty,
  lookAt,
  onWake,
}: {
  waking: boolean;
  honesty: GrokHonesty | null;
  lookAt: [number, number, number];
  onWake: () => void;
}) {
  return <GrokOrb waking={waking} honesty={honesty} lookAt={lookAt} onWake={onWake} />;
}
