"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import {
  BodyDress,
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
import { museHugsGrok } from "@/lib/world/species";
import type { MuseActivity, MuseId, MuseState } from "@/types/world";
import { assertNever } from "@/types/world";

const FUR_LIGHT = "#fbf7ef";
const EYE = "#1b1914";
const BLUSH = "#f0c0b4";

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

type Motion = {
  offset: [number, number, number];
  facing: number;
  sway: [number, number, number];
  torso: [number, number, number];
  head: [number, number, number];
  leftArm: [number, number, number];
  rightArm: [number, number, number];
};

function motionFor(activity: MuseActivity, t: number, phase: number, hugging: boolean): Motion {
  const breathe = Math.sin(t * 1.55 + phase);
  const shift = Math.sin(t * 0.68 + phase * 0.8);
  const look = Math.sin(t * 0.4 + phase * 1.25);
  const seated = sits(activity);
  const motion: Motion = {
    offset: [shift * 0.018, (seated ? -0.06 : 0) + 0.018 * breathe, look * 0.01],
    facing: look * 0.08,
    sway: [0.03 * shift + (seated ? 0.1 : 0), 0.04 * look, 0.04 * shift],
    torso: [1 + breathe * 0.018, 1 + breathe * 0.032, 1 + breathe * 0.018],
    head: [0.03 * breathe, 0.08 * look, 0.02 * shift],
    leftArm: [0.12 * breathe, 0.04 * look, 0.22 + 0.06 * shift],
    rightArm: [0.12 * breathe, -0.04 * look, -0.22 - 0.06 * shift],
  };

  switch (activity) {
    case "IDLE":
      break;
    case "SCROLLING": {
      const flick = Math.sin(t * 7.2 + phase);
      motion.head = [0.18 + flick * 0.03, 0.12, 0.03];
      motion.rightArm = [-0.48, -0.14, -0.08];
      motion.leftArm = [-0.72, 0.28, 0.58];
      break;
    }
    case "WALKING": {
      const step = t * 4.4 + phase;
      motion.offset[1] += Math.abs(Math.sin(step)) * 0.055;
      motion.sway = [0.12, Math.sin(step) * 0.18, Math.sin(step) * 0.1];
      motion.leftArm = [Math.sin(step) * 0.62, 0, 0.22];
      motion.rightArm = [Math.sin(step + Math.PI) * 0.62, 0, -0.22];
      motion.head = [0.06, Math.sin(step) * 0.08, Math.sin(step) * 0.04];
      break;
    }
    case "SMOKING": {
      const drag = (Math.sin(t * 1.15 + phase) + 1) / 2;
      motion.head = [0.08 + drag * 0.03, 0.1, 0.03];
      motion.rightArm = [-0.55, 0.06, -0.26];
      break;
    }
    case "CHILLING":
      motion.sway = [0.18 + 0.02 * shift, 0.08 * look, 0.04 * shift];
      motion.head = [0.1, 0.1 * look, 0.03];
      motion.leftArm = [0.48, 0.16, 0.48];
      motion.rightArm = [0.42, -0.12, -0.42];
      break;
    case "WATCHING":
      motion.head = [0.16, 0.05 * look, 0.02];
      motion.leftArm = [-0.18, 0.06, 0.14];
      motion.rightArm = [-0.14, -0.05, -0.12];
      break;
    case "TRADING": {
      const tap = Math.sin(t * 6.6 + phase);
      motion.head = [0.2, 0.04, 0];
      motion.rightArm = [-0.42 + tap * 0.1, -0.1, -0.06];
      motion.leftArm = [-0.28, 0.08, 0.14];
      break;
    }
    case "RESEARCHING": {
      const jot = Math.sin(t * 3.2 + phase);
      motion.head = [0.2 + jot * 0.025, -0.1, 0.02];
      motion.leftArm = [-0.42, 0.22, 0.18];
      motion.rightArm = [-0.12, -0.06, -0.18];
      break;
    }
    case "THINKING":
      motion.head = [0.08, 0.05, 0.16 + 0.02 * shift];
      motion.leftArm = [-0.62, 0.28, 0.4];
      break;
    case "TALKING":
      motion.head = [0.06 + Math.sin(t * 5.2 + phase) * 0.08, 0.08 * look, 0];
      motion.leftArm = [0.18, 0.12, 0.4];
      motion.rightArm = [-0.22, -0.12, -0.3];
      break;
    case "REACTING": {
      const hop = Math.abs(Math.sin(t * 7.2 + phase));
      motion.offset[1] += hop * 0.07;
      motion.leftArm = [-0.95, 0.16, 0.48];
      motion.rightArm = [-0.9, -0.16, -0.48];
      break;
    }
    default:
      return assertNever(activity);
  }

  if (hugging) {
    motion.head = [0.28, 0.06, 0];
    motion.leftArm = [-0.88, 0.24, 0.38];
    motion.rightArm = [-0.86, -0.22, -0.36];
    motion.sway = [0.16, 0.03, 0.02];
  }
  return motion;
}

function dampRot(group: Group | null, rot: [number, number, number], lambda: number, dt: number) {
  if (!group) return;
  group.rotation.x = damp(group.rotation.x, rot[0], lambda, dt);
  group.rotation.y = damp(group.rotation.y, rot[1], lambda, dt);
  group.rotation.z = damp(group.rotation.z, rot[2], lambda, dt);
}

function dampScale(group: Group | null, scale: [number, number, number], lambda: number, dt: number) {
  if (!group) return;
  group.scale.x = damp(group.scale.x, scale[0], lambda, dt);
  group.scale.y = damp(group.scale.y, scale[1], lambda, dt);
  group.scale.z = damp(group.scale.z, scale[2], lambda, dt);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function faceTarget(from: readonly [number, number, number], to: readonly [number, number, number]): number {
  return Math.atan2(to[0] - from[0], to[2] - from[2]);
}

function OfficialFace() {
  return (
    <group>
      <mesh position={[-0.068, 0.02, 0.228]}>
        <sphereGeometry args={[0.028, 12, 10]} />
        <meshStandardMaterial color={EYE} roughness={0.28} />
      </mesh>
      <mesh position={[0.068, 0.02, 0.228]}>
        <sphereGeometry args={[0.028, 12, 10]} />
        <meshStandardMaterial color={EYE} roughness={0.28} />
      </mesh>
      <mesh position={[-0.11, -0.02, 0.21]} rotation={[0.2, 0, 0]} scale={[1.15, 0.7, 0.35]}>
        <sphereGeometry args={[0.038, 10, 8]} />
        <meshStandardMaterial color={BLUSH} roughness={0.72} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0.11, -0.02, 0.21]} rotation={[0.2, 0, 0]} scale={[1.15, 0.7, 0.35]}>
        <sphereGeometry args={[0.038, 10, 8]} />
        <meshStandardMaterial color={BLUSH} roughness={0.72} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, -0.055, 0.232]} rotation={[1.2, 0, 0]}>
        <torusGeometry args={[0.042, 0.006, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#3a2c26" roughness={0.45} />
      </mesh>
    </group>
  );
}

function OfficialBody({
  id,
  seated,
  hugging,
  shadows,
}: {
  id: MuseId;
  seated: boolean;
  hugging: boolean;
  shadows: boolean;
}) {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadows}>
        <circleGeometry args={[0.22, 16]} />
        <meshStandardMaterial color="#1a1612" transparent opacity={0.16} />
      </mesh>
      <mesh
        position={[0, seated ? 0.34 : 0.4, 0.01]}
        scale={seated ? [1.05, 0.92, 0.95] : [0.98, 1.12, 0.88]}
        castShadow={shadows}
      >
        <sphereGeometry args={[0.28, 28, 22]} />
        <FurMaterial />
      </mesh>
      <group position={[0, seated ? 0.42 : 0.48, 0]}>
        <BodyDress id={id} />
      </group>
      {hugging ? (
        <mesh position={[0, 0.52, 0.22]} scale={[0.55, 0.42, 0.55]}>
          <sphereGeometry args={[0.12, 12, 10]} />
          <FurMaterial color={FUR_LIGHT} />
        </mesh>
      ) : null}
    </group>
  );
}

function OfficialHead({
  id,
  seated,
  shadows,
}: {
  id: MuseId;
  seated: boolean;
  shadows: boolean;
}) {
  return (
    <group position={[0, seated ? 0.72 : 0.78, 0.03]}>
      <mesh scale={[1.04, 0.96, 1]} castShadow={shadows}>
        <sphereGeometry args={[0.246, 28, 22]} />
        <FurMaterial color={FUR_LIGHT} />
      </mesh>
      <FloppyEars />
      <OfficialFace />
      <HeadDress id={id} />
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
  const sway = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const headLook = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const phase = phaseFor(muse.id);
  const { pauseExtras, shadows } = usePerf();
  const hugging = huggingProp ?? museHugsGrok(muse, null);
  const seated = sits(muse.activity);
  const screen = deviceLook(muse.id);

  useFrame((state, delta) => {
    if (!root.current) return;
    const motion = motionFor(
      muse.activity,
      pauseExtras ? 0 : state.clock.elapsedTime,
      phase,
      hugging,
    );
    root.current.position.set(
      muse.position[0] + motion.offset[0],
      muse.position[1] + motion.offset[1],
      muse.position[2] + motion.offset[2],
    );
    const lookPoint = hugging ? GROK_ORB_POS : screen;
    const yaw = faceTarget(muse.position, lookPoint) + motion.facing;
    root.current.rotation.y = damp(root.current.rotation.y, yaw, 4.6, delta);
    dampRot(sway.current, motion.sway, 5.2, delta);
    dampScale(torso.current, motion.torso, 4.2, delta);
    if (headLook.current) {
      const dx = lookPoint[0] - muse.position[0];
      const dz = lookPoint[2] - muse.position[2];
      const localYaw = clamp(Math.atan2(dx, dz) - root.current.rotation.y, -0.45, 0.45);
      const localPitch = clamp((lookPoint[1] - (muse.position[1] + 0.78)) * -0.22, -0.22, 0.32);
      headLook.current.rotation.y = damp(headLook.current.rotation.y, localYaw + motion.head[1], 4.4, delta);
      headLook.current.rotation.x = damp(headLook.current.rotation.x, localPitch + motion.head[0], 4.4, delta);
      headLook.current.rotation.z = damp(headLook.current.rotation.z, motion.head[2], 4.4, delta);
    }
    dampRot(leftArm.current, motion.leftArm, 6.4, delta);
    dampRot(rightArm.current, motion.rightArm, 6.4, delta);
    if (ring.current) {
      const pulse = pauseExtras ? 1 : 1 + Math.sin(state.clock.elapsedTime * 2.1) * 0.06;
      ring.current.scale.set(pulse, pulse, 1);
    }
  });

  return (
    <group
      ref={root}
      position={muse.position}
      rotation={[0, muse.facing, 0]}
      userData={{ species: "muse", costume: muse.id }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <mesh visible={false} position={[0, 0.46, 0]}>
        <capsuleGeometry args={[0.3, 0.5, 6, 10]} />
      </mesh>
      <group ref={sway}>
        <group ref={torso}>
          <OfficialBody id={muse.id} seated={seated} hugging={hugging} shadows={shadows} />
          <group ref={headLook}>
            <OfficialHead id={muse.id} seated={seated} shadows={shadows} />
          </group>
          <HeldProps id={muse.id} activity={muse.activity} />
          <group ref={leftArm} position={[-0.26, seated ? 0.5 : 0.56, 0.04]}>
            <Flipper side="left" />
          </group>
          <group ref={rightArm} position={[0.26, seated ? 0.5 : 0.56, 0.04]}>
            <Flipper side="right" />
          </group>
        </group>
      </group>
      <NameTag name={muse.name} />
      {selected ? (
        <mesh ref={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 0.46, 32]} />
          <meshBasicMaterial color="#e6d3a8" transparent opacity={0.55} />
        </mesh>
      ) : null}
    </group>
  );
}
