"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { BodyDress, Flipper, HeadDress, HeldProps } from "@/components/world/muse-kit";
import { NameTag } from "@/components/world/name-tag";
import { usePerf } from "@/components/world/perf-context";
import { damp } from "@/lib/world/camera";
import { STAND_Y } from "@/lib/world/layout";
import type { MuseActivity, MuseId, MuseState } from "@/types/world";
import { assertNever } from "@/types/world";

const FUR = "#f3eee4";
const FUR_LIGHT = "#fbf7ef";
const FUR_SHADE = "#e6d9c6";
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

function isSitting(muse: MuseState): boolean {
  return muse.activity !== "WALKING" && muse.position[1] < STAND_Y - 0.08;
}

function Bean() {
  const { shadows } = usePerf();
  return (
    <group>
      <mesh position={[0, 0.4, 0.02]} scale={[0.98, 1.16, 0.86]} castShadow={shadows}>
        <sphereGeometry args={[0.4, 28, 22]} />
        <meshStandardMaterial color={FUR} roughness={0.9} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.78, 0.03]} scale={[0.96, 0.9, 0.88]} castShadow={shadows}>
        <sphereGeometry args={[0.3, 24, 20]} />
        <meshStandardMaterial color={FUR_LIGHT} roughness={0.91} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.36, 0.18]} scale={[1.05, 0.72, 0.55]}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial color={FUR_SHADE} roughness={0.92} />
      </mesh>
    </group>
  );
}

function Face() {
  return (
    <group position={[0, 0.78, 0.03]}>
      <mesh position={[-0.07, 0.02, 0.24]} scale={[0.62, 1.15, 0.45]}>
        <sphereGeometry args={[0.028, 12, 10]} />
        <meshStandardMaterial color={EYE} roughness={0.28} />
      </mesh>
      <mesh position={[0.07, 0.02, 0.24]} scale={[0.62, 1.15, 0.45]}>
        <sphereGeometry args={[0.028, 12, 10]} />
        <meshStandardMaterial color={EYE} roughness={0.28} />
      </mesh>
      <mesh position={[-0.12, -0.03, 0.23]} scale={[1.1, 0.55, 0.4]}>
        <sphereGeometry args={[0.03, 10, 8]} />
        <meshStandardMaterial color={BLUSH} transparent opacity={0.55} roughness={0.8} />
      </mesh>
      <mesh position={[0.12, -0.03, 0.23]} scale={[1.1, 0.55, 0.4]}>
        <sphereGeometry args={[0.03, 10, 8]} />
        <meshStandardMaterial color={BLUSH} transparent opacity={0.55} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.07, 0.25]} rotation={[1.2, 0, 0]} scale={[0.7, 0.35, 0.35]}>
        <torusGeometry args={[0.03, 0.006, 6, 10, Math.PI]} />
        <meshStandardMaterial color="#c9b8a2" roughness={0.55} />
      </mesh>
    </group>
  );
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

function sitPose(motion: Motion, recline: number) {
  motion.offset[1] -= 0.16;
  motion.sway[0] += recline;
}

function motionFor(activity: MuseActivity, t: number, phase: number, sitting: boolean): Motion {
  const breathe = Math.sin(t * 1.7 + phase);
  const shift = Math.sin(t * 0.76 + phase * 0.8);
  const look = Math.sin(t * 0.43 + phase * 1.25);
  const motion: Motion = {
    offset: [shift * 0.03, 0.02 * breathe, look * 0.012],
    facing: look * 0.14,
    sway: [0.04 * shift, 0.06 * look, 0.05 * shift],
    torso: [1 + breathe * 0.03, 1 + breathe * 0.05, 1 + breathe * 0.03],
    head: [0.06 * breathe, 0.14 * look, 0.04 * shift],
    leftArm: [0.16 * breathe, 0.05 * look, 0.28 + 0.08 * shift],
    rightArm: [0.16 * breathe, -0.05 * look, -0.28 - 0.08 * shift],
  };

  switch (activity) {
    case "IDLE":
      if (sitting) sitPose(motion, 0.12);
      break;
    case "SCROLLING": {
      const flick = Math.sin(t * 8.6 + phase);
      motion.head = [0.42 + flick * 0.05, 0.18, 0.04];
      motion.rightArm = [-1.05, -0.22, -0.12];
      motion.leftArm = [0.12, 0.18, 0.38];
      motion.sway = [0.18 + 0.03 * shift, 0.06 * look, flick * 0.04];
      motion.offset[1] += Math.abs(flick) * 0.006;
      if (sitting) sitPose(motion, 0.06);
      break;
    }
    case "WALKING": {
      const step = t * 5.1 + phase;
      motion.offset[1] += Math.abs(Math.sin(step)) * 0.05;
      motion.sway = [0.06, Math.sin(step) * 0.16, Math.sin(step) * 0.12];
      motion.leftArm = [Math.sin(step) * 0.62, 0, 0.22];
      motion.rightArm = [Math.sin(step + Math.PI) * 0.62, 0, -0.22];
      motion.head = [0.04, Math.sin(step) * 0.07, Math.sin(step) * 0.04];
      motion.facing = 0;
      break;
    }
    case "SMOKING": {
      const drag = (Math.sin(t * 1.15 + phase) + 1) / 2;
      motion.torso = [1 + drag * 0.05, 1 + drag * 0.09, 1 + drag * 0.05];
      motion.head = [0.08 + drag * 0.04, 0.16, 0.04];
      motion.rightArm = [-0.88, 0.1, -0.38];
      motion.sway = [0.08 + 0.02 * shift, 0.08 * look, 0.04 * shift];
      if (sitting) sitPose(motion, 0.2);
      break;
    }
    case "CHILLING":
      motion.sway = [0.04 + 0.03 * shift, 0.12 * look, 0.05 * shift];
      motion.head = [0.08, 0.18 * look, 0.04];
      motion.leftArm = [0.32, 0.12, 0.42];
      motion.rightArm = [0.28, -0.1, -0.36];
      if (sitting) sitPose(motion, 0.22);
      break;
    case "WATCHING":
      motion.sway = [0.2, 0.03 * look, 0.02 * shift];
      motion.head = [0.32, 0.05 * look, 0.02];
      motion.leftArm = [-0.55, 0.08, 0.18];
      motion.rightArm = [-0.48, -0.06, -0.16];
      if (sitting) sitPose(motion, 0.04);
      break;
    case "TRADING": {
      const tap = Math.sin(t * 9.4 + phase);
      const tapB = Math.sin(t * 8.1 + phase * 1.3);
      motion.sway = [0.22, tap * 0.02, tap * 0.02];
      motion.head = [0.36, 0.04 * look, 0];
      motion.rightArm = [-1.05 + tap * 0.16, -0.08, -0.06];
      motion.leftArm = [-0.98 + tapB * 0.14, 0.1, 0.08];
      if (sitting) sitPose(motion, 0.02);
      break;
    }
    case "RESEARCHING": {
      const jot = Math.sin(t * 4.2 + phase);
      motion.head = [0.3 + jot * 0.05, -0.12, 0.03];
      motion.leftArm = [-0.82, 0.28, 0.22];
      motion.rightArm = [-0.55 + jot * 0.18, -0.08, -0.18];
      motion.sway = [0.12, -0.05, 0.03 * shift];
      if (sitting) sitPose(motion, 0.05);
      break;
    }
    case "THINKING":
      motion.head = [0.14, 0.06, 0.18 + 0.04 * shift];
      motion.leftArm = [-0.95, 0.42, 0.55];
      motion.rightArm = [0.12, -0.1, -0.2];
      if (sitting) sitPose(motion, 0.08);
      break;
    case "TALKING":
      motion.head = [0.08 + Math.sin(t * 5.6 + phase) * 0.1, 0.1 * look, 0];
      motion.leftArm = [0.2, 0.15, 0.45];
      motion.rightArm = [-0.35, -0.2, -0.4];
      if (sitting) sitPose(motion, 0.08);
      break;
    case "REACTING": {
      const hop = Math.abs(Math.sin(t * 7.8 + phase));
      motion.offset[1] += hop * 0.05;
      motion.torso = [1 + hop * 0.04, 1 + hop * 0.06, 1 + hop * 0.04];
      motion.head = [0.12, 0.18 * look, 0];
      motion.leftArm = [-1.05, 0.16, 0.48];
      motion.rightArm = [-1.0, -0.16, -0.48];
      if (sitting) sitPose(motion, 0.04);
      break;
    }
    default:
      return assertNever(activity);
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

function SmokePuffs({ active }: { active: boolean }) {
  const a = useRef<Mesh>(null);
  const b = useRef<Mesh>(null);
  const c = useRef<Mesh>(null);

  useFrame((state) => {
    const puffs = [a.current, b.current, c.current];
    puffs.forEach((mesh, i) => {
      if (!mesh) return;
      if (!active) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      const cycle = (state.clock.elapsedTime * 0.38 + i * 0.33) % 1;
      mesh.position.set(0.12 + Math.sin(state.clock.elapsedTime + i) * 0.04, 1.02 + cycle * 0.5, 0.2);
      const size = 0.03 + cycle * 0.07;
      mesh.scale.set(size, size, size);
      const material = mesh.material;
      if ("opacity" in material) {
        material.opacity = (1 - cycle) * 0.38;
      }
    });
  });

  return (
    <group>
      <mesh ref={a} visible={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial color="#efe6d6" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={b} visible={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial color="#efe6d6" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={c} visible={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial color="#efe6d6" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
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
  const root = useRef<Group>(null);
  const sway = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const phase = phaseFor(muse.id);
  const { pauseExtras } = usePerf();

  useFrame((state, delta) => {
    if (!root.current) return;
    const sitting = isSitting(muse);
    const motion = motionFor(
      muse.activity,
      pauseExtras ? 0 : state.clock.elapsedTime,
      phase,
      sitting,
    );
    root.current.position.x = damp(
      root.current.position.x,
      muse.position[0] + motion.offset[0],
      4.4,
      delta,
    );
    root.current.position.y = damp(
      root.current.position.y,
      muse.position[1] + motion.offset[1],
      4.4,
      delta,
    );
    root.current.position.z = damp(
      root.current.position.z,
      muse.position[2] + motion.offset[2],
      4.4,
      delta,
    );
    root.current.rotation.y = damp(
      root.current.rotation.y,
      muse.facing + motion.facing,
      5.2,
      delta,
    );
    dampRot(sway.current, motion.sway, 5.5, delta);
    dampScale(torso.current, motion.torso, 4.2, delta);
    dampRot(head.current, motion.head, 6.2, delta);
    dampRot(leftArm.current, motion.leftArm, 6.8, delta);
    dampRot(rightArm.current, motion.rightArm, 6.8, delta);
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
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <group ref={sway}>
        <group ref={torso}>
          <Bean />
          <BodyDress id={muse.id} />
          <HeldProps id={muse.id} activity={muse.activity} />
          <group ref={head} position={[0, 0.02, 0]}>
            <Face />
            <group position={[0, 0.78, 0.03]}>
              <HeadDress id={muse.id} />
            </group>
          </group>
          <group ref={leftArm} position={[-0.3, 0.5, 0.04]}>
            <Flipper side="left" />
          </group>
          <group ref={rightArm} position={[0.3, 0.5, 0.04]}>
            <Flipper side="right" />
          </group>
        </group>
      </group>
      <NameTag name={muse.name} />
      <SmokePuffs active={!pauseExtras && muse.activity === "SMOKING"} />
      {selected ? (
        <mesh ref={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 0.46, 32]} />
          <meshBasicMaterial color="#e6d3a8" transparent opacity={0.55} />
        </mesh>
      ) : null}
    </group>
  );
}
