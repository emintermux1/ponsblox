"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { damp } from "@/lib/world/camera";
import type { MuseActivity, MuseId, MuseState } from "@/types/world";
import { assertNever } from "@/types/world";

const FUR = "#f3eee4";
const FUR_LIGHT = "#fbf7ef";
const FUR_SHADE = "#e6d9c6";
const EYE = "#1b1914";
const GLOW = "#fffdf6";

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

function Fluff({
  position,
  radius,
  color = FUR,
  scale,
}: {
  position: [number, number, number];
  radius: number;
  color?: string;
  scale?: [number, number, number];
}) {
  return (
    <mesh castShadow position={position} scale={scale}>
      <sphereGeometry args={[radius, 16, 14]} />
      <meshStandardMaterial color={color} roughness={0.92} metalness={0.02} />
    </mesh>
  );
}

function Eyes() {
  return (
    <group>
      <mesh position={[-0.075, 0.03, 0.22]}>
        <sphereGeometry args={[0.032, 10, 10]} />
        <meshStandardMaterial color={EYE} roughness={0.28} />
      </mesh>
      <mesh position={[0.075, 0.03, 0.22]}>
        <sphereGeometry args={[0.032, 10, 10]} />
        <meshStandardMaterial color={EYE} roughness={0.28} />
      </mesh>
      <mesh position={[-0.064, 0.042, 0.245]}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.086, 0.042, 0.245]}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function Headphones() {
  const cup = accent("scroller");
  return (
    <group>
      <mesh position={[0, 0.08, -0.02]} scale={[1, 0.82, 1]}>
        <torusGeometry args={[0.24, 0.018, 8, 22]} />
        <meshStandardMaterial color="#2c261f" roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[-0.24, 0.01, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.09, 0.07, 14]} />
        <meshStandardMaterial color={cup} roughness={0.55} />
      </mesh>
      <mesh position={[0.24, 0.01, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.09, 0.07, 14]} />
        <meshStandardMaterial color={cup} roughness={0.55} />
      </mesh>
    </group>
  );
}

function Cap() {
  return (
    <group>
      <mesh position={[0, 0.2, -0.02]}>
        <cylinderGeometry args={[0.2, 0.22, 0.14, 18]} />
        <meshStandardMaterial color={accent("trader")} roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.13, 0.1]}>
        <cylinderGeometry args={[0.26, 0.26, 0.02, 18]} />
        <meshStandardMaterial color={accent("trader")} roughness={0.42} />
      </mesh>
    </group>
  );
}

function Scarf() {
  const color = accent("chill");
  return (
    <group>
      <mesh position={[0, 0.74, 0.02]} rotation={[0.42, 0.18, 0.08]}>
        <torusGeometry args={[0.2, 0.05, 10, 20]} />
        <meshStandardMaterial color={color} roughness={0.78} />
      </mesh>
      <Fluff position={[0.1, 0.58, 0.16]} radius={0.055} color={color} scale={[1.5, 0.7, 0.55]} />
      <Fluff position={[0.14, 0.46, 0.18]} radius={0.048} color={color} scale={[1.2, 0.9, 0.5]} />
    </group>
  );
}

function Phone() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.1, 0.17, 0.018]} />
        <meshStandardMaterial color="#11110f" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[0.082, 0.14]} />
        <meshStandardMaterial
          color="#1a2430"
          emissive="#3a4d66"
          emissiveIntensity={0.55}
        />
      </mesh>
    </group>
  );
}

function Card() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.17, 0.12, 0.01]} />
        <meshStandardMaterial color={accent("builder")} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0, 0.007]}>
        <planeGeometry args={[0.14, 0.08]} />
        <meshStandardMaterial color="#f4ead4" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Pipe() {
  return (
    <group>
      <mesh rotation={[0.15, 0, Math.PI / 2]} position={[0.05, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
        <meshStandardMaterial color="#d8cfc2" roughness={0.6} />
      </mesh>
      <mesh position={[0.11, 0.01, 0]}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshStandardMaterial color="#c45a28" emissive="#a04018" emissiveIntensity={0.45} />
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
  leftFoot: [number, number, number];
  rightFoot: [number, number, number];
  prop: [number, number, number];
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
    head: [0.05 * breathe, 0.12 * look, 0.035 * shift],
    leftArm: [0.12 * breathe, 0.04 * look, 0.2 + 0.07 * shift],
    rightArm: [0.12 * breathe, -0.04 * look, -0.2 - 0.07 * shift],
    leftFoot: [0, 0, 0],
    rightFoot: [0, 0, 0],
    prop: [0, 0, 0],
  };

  switch (activity) {
    case "IDLE":
      break;
    case "SCROLLING": {
      const flick = Math.sin(t * 8.4 + phase);
      motion.head = [0.34 + flick * 0.05, 0.22, 0.06];
      motion.rightArm = [-0.95, -0.28, -0.18];
      motion.leftArm = [0.18, 0.2, 0.42];
      motion.prop = [flick * 0.42, 0.12, 0.1];
      motion.sway = [0.1 + 0.03 * shift, 0.08 * look, flick * 0.045];
      motion.offset[1] += Math.abs(flick) * 0.006;
      break;
    }
    case "WALKING": {
      const step = t * 4.6 + phase;
      const lift = Math.abs(Math.sin(step));
      motion.offset[1] += lift * 0.04;
      motion.sway = [0.08, Math.sin(step) * 0.14, Math.sin(step) * 0.11];
      motion.leftArm = [Math.sin(step) * 0.58, 0, 0.22];
      motion.rightArm = [Math.sin(step + Math.PI) * 0.58, 0, -0.22];
      motion.leftFoot = [0, Math.max(0, Math.sin(step)) * 0.05, Math.sin(step) * 0.1];
      motion.rightFoot = [
        0,
        Math.max(0, Math.sin(step + Math.PI)) * 0.05,
        Math.sin(step + Math.PI) * 0.1,
      ];
      motion.head = [0.06, Math.sin(step) * 0.08, Math.sin(step) * 0.05];
      break;
    }
    case "SMOKING": {
      const drag = (Math.sin(t * 1.15 + phase) + 1) / 2;
      motion.torso = [1 + drag * 0.045, 1 + drag * 0.08, 1 + drag * 0.045];
      motion.head = [0.1 + drag * 0.04, 0.18, 0.05];
      motion.rightArm = [-0.82, 0.12, -0.42];
      motion.prop = [0.15, 0.35, 0.1];
      motion.sway = [0.12 + 0.02 * shift, 0.08 * look, 0.04 * shift];
      break;
    }
    case "CHILLING":
      motion.sway = [0.16 + 0.03 * shift, 0.1 * look, 0.06 * shift];
      motion.head = [0.16, 0.14 * look, 0.05];
      motion.leftArm = [0.25, 0.1, 0.35];
      motion.rightArm = [0.2, -0.08, -0.28];
      break;
    case "WATCHING":
      motion.sway = [0.14, 0.04 * look, 0.03 * shift];
      motion.head = [0.18, 0.08 * look, 0.02];
      motion.leftArm = [-0.35, 0.1, 0.25];
      motion.rightArm = [-0.28, -0.08, -0.22];
      break;
    case "TRADING": {
      const tap = Math.sin(t * 7.2 + phase);
      motion.sway = [0.16, 0.03, tap * 0.03];
      motion.head = [0.22, 0.06, 0];
      motion.rightArm = [-0.7 + tap * 0.12, -0.15, -0.12];
      motion.leftArm = [-0.45, 0.12, 0.2];
      break;
    }
    case "RESEARCHING": {
      const jot = Math.sin(t * 3.4 + phase);
      motion.head = [0.28 + jot * 0.04, -0.16, 0.04];
      motion.leftArm = [-0.75, 0.35, 0.28];
      motion.rightArm = [-0.2, -0.12, -0.32];
      motion.prop = [jot * 0.2, 0.08, 0.12];
      motion.sway = [0.08, -0.06, 0.04 * shift];
      break;
    }
    case "THINKING":
      motion.head = [0.12, 0.08, 0.2 + 0.04 * shift];
      motion.leftArm = [-0.95, 0.42, 0.55];
      motion.rightArm = [0.15, -0.1, -0.22];
      break;
    case "TALKING":
      motion.head = [0.08 + Math.sin(t * 5.6 + phase) * 0.1, 0.1 * look, 0];
      motion.leftArm = [0.2, 0.15, 0.45];
      motion.rightArm = [-0.35, -0.2, -0.4];
      break;
    case "REACTING": {
      const hop = Math.abs(Math.sin(t * 7.8 + phase));
      motion.offset[1] += hop * 0.07;
      motion.torso = [1 + hop * 0.04, 1 + hop * 0.06, 1 + hop * 0.04];
      motion.head = [-0.08, 0.16 * look, 0];
      motion.leftArm = [-1.1, 0.2, 0.55];
      motion.rightArm = [-1.05, -0.2, -0.55];
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

function dampPos(group: Group | null, pos: [number, number, number], lambda: number, dt: number) {
  if (!group) return;
  group.position.x = damp(group.position.x, pos[0], lambda, dt);
  group.position.y = damp(group.position.y, pos[1], lambda, dt);
  group.position.z = damp(group.position.z, pos[2], lambda, dt);
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

function HeadGear({ id }: { id: MuseId }) {
  switch (id) {
    case "scroller":
      return <Headphones />;
    case "trader":
      return <Cap />;
    case "chill":
    case "builder":
      return null;
    default:
      return assertNever(id);
  }
}

function LeftHandProp({ id }: { id: MuseId }) {
  switch (id) {
    case "builder":
      return <Card />;
    case "scroller":
    case "trader":
    case "chill":
      return null;
    default:
      return assertNever(id);
  }
}

function RightHandProp({ id }: { id: MuseId }) {
  switch (id) {
    case "scroller":
      return <Phone />;
    case "chill":
      return <Pipe />;
    case "trader":
    case "builder":
      return null;
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
  const root = useRef<Group>(null);
  const sway = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftFoot = useRef<Group>(null);
  const rightFoot = useRef<Group>(null);
  const leftProp = useRef<Group>(null);
  const rightProp = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const phase = phaseFor(muse.id);

  useFrame((state, delta) => {
    if (!root.current) return;
    const motion = motionFor(muse.activity, state.clock.elapsedTime, phase);
    root.current.position.set(
      muse.position[0] + motion.offset[0],
      muse.position[1] + motion.offset[1],
      muse.position[2] + motion.offset[2],
    );
    root.current.rotation.y = muse.facing + motion.facing;
    dampRot(sway.current, motion.sway, 5.5, delta);
    dampScale(torso.current, motion.torso, 4.2, delta);
    dampRot(head.current, motion.head, 6.2, delta);
    dampRot(leftArm.current, motion.leftArm, 6.8, delta);
    dampRot(rightArm.current, motion.rightArm, 6.8, delta);
    dampPos(leftFoot.current, motion.leftFoot, 8, delta);
    dampPos(rightFoot.current, motion.rightFoot, 8, delta);
    dampRot(leftProp.current, motion.prop, 7.5, delta);
    dampRot(rightProp.current, motion.prop, 7.5, delta);
    if (ring.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.1) * 0.06;
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
          <Fluff position={[0, 0.4, 0.03]} radius={0.34} scale={[1.05, 0.95, 0.92]} />
          <Fluff position={[0, 0.58, 0]} radius={0.27} color={FUR_LIGHT} />
          <Fluff position={[-0.22, 0.46, 0]} radius={0.15} color={FUR_SHADE} />
          <Fluff position={[0.22, 0.46, 0]} radius={0.15} color={FUR_SHADE} />
          <Fluff position={[0, 0.38, 0.2]} radius={0.16} color={FUR_LIGHT} scale={[1.15, 0.85, 0.7]} />
          {muse.id === "chill" ? <Scarf /> : null}
          <group ref={head} position={[0, 0.9, 0.02]}>
            <Fluff position={[0, 0, 0]} radius={0.27} color={FUR_LIGHT} />
            <Fluff position={[-0.16, -0.04, 0.12]} radius={0.1} />
            <Fluff position={[0.16, -0.04, 0.12]} radius={0.1} />
            <Fluff position={[-0.16, 0.18, -0.02]} radius={0.08} color={FUR_SHADE} />
            <Fluff position={[0.16, 0.18, -0.02]} radius={0.08} color={FUR_SHADE} />
            <Eyes />
            <mesh position={[0, -0.04, 0.24]} scale={[0.7, 0.35, 0.4]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshStandardMaterial color="#c9b8a2" roughness={0.7} />
            </mesh>
            <HeadGear id={muse.id} />
          </group>
          <group ref={leftArm} position={[-0.28, 0.58, 0.02]}>
            <Fluff position={[0, 0, 0]} radius={0.09} color={FUR_SHADE} />
            <Fluff position={[-0.05, -0.14, 0.04]} radius={0.075} />
            <group ref={leftProp} position={[-0.07, -0.24, 0.08]}>
              <LeftHandProp id={muse.id} />
            </group>
          </group>
          <group ref={rightArm} position={[0.28, 0.58, 0.02]}>
            <Fluff position={[0, 0, 0]} radius={0.09} color={FUR_SHADE} />
            <Fluff position={[0.05, -0.14, 0.04]} radius={0.075} />
            <group ref={rightProp} position={[0.08, -0.24, 0.08]}>
              <RightHandProp id={muse.id} />
            </group>
          </group>
        </group>
        <group position={[-0.12, 0.08, 0.04]}>
          <group ref={leftFoot}>
            <Fluff position={[0, 0, 0]} radius={0.09} color={FUR_SHADE} scale={[1.15, 0.7, 1.25]} />
          </group>
        </group>
        <group position={[0.12, 0.08, 0.04]}>
          <group ref={rightFoot}>
            <Fluff position={[0, 0, 0]} radius={0.09} color={FUR_SHADE} scale={[1.15, 0.7, 1.25]} />
          </group>
        </group>
      </group>
      <SmokePuffs active={muse.activity === "SMOKING"} />
      {selected ? (
        <mesh ref={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.48, 32]} />
          <meshBasicMaterial color="#e6d3a8" transparent opacity={0.55} />
        </mesh>
      ) : null}
    </group>
  );
}
