"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { loftPickHandlers } from "@/components/world/loft-cursor";
import {
  BodyDress,
  FaceMaterial,
  Flipper,
  FloppyEars,
  FurMaterial,
  HeadDress,
  HeldProps,
} from "@/components/world/muse-kit";
import { NameTag } from "@/components/world/name-tag";
import { usePerf } from "@/components/world/perf-context";
import { damp } from "@/lib/world/camera";
import { deviceLook, GROK_ORB_POS } from "@/lib/world/layout";
import { museCostume, museHasEars, museHugsGrok } from "@/lib/world/species";
import type { MuseActivity, MuseId, MuseState } from "@/types/world";
import { assertNever } from "@/types/world";

const EYE = "#141414";
const BLUSH = "#f0b8ae";
const SMILE = "#c48a78";

function phaseFor(id: MuseId): number {
  switch (id) {
    case "scroller":
      return 0.35;
    case "trader":
      return 1.8;
    case "chill":
      return 3.2;
    case "builder":
      return 4.7;
    default:
      return assertNever(id);
  }
}

function sits(activity: MuseActivity): boolean {
  switch (activity) {
    case "WALKING":
    case "TALKING":
    case "REACTING":
      return false;
    case "SCROLLING":
    case "CHILLING":
    case "WATCHING":
    case "TRADING":
    case "RESEARCHING":
    case "SMOKING":
    case "IDLE":
    case "THINKING":
      return true;
    default:
      return assertNever(activity);
  }
}

function waves(id: MuseId, activity: MuseActivity): boolean {
  if (id !== "scroller") {
    return false;
  }
  switch (activity) {
    case "REACTING":
    case "TALKING":
    case "IDLE":
      return true;
    case "WALKING":
    case "SCROLLING":
    case "WATCHING":
    case "THINKING":
    case "RESEARCHING":
    case "TRADING":
    case "CHILLING":
    case "SMOKING":
      return false;
    default:
      return assertNever(activity);
  }
}

function faceTarget(from: readonly [number, number, number], to: readonly [number, number, number]): number {
  return Math.atan2(to[0] - from[0], to[2] - from[2]);
}

function OvalEye({ x }: { x: number }) {
  return (
    <mesh position={[x, 0.028, 0.196]} scale={[0.62, 1, 0.42]}>
      <sphereGeometry args={[0.02, 12, 10]} />
      <meshStandardMaterial color={EYE} roughness={0.28} metalness={0.04} />
    </mesh>
  );
}

function OfficialHead({ id }: { id: MuseId }) {
  const { shadows } = usePerf();
  return (
    <group position={[0, 0.8, 0]}>
      {museHasEars(id) ? <FloppyEars /> : null}
      <mesh castShadow={shadows}>
        <sphereGeometry args={[0.255, 26, 22]} />
        <FurMaterial />
      </mesh>
      <mesh position={[0, 0.02, 0.12]} scale={[0.82, 0.78, 0.42]}>
        <sphereGeometry args={[0.22, 20, 16]} />
        <FaceMaterial />
      </mesh>
      <OvalEye x={-0.056} />
      <OvalEye x={0.056} />
      <mesh position={[-0.1, -0.01, 0.2]} scale={[1.15, 0.55, 0.35]}>
        <sphereGeometry args={[0.03, 10, 8]} />
        <meshStandardMaterial color={BLUSH} roughness={0.7} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0.1, -0.01, 0.2]} scale={[1.15, 0.55, 0.35]}>
        <sphereGeometry args={[0.03, 10, 8]} />
        <meshStandardMaterial color={BLUSH} roughness={0.7} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, -0.046, 0.22]} rotation={[1.15, 0, 0]} scale={[1, 0.55, 1]}>
        <torusGeometry args={[0.034, 0.005, 8, 14, Math.PI]} />
        <meshStandardMaterial color={SMILE} roughness={0.45} />
      </mesh>
      <HeadDress id={id} />
    </group>
  );
}

function OfficialBody({
  id,
  activity,
  seated,
}: {
  id: MuseId;
  activity: MuseActivity;
  seated: boolean;
}) {
  const { shadows } = usePerf();
  return (
    <group>
      <mesh
        position={[0, seated ? 0.3 : 0.36, 0]}
        scale={seated ? [0.98, 0.92, 0.9] : [0.88, 1.14, 0.8]}
        castShadow={shadows}
      >
        <sphereGeometry args={[0.36, 26, 22]} />
        <FurMaterial />
      </mesh>
      <mesh position={[0, seated ? 0.28 : 0.34, 0.07]} scale={[0.68, 0.58, 0.5]}>
        <sphereGeometry args={[0.3, 16, 12]} />
        <FurMaterial color="#fbf7ef" />
      </mesh>
      <BodyDress id={id} />
      {seated ? null : (
        <group>
          <mesh position={[-0.12, 0.05, 0.05]} scale={[0.72, 0.34, 0.98]} castShadow={shadows}>
            <sphereGeometry args={[0.08, 10, 8]} />
            <FurMaterial />
          </mesh>
          <mesh position={[0.12, 0.05, 0.05]} scale={[0.72, 0.34, 0.98]} castShadow={shadows}>
            <sphereGeometry args={[0.08, 10, 8]} />
            <FurMaterial />
          </mesh>
        </group>
      )}
      <HeldProps id={id} activity={activity} />
    </group>
  );
}

export function MuseBody({
  muse,
  selected,
  hugging: huggingProp,
  onSelect,
}: {
  muse: MuseState;
  selected: boolean;
  hugging?: boolean;
  onSelect: () => void;
}) {
  const root = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const phase = phaseFor(muse.id);
  const { pauseExtras } = usePerf();
  const hugging = huggingProp ?? museHugsGrok(muse, null);
  const seated = sits(muse.activity);
  const waving = waves(muse.id, muse.activity);

  useFrame((state, delta) => {
    if (!root.current) {
      return;
    }
    const t = pauseExtras ? 0 : state.clock.elapsedTime;
    const breathe = Math.sin(t * 1.45 + phase);
    const hop =
      muse.activity === "WALKING" || muse.activity === "REACTING"
        ? Math.abs(Math.sin(t * 4.2 + phase)) * 0.05
        : 0;
    let x = muse.position[0];
    let y = muse.position[1] + (seated ? -0.04 : 0) + breathe * 0.018 + hop;
    let z = muse.position[2];
    if (hugging) {
      x += (GROK_ORB_POS[0] - muse.position[0]) * 0.22;
      z += (GROK_ORB_POS[2] - muse.position[2]) * 0.22;
    }
    root.current.position.x = damp(root.current.position.x, x, 5.2, delta);
    root.current.position.y = damp(root.current.position.y, y, 5.2, delta);
    root.current.position.z = damp(root.current.position.z, z, 5.2, delta);
    const look = hugging ? GROK_ORB_POS : seated ? deviceLook(muse.id, muse.activity) : null;
    const yaw = look ? faceTarget(muse.position, look) : muse.facing;
    root.current.rotation.y = damp(root.current.rotation.y, yaw, 4.2, delta);
    root.current.rotation.x = damp(root.current.rotation.x, seated ? 0.12 : 0, 4, delta);

    if (leftArm.current) {
      const wave = waving ? -0.15 + Math.abs(Math.sin(t * 3.6 + phase)) * 1.15 : -0.42 + breathe * 0.1;
      const hugLift = hugging ? 0.55 : wave;
      leftArm.current.rotation.z = damp(leftArm.current.rotation.z, hugLift, 5, delta);
      leftArm.current.rotation.x = damp(leftArm.current.rotation.x, hugging ? -0.35 : 0.18, 5, delta);
    }
    if (rightArm.current) {
      const tap =
        muse.activity === "SCROLLING" || muse.activity === "TRADING" || muse.activity === "RESEARCHING"
          ? Math.sin(t * 5.1 + phase) * 0.18
          : breathe * 0.08;
      rightArm.current.rotation.z = damp(rightArm.current.rotation.z, hugging ? -0.55 : 0.42 + tap, 5, delta);
      rightArm.current.rotation.x = damp(rightArm.current.rotation.x, hugging ? -0.3 : 0.22, 5, delta);
    }
    if (ring.current) {
      const pulse = pauseExtras ? 1 : 1 + Math.sin(t * 2.1) * 0.06;
      ring.current.scale.set(pulse, pulse, 1);
    }
  });

  return (
    <group
      ref={root}
      position={muse.position}
      rotation={[0, muse.facing, 0]}
      userData={{ species: "muse", costume: museCostume(muse.id), name: muse.name }}
      {...loftPickHandlers(onSelect)}
    >
      <mesh visible={false} position={[0, 0.52, 0]}>
        <capsuleGeometry args={[0.36, 0.5, 4, 8]} />
      </mesh>
      <OfficialBody id={muse.id} activity={muse.activity} seated={seated} />
      <group ref={leftArm} position={[-0.32, 0.52, 0.04]}>
        <Flipper side="left" />
      </group>
      <group ref={rightArm} position={[0.32, 0.52, 0.04]}>
        <Flipper side="right" />
      </group>
      <OfficialHead id={muse.id} />
      <NameTag name={muse.name} y={1.46} />
      {selected ? (
        <mesh ref={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 0.46, 32]} />
          <meshBasicMaterial color="#e6d3a8" transparent opacity={0.55} />
        </mesh>
      ) : null}
    </group>
  );
}
