"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { loftPickHandlers } from "@/components/world/loft-cursor";
import { MusePlushCard } from "@/components/world/muse-plush";
import { NameTag } from "@/components/world/name-tag";
import { usePerf } from "@/components/world/perf-context";
import { damp } from "@/lib/world/camera";
import type { MuseActivity, MuseId, MuseState } from "@/types/world";
import { assertNever } from "@/types/world";

const PAPER = "#ead9c0";
const LEATHER = "#5c4a3e";
const WOOD = "#4a3426";
const LAPTOP = "#3a3d42";
const SCREEN = "#10151c";
const INK = "#1a1d33";

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

function holdsLaptop(id: MuseId): boolean {
  switch (id) {
    case "scroller":
    case "trader":
      return true;
    case "chill":
    case "builder":
      return false;
    default:
      return assertNever(id);
  }
}

function isSeated(activity: MuseActivity): boolean {
  switch (activity) {
    case "CHILLING":
    case "SMOKING":
    case "WATCHING":
    case "TRADING":
    case "SCROLLING":
    case "RESEARCHING":
    case "IDLE":
      return true;
    case "WALKING":
    case "THINKING":
    case "TALKING":
    case "REACTING":
      return false;
    default:
      return assertNever(activity);
  }
}

function MuseMark({
  position,
  scale = 1,
  color = INK,
}: {
  position?: [number, number, number];
  scale?: number;
  color?: string;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[-0.02, 0, 0]}>
        <torusGeometry args={[0.02, 0.008, 8, 18]} />
        <meshStandardMaterial color={color} roughness={0.32} metalness={0.08} />
      </mesh>
      <mesh position={[0.02, 0, 0]}>
        <torusGeometry args={[0.02, 0.008, 8, 18]} />
        <meshStandardMaterial color={color} roughness={0.32} metalness={0.08} />
      </mesh>
    </group>
  );
}

function Laptop() {
  return (
    <group rotation={[-0.38, 0, 0]}>
      <mesh>
        <boxGeometry args={[0.46, 0.016, 0.3]} />
        <meshStandardMaterial color={LAPTOP} metalness={0.45} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.16, -0.13]} rotation={[1.08, 0, 0]}>
        <boxGeometry args={[0.46, 0.28, 0.012]} />
        <meshStandardMaterial color={LAPTOP} metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.168, -0.12]} rotation={[1.08, 0, 0]}>
        <planeGeometry args={[0.4, 0.23]} />
        <meshStandardMaterial
          color={SCREEN}
          emissive="#7f9aaf"
          emissiveIntensity={0.7}
          roughness={0.18}
        />
      </mesh>
      <group position={[0, 0.012, 0.148]} rotation={[Math.PI / 2, 0, 0]}>
        <MuseMark scale={1.8} color="#e8e4dc" />
      </group>
    </group>
  );
}

function Notes() {
  return (
    <group>
      <mesh rotation={[-0.5, 0.18, 0.06]}>
        <boxGeometry args={[0.3, 0.018, 0.22]} />
        <meshStandardMaterial color={PAPER} roughness={0.86} />
      </mesh>
      <mesh position={[0.02, 0.016, 0.012]} rotation={[-0.46, 0.26, 0.1]}>
        <boxGeometry args={[0.28, 0.016, 0.2]} />
        <meshStandardMaterial color="#f3ead8" roughness={0.84} />
      </mesh>
      <mesh position={[-0.012, 0.032, 0.02]} rotation={[-0.4, 0.1, 0.04]}>
        <boxGeometry args={[0.26, 0.014, 0.18]} />
        <meshStandardMaterial color="#f7f0e2" roughness={0.82} />
      </mesh>
      <mesh position={[0.12, 0.04, 0.03]} rotation={[0.2, 0.3, 0.5]}>
        <cylinderGeometry args={[0.008, 0.008, 0.22, 8]} />
        <meshStandardMaterial color="#c4a46a" roughness={0.55} />
      </mesh>
    </group>
  );
}

function Armchair() {
  const { shadows } = usePerf();
  return (
    <group position={[0, 0, -0.08]}>
      <mesh castShadow={shadows} position={[0, 0.16, 0.02]}>
        <boxGeometry args={[0.88, 0.12, 0.74]} />
        <meshStandardMaterial color={LEATHER} roughness={0.64} />
      </mesh>
      <mesh castShadow={shadows} position={[0, 0.58, -0.32]}>
        <boxGeometry args={[0.88, 0.78, 0.16]} />
        <meshStandardMaterial color={LEATHER} roughness={0.6} />
      </mesh>
      <mesh castShadow={shadows} position={[-0.42, 0.32, 0.04]}>
        <boxGeometry args={[0.12, 0.26, 0.62]} />
        <meshStandardMaterial color="#6a5648" roughness={0.66} />
      </mesh>
      <mesh castShadow={shadows} position={[0.42, 0.32, 0.04]}>
        <boxGeometry args={[0.12, 0.26, 0.62]} />
        <meshStandardMaterial color="#6a5648" roughness={0.66} />
      </mesh>
      {([-0.34, 0.34] as const).map((x) =>
        ([-0.24, 0.24] as const).map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.06, z]}>
            <boxGeometry args={[0.07, 0.12, 0.07]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
        )),
      )}
    </group>
  );
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
        <meshBasicMaterial color="#efe6d6" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={b} visible={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial color="#efe6d6" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={c} visible={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial color="#efe6d6" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

type Motion = {
  offset: [number, number, number];
  facing: number;
  sway: [number, number, number];
  torso: [number, number, number];
};

function motionFor(activity: MuseActivity, t: number, phase: number): Motion {
  const breathe = Math.sin(t * 1.65 + phase);
  const shift = Math.sin(t * 0.74 + phase * 0.8);
  const look = Math.sin(t * 0.41 + phase * 1.25);
  const motion: Motion = {
    offset: [shift * 0.03, 0.018 * breathe, look * 0.014],
    facing: look * 0.16,
    sway: [0.035 * shift, 0.055 * look, 0.05 * shift],
    torso: [1 + breathe * 0.02, 1 + breathe * 0.034, 1 + breathe * 0.02],
  };

  switch (activity) {
    case "IDLE":
      break;
    case "SCROLLING": {
      const flick = Math.sin(t * 8.4 + phase);
      motion.sway = [0.08 + 0.03 * shift, 0.06 * look, flick * 0.03];
      motion.offset[1] += Math.abs(flick) * 0.004;
      break;
    }
    case "WALKING": {
      const step = t * 4.6 + phase;
      const lift = Math.abs(Math.sin(step));
      motion.offset[1] += lift * 0.04;
      motion.sway = [0.08, Math.sin(step) * 0.14, Math.sin(step) * 0.11];
      break;
    }
    case "SMOKING":
    case "CHILLING":
      motion.sway = [0.16 + 0.03 * shift, 0.1 * look, 0.06 * shift];
      break;
    case "WATCHING":
      motion.sway = [0.12, 0.04 * look, 0.03 * shift];
      break;
    case "TRADING": {
      const tap = Math.sin(t * 7.2 + phase);
      motion.sway = [0.14, 0.03, tap * 0.025];
      break;
    }
    case "RESEARCHING":
      motion.sway = [0.08, -0.06, 0.04 * shift];
      break;
    case "THINKING":
      motion.sway = [0.06, 0.05 * look, 0.04 * shift];
      break;
    case "TALKING":
      motion.sway = [0.05, 0.08 * look, 0.03 * shift];
      break;
    case "REACTING": {
      const hop = Math.abs(Math.sin(t * 7.8 + phase));
      motion.offset[1] += hop * 0.07;
      motion.torso = [1 + hop * 0.04, 1 + hop * 0.06, 1 + hop * 0.04];
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
  const ring = useRef<Mesh>(null);
  const phase = phaseFor(muse.id);
  const { pauseExtras } = usePerf();
  const seated = isSeated(muse.activity);
  const laptop = holdsLaptop(muse.id);
  const chair = muse.id === "chill" && seated;

  useFrame((state, delta) => {
    if (!root.current) return;
    const motion = motionFor(
      muse.activity,
      pauseExtras ? 0 : state.clock.elapsedTime,
      phase,
    );
    if (seated) {
      motion.offset[1] -= 0.08;
    }
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
      {...loftPickHandlers(onSelect)}
    >
      <mesh visible={false} position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.28, 0.5, 6, 10]} />
      </mesh>
      {chair ? (
        <group position={[0, -0.62, 0]}>
          <Armchair />
        </group>
      ) : null}
      <group ref={sway}>
        <group ref={torso}>
          <MusePlushCard id={muse.id} />
          {laptop ? (
            <group position={[0, 0.42, 0.42]}>
              <Laptop />
            </group>
          ) : null}
          {muse.id === "builder" ? (
            <group position={[0.02, 0.34, 0.32]} rotation={[0.1, 0.15, 0.04]}>
              <Notes />
            </group>
          ) : null}
        </group>
      </group>
      <NameTag name={muse.name} mark={muse.role} y={1.38} />
      <SmokePuffs active={!pauseExtras && muse.activity === "SMOKING"} />
      {selected ? (
        <mesh ref={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.5, 32]} />
          <meshBasicMaterial color="#e6d3a8" transparent opacity={0.55} />
        </mesh>
      ) : null}
    </group>
  );
}
