"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { Flipper, HeldProps } from "@/components/world/muse-kit";
import { MuseSprite } from "@/components/world/muse-sprite";
import { NameTag } from "@/components/world/name-tag";
import { usePerf } from "@/components/world/perf-context";
import { damp } from "@/lib/world/camera";
import { GROK_ORB_POS } from "@/lib/world/layout";
import { museHugsGrok } from "@/lib/world/species";
import type { MuseActivity, MuseId, MuseState } from "@/types/world";
import { assertNever } from "@/types/world";

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
    case "SCROLLING":
    case "CHILLING":
    case "WATCHING":
    case "TRADING":
    case "RESEARCHING":
    case "SMOKING":
    case "IDLE":
    case "THINKING":
      return true;
    case "WALKING":
    case "TALKING":
    case "REACTING":
      return false;
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
  const breathe = Math.sin(t * 1.7 + phase);
  const shift = Math.sin(t * 0.76 + phase * 0.8);
  const look = Math.sin(t * 0.43 + phase * 1.25);
  const seated = sits(activity);
  const motion: Motion = {
    offset: [shift * 0.03, (seated ? -0.08 : 0) + 0.02 * breathe, look * 0.012],
    facing: look * 0.14,
    sway: [0.04 * shift + (seated ? 0.08 : 0), 0.06 * look, 0.05 * shift],
    torso: [1 + breathe * 0.02, 1 + breathe * 0.035, 1 + breathe * 0.02],
    head: [0.04 * breathe, 0.12 * look, 0.03 * shift],
    leftArm: [0.16 * breathe, 0.05 * look, 0.28 + 0.08 * shift],
    rightArm: [0.16 * breathe, -0.05 * look, -0.28 - 0.08 * shift],
  };

  switch (activity) {
    case "IDLE":
      break;
    case "SCROLLING": {
      const flick = Math.sin(t * 8.6 + phase);
      motion.head = [0.22 + flick * 0.04, 0.16, 0.04];
      motion.rightArm = [-0.55, -0.18, -0.1];
      motion.leftArm = [-0.85, 0.35, 0.72];
      motion.sway = [0.08 + 0.03 * shift, 0.06 * look, flick * 0.04];
      break;
    }
    case "WALKING": {
      const step = t * 4.8 + phase;
      motion.offset[1] += Math.abs(Math.sin(step)) * 0.05;
      motion.sway = [0.08, Math.sin(step) * 0.16, Math.sin(step) * 0.12];
      motion.leftArm = [Math.sin(step) * 0.7, 0, 0.28];
      motion.rightArm = [Math.sin(step + Math.PI) * 0.7, 0, -0.28];
      motion.head = [0.08, Math.sin(step) * 0.1, Math.sin(step) * 0.06];
      break;
    }
    case "SMOKING": {
      const drag = (Math.sin(t * 1.15 + phase) + 1) / 2;
      motion.torso = [1 + drag * 0.04, 1 + drag * 0.07, 1 + drag * 0.04];
      motion.head = [0.1 + drag * 0.03, 0.14, 0.04];
      motion.rightArm = [-0.62, 0.08, -0.3];
      break;
    }
    case "CHILLING":
      motion.sway = [0.16 + 0.03 * shift, 0.1 * look, 0.05 * shift];
      motion.head = [0.12, 0.12 * look, 0.04];
      motion.leftArm = [0.55, 0.2, 0.55];
      motion.rightArm = [0.5, -0.16, -0.5];
      break;
    case "WATCHING":
      motion.sway = [0.1, 0.04 * look, 0.03 * shift];
      motion.head = [0.14, 0.08 * look, 0.02];
      motion.leftArm = [-0.22, 0.08, 0.18];
      motion.rightArm = [-0.18, -0.06, -0.16];
      break;
    case "TRADING": {
      const tap = Math.sin(t * 7.4 + phase);
      motion.sway = [0.1, 0.03, tap * 0.03];
      motion.head = [0.18, 0.05, 0];
      motion.rightArm = [-0.5 + tap * 0.12, -0.12, -0.08];
      motion.leftArm = [-0.32, 0.1, 0.16];
      break;
    }
    case "RESEARCHING": {
      const jot = Math.sin(t * 3.5 + phase);
      motion.head = [0.22 + jot * 0.03, -0.12, 0.03];
      motion.leftArm = [-0.5, 0.28, 0.22];
      motion.rightArm = [-0.14, -0.08, -0.22];
      break;
    }
    case "THINKING":
      motion.head = [0.1, 0.06, 0.18 + 0.03 * shift];
      motion.leftArm = [-0.7, 0.32, 0.46];
      motion.rightArm = [0.14, -0.08, -0.16];
      break;
    case "TALKING":
      motion.head = [0.08 + Math.sin(t * 5.8 + phase) * 0.1, 0.1 * look, 0];
      motion.leftArm = [0.22, 0.14, 0.46];
      motion.rightArm = [-0.26, -0.14, -0.36];
      break;
    case "REACTING": {
      const hop = Math.abs(Math.sin(t * 8 + phase));
      motion.offset[1] += hop * 0.08;
      motion.torso = [1 + hop * 0.04, 1 + hop * 0.06, 1 + hop * 0.04];
      motion.head = [-0.08, 0.14 * look, 0];
      motion.leftArm = [-1.05, 0.18, 0.55];
      motion.rightArm = [-1.0, -0.18, -0.55];
      break;
    }
    default:
      return assertNever(activity);
  }

  if (hugging) {
    motion.head = [0.22, 0.08, 0];
    motion.leftArm = [-0.95, 0.28, 0.42];
    motion.rightArm = [-0.92, -0.26, -0.4];
    motion.sway = [0.18, 0.04, 0.02];
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

function faceGrok(from: readonly [number, number, number]): number {
  return Math.atan2(GROK_ORB_POS[0] - from[0], GROK_ORB_POS[2] - from[2]);
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
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const phase = phaseFor(muse.id);
  const { pauseExtras, shadows } = usePerf();
  const hugging = huggingProp ?? museHugsGrok(muse, null);
  const seated = sits(muse.activity);

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
    const yaw = hugging ? faceGrok(muse.position) : muse.facing + motion.facing;
    root.current.rotation.y = yaw;
    dampRot(sway.current, motion.sway, 5.5, delta);
    dampScale(torso.current, motion.torso, 4.2, delta);
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
      userData={{ species: "muse", costume: muse.id }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <mesh visible={false} position={[0, 0.46, 0]}>
        <capsuleGeometry args={[0.28, 0.46, 6, 10]} />
      </mesh>
      <group ref={sway}>
        <group ref={torso}>
          <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadows}>
            <circleGeometry args={[0.22, 16]} />
            <meshStandardMaterial color="#1a1612" transparent opacity={0.18} />
          </mesh>
          <MuseSprite id={muse.id} seated={seated} hugging={hugging} />
          <HeldProps id={muse.id} activity={muse.activity} />
          <group ref={leftArm} position={[-0.28, 0.46, 0.06]}>
            <Flipper side="left" />
          </group>
          <group ref={rightArm} position={[0.28, 0.46, 0.06]}>
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
